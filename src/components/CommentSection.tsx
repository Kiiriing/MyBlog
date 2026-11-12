import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError, type PostComment } from '../lib/api'
import { findBannedWord } from '../data/moderation'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import { getLenis, scrollTo } from '../composables/useSmoothScroll'
import CommentItem, { CommentRow } from './comments/CommentItem'
import { itemAt, PAGE_SIZE, useCommentFeed, type SortMode } from './comments/useCommentFeed'
import { ROW_ESTIMATE, useVirtualComments } from './comments/useVirtualComments'
import '../styles/components/Comments.css'

function excerpt(text: string, max = 80) {
  return text.length <= max ? text : `${text.slice(0, max - 2)}…`
}

export default function CommentSection({ slug }: { slug: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<PostComment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [deleteTarget, setDeleteTarget] = useState<PostComment | null>(null)
  const [deleting, setDeleting] = useState(false)
  /* 深链定位任务：等目标行渲染出来再高亮 */
  const [anchorJob, setAnchorJob] = useState<{ id: string; index: number } | null>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  /* 当前渲染窗口，供分页 / 预取 / 轮询 / 发布后重拉读取最新值 */
  const rangeRef = useRef({ start: 0, end: PAGE_SIZE - 1 })

  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`
  const requireLogin = useCallback(() => navigate(loginHref), [navigate, loginHref])

  const {
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
  } = useCommentFeed({
    slug,
    sort,
    rangeRef,
    signedIn: Boolean(user),
    onRequireLogin: requireLogin,
    onNotice: setNotice,
    onAnchor: setAnchorJob
  })

  const { listRef, range, setRange, offsets, offsetsRef, handleMeasure } = useVirtualComments({
    slug,
    sort,
    pages,
    rootTotal
  })

  rangeRef.current = range

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

  const toggleReply = (comment: PostComment) => {
    setReplyTo(replyTo?.id === comment.id ? null : comment)
  }

  const count = loading ? '00' : String(total).padStart(2, '0')

  const rows: ReactNode[] = []
  if (!loading && !error && rootTotal > 0) {
    const end = Math.min(range.end, rootTotal - 1)
    for (let index = range.start; index <= end; index += 1) {
      const comment = itemAt(pages, index)
      rows.push(
        comment ? (
          <CommentRow key={comment.id} commentId={comment.id} onMeasure={handleMeasure}>
            <CommentItem
              comment={comment}
              replyTo={replyTo}
              onReply={toggleReply}
              onDelete={setDeleteTarget}
              onLike={toggleLike}
              onLoadReplies={loadReplies}
              expandingId={expandingId}
              t={t}
            />
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
