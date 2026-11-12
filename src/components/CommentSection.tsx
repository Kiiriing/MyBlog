import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError, type CommentList, type PostComment } from '../lib/api'
import { findBannedWord } from '../data/moderation'
import { useAuth } from '../store/auth'
import { getLang, useI18n } from '../store/i18n'
import { scrollTo } from '../composables/useSmoothScroll'
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

/** 在评论树里定位一条评论并替换，用于点赞后的局部更新 */
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

export default function CommentSection({ slug }: { slug: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [data, setData] = useState<CommentList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<PostComment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [deleteTarget, setDeleteTarget] = useState<PostComment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const composer = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api
      .comments(slug, sort)
      .then((result) => {
        if (alive) setData(result)
      })
      .catch(() => {
        if (alive) setError(t('评论加载失败，请稍后再试。', 'Could not load comments. Please try again later.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [slug, sort])

  useEffect(() => {
    if (!replyTo) return
    const frame = requestAnimationFrame(() => {
      composer.current?.focus()
      composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [replyTo])

  /* 从通知里的 #comment-xxx 进入时，等评论加载完再定位到屏幕中间偏上并闪烁提示 */
  useEffect(() => {
    if (loading || !data) return
    const match = /^#comment-(.+)$/.exec(location.hash)
    if (!match) return
    const id = match[1]
    let frame = 0
    let highlightTimer = 0
    let settleTimer = 0
    let interrupted = false

    const interrupt = () => {
      interrupted = true
    }
    window.addEventListener('wheel', interrupt, { passive: true })
    window.addEventListener('touchstart', interrupt, { passive: true })
    window.addEventListener('keydown', interrupt)

    /* 统一走 Lenis，避免和页面的平滑滚动互相抢滚动位置 */
    const align = (target: HTMLElement) => {
      const desired = window.innerHeight * 0.4
      const top = window.scrollY + target.getBoundingClientRect().top - desired
      scrollTo(Math.max(0, top), { duration: 1.1, force: true })
    }

    frame = requestAnimationFrame(() => {
      const target = document.getElementById(`comment-${id}`)
      if (!target) return
      align(target)
      target.classList.add('is-target')
      highlightTimer = window.setTimeout(() => target.classList.remove('is-target'), 2500)
      /* 图片、字体加载会改变上方高度，落位后偏移明显再校正一次 */
      settleTimer = window.setTimeout(() => {
        const desired = window.innerHeight * 0.4
        if (!interrupted && Math.abs(target.getBoundingClientRect().top - desired) > 80) align(target)
      }, 1100)
    })

    return () => {
      cancelAnimationFrame(frame)
      if (highlightTimer) window.clearTimeout(highlightTimer)
      if (settleTimer) window.clearTimeout(settleTimer)
      window.removeEventListener('wheel', interrupt)
      window.removeEventListener('touchstart', interrupt)
      window.removeEventListener('keydown', interrupt)
    }
  }, [loading, data, location.hash])

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
      const result = await api.comments(slug, sort)
      setData(result)
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
      const result = await api.comments(slug, sort)
      setData(result)
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
    setData((current) =>
      current ? { ...current, items: mapComment(current.items, comment.id, toggleLikeState) } : current
    )
    try {
      const result = await api.likeComment(comment.id)
      setData((current) =>
        current
          ? {
              ...current,
              items: mapComment(current.items, comment.id, (item) => ({
                ...item,
                likedByMe: result.active,
                likeCount: result.count
              }))
            }
          : current
      )
    } catch (err) {
      setData((current) =>
        current ? { ...current, items: mapComment(current.items, comment.id, toggleLikeState) } : current
      )
      setNotice(err instanceof ApiError ? err.message : t('点赞失败，请稍后再试。', 'Could not like. Please try again.'))
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`
  const count = data ? String(data.total).padStart(2, '0') : '00'

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

          {comment.replies.length ? (
            <div className="comment__replies">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          ) : null}
        </div>
      </article>
    )
  }

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

          <div className="comments__list">
            {loading ? <p className="mono comments__state">{t('正在加载评论…', 'Loading comments…')}</p> : null}
            {!loading && error ? <p className="mono comments__state">{error}</p> : null}
            {!loading && !error && data && data.items.length === 0 ? (
              <div className="comments__empty">
                <span className="comments__empty-no" aria-hidden="true">
                  00
                </span>
                <p>{t('还没有评论，来写下第一条。', 'No comments yet — write the first one.')}</p>
              </div>
            ) : null}
            {data?.items.map((comment) => renderComment(comment))}
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
