import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError, type PostComment } from '../lib/api'
import { findBannedWord } from '../data/moderation'
import { useAuth } from '../store/auth'
import { getLang, useI18n } from '../store/i18n'
import { getLenis, scrollTo } from '../composables/useSmoothScroll'
import '../styles/components/Comments.css'

function formatTime(iso: string) {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const en = getLang() === 'en'
  const diff = Date.now() - time
  if (diff < 60_000) return en ? 'just now' : '刚刚'
  if (diff < 3_600_000) {
    const value = Math.floor(diff / 60_000)
    return en ? `${value} min ago` : `${value} 分钟前`
  }
  if (diff < 86_400_000) {
    const value = Math.floor(diff / 3_600_000)
    return en ? `${value} hr ago` : `${value} 小时前`
  }
  if (diff < 2_592_000_000) {
    const value = Math.floor(diff / 86_400_000)
    return en ? `${value} d ago` : `${value} 天前`
  }
  return new Date(time).toLocaleDateString(en ? 'en-GB' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/** 根据昵称取一个稳定的头像色调，让每条评论有轻微差别 */
function avatarTone(name: string) {
  let sum = 0
  for (const char of name) sum += char.codePointAt(0) ?? 0
  return sum % 3
}

/** 在评论树里定位一条评论并替换，用于点赞、展开楼中楼后的局部更新 */
function mapComment(
  items: PostComment[],
  id: string,
  updater: (comment: PostComment) => PostComment
): PostComment[] {
  return items.map((comment) => {
    const next = comment.id === id ? updater(comment) : comment
    if (!next.replies.length) return next
    return { ...next, replies: mapComment(next.replies, id, updater) }
  })
}

function toggleLikeState(comment: PostComment): PostComment {
  return {
    ...comment,
    likedByMe: !comment.likedByMe,
    likeCount: Math.max(0, comment.likeCount + (comment.likedByMe ? -1 : 1))
  }
}

function excerpt(text: string, max = 80) {
  return text.length <= max ? text : `${text.slice(0, max - 2)}…`
}

type SortMode = 'recent' | 'likes'

/** 一级评论每页条数，与后端默认值保持一致 */
const PAGE_SIZE = 20

/** 还没测量过高度的评论先按这个值占位，渲染出来后会换成真实高度 */
const ROW_ESTIMATE = 220

/** 视口上下各多渲染 0.75 屏，滚动时不会露出空白，也不至于挂太多 DOM */
const OVERSCAN_RATIO = 0.75

/** 首屏只等第一页，空闲时后台往后预取的页数 */
const PREFETCH_PAGES = 2

/** 从按页缓存里取第 index 条一级评论 */
function itemAt(pages: Map<number, PostComment[]>, index: number) {
  const page = pages.get(Math.floor(index / PAGE_SIZE))
  return page?.[index % PAGE_SIZE]
}

/** 在有序的偏移数组里找 value 落在哪一条评论上 */
function locate(offsets: number[], value: number, total: number) {
  let low = 0
  let high = total
  while (low < high) {
    const mid = (low + high) >> 1
    if (offsets[mid + 1] <= value) low = mid + 1
    else high = mid
  }
  return Math.min(low, Math.max(0, total - 1))
}

/** 在整页缓存里定位一条评论并替换，没命中就原样返回 */
function updateInPages(
  pages: Map<number, PostComment[]>,
  id: string,
  updater: (comment: PostComment) => PostComment
) {
  const next = new Map(pages)
  let changed = false
  for (const [page, items] of pages) {
    const hit = items.some(
      (comment) => comment.id === id || comment.replies.some((reply) => reply.id === id)
    )
    if (!hit) continue
    next.set(page, mapComment(items, id, updater))
    changed = true
  }
  return changed ? next : pages
}

/** 只负责测量自身高度并回报，切换排序或滚动时随窗口一起挂载 / 卸载 */
function CommentRow({
  commentId,
  onMeasure,
  children
}: {
  commentId: string
  onMeasure: (id: string, height: number) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const report = () => onMeasure(commentId, node.getBoundingClientRect().height)
    const observer = new ResizeObserver(report)
    observer.observe(node)
    report()
    return () => observer.disconnect()
  }, [commentId, onMeasure])

  return (
    <div className="comment-row" ref={ref} data-comment-id={commentId}>
      {children}
    </div>
  )
}

export default function CommentSection({ slug }: { slug: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  /* 一级评论按页缓存：只加载视口附近的页，离开视野后 DOM 会被卸载 */
  const [pages, setPages] = useState<Map<number, PostComment[]>>(new Map())
  const [rootTotal, setRootTotal] = useState(0)
  const [total, setTotal] = useState(0)
  const [range, setRange] = useState({ start: 0, end: PAGE_SIZE - 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<PostComment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [deleteTarget, setDeleteTarget] = useState<PostComment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandingId, setExpandingId] = useState<string | null>(null)
  /* 高度测量完成后自增，用来重算各条评论的偏移量 */
  const [measureRev, setMeasureRev] = useState(0)
  /* 深链定位任务：等目标行渲染出来再高亮 */
  const [anchorJob, setAnchorJob] = useState<{ id: string; index: number } | null>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const heights = useRef(new Map<string, number>())
  const offsetsRef = useRef<number[]>([0])
  const pagesRef = useRef(pages)
  const rangeRef = useRef(range)
  const fetching = useRef(new Set<number>())
  /* 切换排序 / 文章时自增，丢弃旧请求的结果 */
  const generation = useRef(0)
  const measureFrame = useRef(0)
  /* 记录最近一次用于定位的锚点，避免地址栏锚点被清掉后又重复请求 */
  const lastAnchor = useRef<string | null>(null)

  pagesRef.current = pages
  rangeRef.current = range

  /* 一行的高度变了就重算偏移，同一帧内的多次测量合并成一次渲染 */
  const handleMeasure = useCallback((id: string, height: number) => {
    if (!height) return
    const prev = heights.current.get(id)
    if (prev !== undefined && Math.abs(prev - height) < 1) return
    heights.current.set(id, height)
    if (measureFrame.current) return
    measureFrame.current = requestAnimationFrame(() => {
      measureFrame.current = 0
      setMeasureRev((value) => value + 1)
    })
  }, [])

  /* 每条一级评论的上下偏移：测量过的用真实高度，没测量过的用估算值 */
  const offsets = useMemo(() => {
    const list = new Array<number>(rootTotal + 1)
    list[0] = 0
    for (let index = 0; index < rootTotal; index += 1) {
      const comment = itemAt(pages, index)
      const measured = comment ? heights.current.get(comment.id) : undefined
      list[index + 1] = list[index] + (measured ?? ROW_ESTIMATE)
    }
    return list
    // measureRev 变化代表高度变了，需要重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, rootTotal, measureRev])

  offsetsRef.current = offsets

  /** 确保某一页在缓存里；失败不标记，下次滚动会重试 */
  const ensurePage = useCallback(
    async (page: number) => {
      if (page < 0) return
      if (pagesRef.current.has(page) || fetching.current.has(page)) return
      if (rootTotal && page * PAGE_SIZE >= rootTotal) return
      const gen = generation.current
      fetching.current.add(page)
      try {
        const result = await api.comments(slug, sort, page, PAGE_SIZE)
        if (gen !== generation.current) return
        setPages((previous) => new Map(previous).set(result.page, result.items))
        setRootTotal(result.rootTotal)
        setTotal(result.total)
      } catch {
        /* 交给后续滚动或切回标签页时重试 */
      } finally {
        fetching.current.delete(page)
      }
    },
    [slug, sort, rootTotal]
  )

  /* 首屏 / 切换排序：清空缓存，只取第一页（深链时取目标所在页） */
  useEffect(() => {
    let alive = true
    const gen = ++generation.current
    fetching.current.clear()
    heights.current.clear()
    setPages(new Map())
    setRootTotal(0)
    setTotal(0)
    setRange({ start: 0, end: PAGE_SIZE - 1 })
    setLoading(true)
    setError('')
    const match = /^#comment-(.+)$/.exec(location.hash)
    const anchor = match ? match[1] : undefined
    lastAnchor.current = anchor ?? null
    api
      .comments(slug, sort, 0, PAGE_SIZE, anchor)
      .then((result) => {
        if (!alive || gen !== generation.current) return
        setPages(new Map([[result.page, result.items]]))
        setRootTotal(result.rootTotal)
        setTotal(result.total)
        if (anchor) {
          const offset = result.items.findIndex(
            (comment) => comment.id === anchor || comment.replies.some((reply) => reply.id === anchor)
          )
          if (offset >= 0) setAnchorJob({ id: anchor, index: result.page * PAGE_SIZE + offset })
        }
      })
      .catch(() => {
        if (alive && gen === generation.current) {
          setError(t('评论加载失败，请稍后再试。', 'Could not load comments. Please try again later.'))
        }
      })
      .finally(() => {
        if (alive && gen === generation.current) setLoading(false)
      })
    return () => {
      alive = false
      generation.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sort])

  /* 滚动时按视口算出要渲染的区间，只有这一段评论会挂到 DOM 上 */
  useEffect(() => {
    if (!rootTotal) return
    let frame = 0
    const update = () => {
      frame = 0
      const box = listRef.current
      const list = offsetsRef.current
      if (!box || list.length < 2) return
      const rect = box.getBoundingClientRect()
      const viewTop = -rect.top
      const pad = window.innerHeight * OVERSCAN_RATIO
      const start = locate(list, viewTop - pad, rootTotal)
      const end = locate(list, viewTop + window.innerHeight + pad, rootTotal)
      setRange((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end }
      )
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootTotal, offsets])

  /* 把视口附近的页准备好，页没到之前先显示等高占位 */
  useEffect(() => {
    if (!rootTotal) return
    const from = Math.max(0, range.start - PAGE_SIZE)
    const to = Math.min(rootTotal - 1, range.end + PAGE_SIZE)
    const firstPage = Math.floor(from / PAGE_SIZE)
    const lastPage = Math.floor(to / PAGE_SIZE)
    for (let page = firstPage; page <= lastPage; page += 1) {
      void ensurePage(page)
    }
  }, [range, pages, rootTotal, ensurePage])

  /* 首屏只等 20 条；空闲时在后台把后面两页预取进缓存，滚动时不用等网络 */
  useEffect(() => {
    if (loading || rootTotal <= PAGE_SIZE) return
    const gen = generation.current
    const timer = window.setTimeout(() => {
      if (gen !== generation.current) return
      const start = Math.floor(rangeRef.current.end / PAGE_SIZE) + 1
      for (let page = start; page < start + PREFETCH_PAGES; page += 1) {
        if (page * PAGE_SIZE >= rootTotal) break
        void ensurePage(page)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [loading, rootTotal, ensurePage])

  /* 已经在页面上时再点一条通知：目标不在缓存里，就取它所在页并定位 */
  useEffect(() => {
    const match = /^#comment-(.+)$/.exec(location.hash)
    if (!match) return
    if (lastAnchor.current === match[1]) return
    if (document.getElementById(`comment-${match[1]}`)) return
    lastAnchor.current = match[1]
    const gen = generation.current
    api
      .comments(slug, sort, 0, PAGE_SIZE, match[1])
      .then((result) => {
        if (gen !== generation.current) return
        setPages((previous) => new Map(previous).set(result.page, result.items))
        setRootTotal(result.rootTotal)
        setTotal(result.total)
        const offset = result.items.findIndex(
          (comment) =>
            comment.id === match[1] || comment.replies.some((reply) => reply.id === match[1])
        )
        if (offset >= 0) setAnchorJob({ id: match[1], index: result.page * PAGE_SIZE + offset })
      })
      .catch(() => {})
  }, [location.hash, slug, sort])

  /* 别人删了评论后，停在页面上的人不刷新也能同步：切回标签页时静默拉一次，可见期间每 30 秒一次 */
  useEffect(() => {
    let alive = true
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      /* 滚远了就交给按窗口加载，不做整表刷新 */
      if (rangeRef.current.start > PAGE_SIZE) return
      api
        .comments(slug, sort, 0, PAGE_SIZE)
        .then((result) => {
          if (!alive) return
          setPages((previous) => new Map(previous).set(result.page, result.items))
          setRootTotal(result.rootTotal)
          setTotal(result.total)
        })
        .catch(() => {})
    }
    const timer = window.setInterval(sync, 30_000)
    document.addEventListener('visibilitychange', sync)
    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [slug, sort])

  useEffect(() => {
    if (!replyTo) return
    const frame = requestAnimationFrame(() => {
      const box = composer.current
      if (!box) return
      /* preventScroll：交给页面自己的平滑滚动，避免浏览器把视口拽走 */
      box.focus({ preventScroll: true })
      const rect = box.getBoundingClientRect()
      const navH = 88
      /* 输入框已经完整可见时就不要动页面，避免点击回复时页面往上跑 */
      if (rect.top >= navH + 16 && rect.bottom <= window.innerHeight) return
      const top = window.scrollY + rect.top - navH - 28
      scrollTo(Math.max(0, top), { duration: 0.9, force: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [replyTo])

  /* 深链定位：先把目标所在行挂到 DOM，量出真实位置再瞬移过去，最后闪烁提示 */
  useEffect(() => {
    if (!anchorJob) return
    const { id, index } = anchorJob
    let cancelled = false
    let findTimer = 0
    let highlightTimer = 0
    let settleTimer = 0
    let tries = 0
    let interrupted = false

    const interrupt = () => {
      interrupted = true
    }
    window.addEventListener('wheel', interrupt, { passive: true })
    window.addEventListener('touchstart', interrupt, { passive: true })
    window.addEventListener('keydown', interrupt)

    /* 目标附近的评论先挂上，跳转才有真实的落点；远处仍是等高占位 */
    const start = Math.max(0, index - 3)
    const end = Math.min(rootTotal - 1, index + 6)
    setRange((previous) =>
      previous.start === start && previous.end === end ? previous : { start, end }
    )

    const reveal = () => {
      if (cancelled) return
      const target = document.getElementById(`comment-${id}`)
      if (!target) {
        /* 目标行可能还在等所在页返回，最多等 3 秒 */
        if (tries < 60) {
          tries += 1
          findTimer = window.setTimeout(reveal, 50)
        }
        return
      }

      /* 先瞬移到目标附近，再持续校正：视口内那几行的高度会从估算值换成真实值，
         上方的累计高度一直在变，只跳一次会偏出去几百像素 */
      let ticks = 0
      let stable = 0
      const pin = () => {
        if (cancelled) return
        /* 每一拍都重新取节点：滚动窗口变化时这一行可能刚好被卸载重建 */
        const current = document.getElementById(`comment-${id}`)
        if (!current) {
          /* 高度校正把目标挤出渲染窗口后，按估算位置再跳一次把它拉回来 */
          const box = listRef.current
          if (box && !interrupted) {
            const top =
              window.scrollY +
              box.getBoundingClientRect().top +
              (offsetsRef.current[index] ?? 0) -
              window.innerHeight * 0.4
            scrollTo(Math.max(0, top), { immediate: true, force: true })
          }
          if (ticks < 25) {
            ticks += 1
            settleTimer = window.setTimeout(pin, 100)
          }
          return
        }
        current.classList.add('is-target')
        const desired = window.innerHeight * 0.4
        const delta = current.getBoundingClientRect().top - desired
        if (!interrupted && Math.abs(delta) > 16) {
          getLenis()?.resize()
          scrollTo(Math.max(0, window.scrollY + delta), { immediate: true, force: true })
          stable = 0
        } else {
          stable += 1
        }
        ticks += 1
        if (stable < 3 && ticks < 25) settleTimer = window.setTimeout(pin, 100)
      }
      pin()

      highlightTimer = window.setTimeout(() => {
        document.getElementById(`comment-${id}`)?.classList.remove('is-target')
        /* 高亮结束把地址栏锚点抹掉，刷新或再分享时不会重复跳动；replace 不重新加载页面 */
        navigate(`${location.pathname}${location.search}`, { replace: true })
      }, 2500)
    }
    const frame = requestAnimationFrame(reveal)

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      if (findTimer) window.clearTimeout(findTimer)
      if (highlightTimer) window.clearTimeout(highlightTimer)
      if (settleTimer) window.clearTimeout(settleTimer)
      window.removeEventListener('wheel', interrupt)
      window.removeEventListener('touchstart', interrupt)
      window.removeEventListener('keydown', interrupt)
    }
    // rootTotal 只在取到首屏时确定，不需要因为后续同值更新重跑定位
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorJob, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!deleteTarget) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDeleteTarget(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteTarget])

  useEffect(
    () => () => {
      if (measureFrame.current) cancelAnimationFrame(measureFrame.current)
    },
    []
  )

  /** 发布 / 删除后重拉当前窗口这一页，并丢掉其余缓存 */
  async function reloadWindow() {
    const gen = ++generation.current
    fetching.current.clear()
    const page = Math.floor(rangeRef.current.start / PAGE_SIZE)
    try {
      const result = await api.comments(slug, sort, page, PAGE_SIZE)
      if (gen !== generation.current) return
      setPages(new Map([[result.page, result.items]]))
      setRootTotal(result.rootTotal)
      setTotal(result.total)
    } catch {
      /* 失败就保持现状，后续滚动会重新拉 */
    }
  }

  /** 楼中楼：第一次点开用整页替换 3 条预览，之后就是继续追加 */
  async function loadReplies(comment: PostComment) {
    if (expandingId) return
    const expanded = comment.repliesLoaded === true
    setExpandingId(comment.id)
    try {
      const page = expanded ? Math.floor(comment.replies.length / PAGE_SIZE) : 0
      const result = await api.replies(comment.id, sort, page, PAGE_SIZE)
      setPages((previous) =>
        updateInPages(previous, comment.id, (item) => ({
          ...item,
          replies: expanded ? [...item.replies, ...result.items] : result.items,
          replyCount: result.total,
          repliesLoaded: true,
          repliesHasMore: result.hasMore
        }))
      )
    } catch {
      setNotice(t('加载失败，请稍后再试。', 'Could not load more. Please try again.'))
    } finally {
      setExpandingId(null)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!user || submitting) return
    const text = content.trim()
    if (text.length < 2) {
      setNotice(t('多写两个字再发吧。', 'A few more characters, please.'))
      return
    }
    if (findBannedWord(text)) {
      setNotice(
        t('内容里包含不合适的词汇，请修改后再提交。', 'The content contains inappropriate language. Please revise it.')
      )
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      await api.addComment(slug, text, replyTo?.id)
      setContent('')
      setReplyTo(null)
      setNotice(t('评论已发布。', 'Comment posted.'))
      await reloadWindow()
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : t('发布失败，请稍后再试。', 'Could not post. Please try again later.'))
    } finally {
      setSubmitting(false)
    }
  }

  /* Enter 发送，Shift + Enter 换行；中文输入法组字时 Enter 只用于选词 */
  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await api.deleteComment(deleteTarget.id)
      setDeleteTarget(null)
      await reloadWindow()
      setNotice(t('评论已删除。', 'Comment deleted.'))
    } catch (err) {
      setDeleteTarget(null)
      setNotice(err instanceof ApiError ? err.message : t('删除失败，请稍后再试。', 'Could not delete. Please try again later.'))
    } finally {
      setDeleting(false)
    }
  }

  async function toggleLike(comment: PostComment) {
    if (!user) {
      navigate(loginHref)
      return
    }
    if (comment.deleted) return
    setPages((previous) => updateInPages(previous, comment.id, toggleLikeState))
    try {
      const result = await api.likeComment(comment.id)
      setPages((previous) =>
        updateInPages(previous, comment.id, (item) => ({
          ...item,
          likedByMe: result.active,
          likeCount: result.count
        }))
      )
    } catch (err) {
      setPages((previous) => updateInPages(previous, comment.id, toggleLikeState))
      setNotice(err instanceof ApiError ? err.message : t('点赞失败，请稍后再试。', 'Could not like. Please try again.'))
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`
  const count = loading ? '00' : String(total).padStart(2, '0')

  function renderComment(comment: PostComment, isReply = false) {
    const initial = comment.authorName.trim().charAt(0).toUpperCase() || '·'
    return (
      <article
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`comment${isReply ? ' comment--reply' : ''}${comment.mine && !comment.deleted ? ' is-mine' : ''}${
          comment.deleted ? ' is-deleted' : ''
        }`}
      >
        <span
          className={`comment__avatar comment__avatar--${avatarTone(comment.authorName)}`}
          aria-hidden="true"
        >
          {initial}
        </span>

        <div className="comment__main">
          <header className="comment__head">
            <span className="comment__author">{comment.authorName}</span>
            {comment.mine && !comment.deleted ? (
              <span className="comment__badge mono">{t('我', 'me')}</span>
            ) : null}
            <time className="mono" dateTime={comment.createdAt}>
              {formatTime(comment.createdAt)}
            </time>
            {comment.mine && !comment.deleted ? (
              <button type="button" className="comment__action" onClick={() => setDeleteTarget(comment)}>
                {t('删除', 'Delete')}
              </button>
            ) : null}
          </header>

          {comment.replyToName && !comment.deleted ? (
            <div className="comment__quote">
              <span className="comment__quote-name mono">
                {t('回复', 'Reply to')} @{comment.replyToName}
              </span>
              <span className="comment__quote-text">{comment.replyToExcerpt}</span>
            </div>
          ) : null}

          <p className="comment__body">{comment.content}</p>

          {!comment.deleted ? (
            <div className="comment__foot">
              <button
                type="button"
                className="comment__reply"
                onClick={() => setReplyTo(replyTo?.id === comment.id ? null : comment)}
              >
                <span aria-hidden="true">↳</span>
                {replyTo?.id === comment.id ? t('取消回复', 'Cancel reply') : t('回复', 'Reply')}
              </button>
              <button
                type="button"
                className={`comment__like${comment.likedByMe ? ' is-on' : ''}`}
                aria-pressed={comment.likedByMe}
                aria-label={t('点赞', 'Like')}
                onClick={() => toggleLike(comment)}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 13.2S2.4 9.9 2.4 6.4A3 3 0 0 1 8 4.9a3 3 0 0 1 5.6 1.5c0 3.5-5.6 6.8-5.6 6.8Z"
                    fill={comment.likedByMe ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{comment.likeCount > 0 ? comment.likeCount : t('赞', 'Like')}</span>
              </button>
            </div>
          ) : null}

          {comment.replies.length || comment.replyCount > 0 ? (
            <div className="comment__replies">
              {comment.replies.map((reply) => renderComment(reply, true))}
              {comment.replyCount > comment.replies.length ? (
                <button
                  type="button"
                  className="comment__more mono"
                  onClick={() => loadReplies(comment)}
                  disabled={expandingId === comment.id}
                >
                  {expandingId === comment.id
                    ? t('加载中…', 'Loading…')
                    : comment.repliesLoaded
                      ? t('加载更多回复', 'Load more replies')
                      : t(`查看全部 ${comment.replyCount} 条回复`, `View all ${comment.replyCount} replies`)}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    )
  }

  const rows: ReactNode[] = []
  if (!loading && !error && rootTotal > 0) {
    const end = Math.min(range.end, rootTotal - 1)
    for (let index = range.start; index <= end; index += 1) {
      const comment = itemAt(pages, index)
      rows.push(
        comment ? (
          <CommentRow key={comment.id} commentId={comment.id} onMeasure={handleMeasure}>
            {renderComment(comment)}
          </CommentRow>
        ) : (
          <div
            key={`placeholder-${index}`}
            className="comment-row comment-row--placeholder"
            style={{ height: ROW_ESTIMATE }}
            aria-hidden="true"
          >
            <span className="mono">···</span>
          </div>
        )
      )
    }
  }
  const topHeight = offsets[Math.min(range.start, rootTotal)] ?? 0
  const bottomHeight = Math.max(
    0,
    (offsets[rootTotal] ?? 0) - (offsets[Math.min(range.end + 1, rootTotal)] ?? 0)
  )

  return (
    <section className="comments shell" id="comments" aria-label={t('评论区', 'Comments')}>
      <div className="comments__inner">
        <header className="comments__head">
          <div className="comments__intro">
            <span className="eyebrow">Discussion / {t('讨论', 'Discussion')}</span>
            <h2 className="comments__title">
              <span>{t('留下一条', 'Leave a')}</span>
              <em>{t('评论', 'comment')}</em>
              <span className="comments__count mono">{count}</span>
            </h2>
            <p className="comments__lede">
              {t(
                '补充、质疑，或者只是打个招呼。登录后可以评论，也能收到楼中楼回复提醒。',
                'Add context, push back, or just say hello. Sign in to comment and get notified when someone replies.'
              )}
            </p>
          </div>
        </header>

        <div className="comments__composer">
          {user ? (
            <form className="comment-form" onSubmit={submit}>
              <div className="comment-form__head">
                <span className="mono comment-form__label">{t('新评论', 'New comment')}</span>
                {replyTo ? (
                  <button type="button" className="comment-form__replying" onClick={() => setReplyTo(null)}>
                    {t(`回复 @${replyTo.authorName} · 取消`, `Replying to @${replyTo.authorName} · cancel`)}
                  </button>
                ) : (
                  <span className="mono comment-form__as">
                    {t(`以 ${user.displayName} 的身份`, `As ${user.displayName}`)}
                  </span>
                )}
              </div>
              <textarea
                ref={composer}
                className="comment-form__input"
                value={content}
                maxLength={800}
                aria-label={t('评论内容', 'Comment')}
                placeholder={
                  replyTo
                    ? t(`回复 @${replyTo.authorName}…`, `Reply to @${replyTo.authorName}…`)
                    : t('写下你的想法…', 'Write what you think…')
                }
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={onComposerKeyDown}
                rows={5}
              />
              <div className="comment-form__foot">
                <span className="mono comment-form__count">
                  {content.length} / 800
                  <span className="comment-form__hint">
                    {t('Enter 发布 · Shift + Enter 换行', 'Enter to post · Shift + Enter for a new line')}
                  </span>
                </span>
                <button type="submit" className="comment-form__submit" disabled={submitting}>
                  <span>{submitting ? t('发布中…', 'Posting…') : t('发布评论', 'Post comment')}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="comment-gate">
              <span className="mono comment-gate__label">{t('需要登录', 'Members only')}</span>
              <p>
                {t(
                  '评论需要登录。登录后可以回复、收到楼中楼通知。',
                  'Sign in to comment, reply, and receive reply notifications.'
                )}
              </p>
              <Link to={loginHref} className="comment-gate__link" data-cursor="Login">
                {t('去登录', 'Sign in')} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          )}

          {notice ? (
            <p className="mono comments__notice" role="status">
              {notice}
            </p>
          ) : null}
        </div>

        <div className="comments__stream">
          <div className="comments__stream-head">
            <span className="mono">{t('全部评论', 'All comments')}</span>
            <span className="mono comments__stream-count">{count}</span>
            <div className="comments__sort" role="group" aria-label={t('评论排序', 'Sort comments')}>
              <button
                type="button"
                className={sort === 'recent' ? 'is-active' : ''}
                aria-pressed={sort === 'recent'}
                onClick={() => setSort('recent')}
              >
                {t('最近', 'Latest')}
              </button>
              <button
                type="button"
                className={sort === 'likes' ? 'is-active' : ''}
                aria-pressed={sort === 'likes'}
                onClick={() => setSort('likes')}
              >
                {t('最多点赞', 'Top')}
              </button>
            </div>
          </div>

          <div className="comments__list comments__list--virtual" ref={listRef}>
            {loading ? <p className="mono comments__state">{t('正在加载评论…', 'Loading comments…')}</p> : null}
            {!loading && error ? <p className="mono comments__state">{error}</p> : null}
            {!loading && !error && rootTotal === 0 ? (
              <div className="comments__empty">
                <span className="comments__empty-no" aria-hidden="true">
                  00
                </span>
                <p>{t('还没有评论，来写下第一条。', 'No comments yet — write the first one.')}</p>
              </div>
            ) : null}
            {!loading && !error && rootTotal > 0 ? (
              <>
                <div className="comments__spacer" style={{ height: topHeight }} aria-hidden="true" />
                {rows}
                <div className="comments__spacer" style={{ height: bottomHeight }} aria-hidden="true" />
              </>
            ) : null}
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div
          className="comment-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDeleteTarget(null)
          }}
        >
          <div
            className="comment-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-delete-title"
          >
            <span className="mono comment-modal__eyebrow">Delete / {t('删除评论', 'Delete comment')}</span>
            <h3 className="comment-modal__title" id="comment-delete-title">
              {t('确定删除这条评论？', 'Delete this comment?')}
            </h3>
            <p className="comment-modal__body">“{excerpt(deleteTarget.content)}”</p>
            <p className="comment-modal__hint">
              {t('删除后无法恢复，楼中楼回复会保留。', 'This cannot be undone. Replies to it will remain.')}
            </p>
            <div className="comment-modal__actions">
              <button
                type="button"
                className="comment-modal__cancel"
                onClick={() => setDeleteTarget(null)}
                autoFocus
              >
                {t('取消', 'Cancel')}
              </button>
              <button type="button" className="comment-modal__confirm" onClick={confirmDelete} disabled={deleting}>
                {deleting ? t('删除中…', 'Deleting…') : t('删除', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
