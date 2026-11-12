import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, ApiError, type PostComment } from '../../lib/api'
import { useI18n } from '../../store/i18n'

type CommentRange = { start: number; end: number }

export type SortMode = 'recent' | 'likes'

type AnchorJob = { id: string; index: number }

/** 一级评论每页条数，与后端默认值保持一致 */
export const PAGE_SIZE = 20

/** 首屏只等第一页，空闲时后台往后预取的页数 */
const PREFETCH_PAGES = 2

/** 从按页缓存里取第 index 条一级评论 */
export function itemAt(pages: Map<number, PostComment[]>, index: number) {
  const page = pages.get(Math.floor(index / PAGE_SIZE))
  return page?.[index % PAGE_SIZE]
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

/**
 * 一级评论的按页缓存与请求编排：首屏 / 排序切换加载、视口附近分页、空闲预取、
 * 30 秒轮询，以及点赞 / 展开楼中楼后的局部更新。
 */
export function useCommentFeed({
  slug,
  sort,
  rangeRef,
  signedIn,
  onRequireLogin,
  onNotice,
  onAnchor
}: {
  slug: string
  sort: SortMode
  rangeRef: { current: CommentRange }
  signedIn: boolean
  onRequireLogin: () => void
  onNotice: (message: string) => void
  onAnchor: (job: AnchorJob) => void
}) {
  const location = useLocation()
  const { t } = useI18n()
  /* 一级评论按页缓存：只加载视口附近的页，离开视野后 DOM 会被卸载 */
  const [pages, setPages] = useState<Map<number, PostComment[]>>(new Map())
  const [rootTotal, setRootTotal] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandingId, setExpandingId] = useState<string | null>(null)
  const pagesRef = useRef(pages)
  const fetching = useRef(new Set<number>())
  /* 切换排序 / 文章时自增，丢弃旧请求的结果 */
  const generation = useRef(0)
  /* 记录最近一次用于定位的锚点，避免地址栏锚点被清掉后又重复请求 */
  const lastAnchor = useRef<string | null>(null)

  pagesRef.current = pages

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
    setPages(new Map())
    setRootTotal(0)
    setTotal(0)
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
          if (offset >= 0) onAnchor({ id: anchor, index: result.page * PAGE_SIZE + offset })
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
        if (offset >= 0) onAnchor({ id: match[1], index: result.page * PAGE_SIZE + offset })
      })
      .catch(() => {})
  }, [location.hash, slug, sort, onAnchor])

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

  /** 发布 / 删除后重拉当前窗口这一页，并丢掉其余缓存 */
  const reloadWindow = useCallback(async () => {
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
  }, [slug, sort])

  /** 楼中楼：第一次点开用整页替换 3 条预览，之后就是继续追加 */
  const loadReplies = useCallback(
    async (comment: PostComment) => {
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
        onNotice(t('加载失败，请稍后再试。', 'Could not load more. Please try again.'))
      } finally {
        setExpandingId(null)
      }
    },
    [expandingId, sort, onNotice, t]
  )

  const toggleLike = useCallback(
    async (comment: PostComment) => {
      if (!signedIn) {
        onRequireLogin()
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
        onNotice(
          err instanceof ApiError
            ? err.message
            : t('点赞失败，请稍后再试。', 'Could not like. Please try again.')
        )
      }
    },
    [signedIn, onRequireLogin, onNotice, t]
  )

  return {
    pages,
    rootTotal,
    total,
    loading,
    error,
    ensurePage,
    reloadWindow,
    loadReplies,
    toggleLike,
    expandingId
  }
}
