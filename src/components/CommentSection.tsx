import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, ApiError, type CommentList, type PostComment } from '../lib/api'
import { useAuth } from '../store/auth'
import { getLang, useI18n } from '../store/i18n'
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

export default function CommentSection({ slug }: { slug: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const { t } = useI18n()
  const [data, setData] = useState<CommentList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<PostComment | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api
      .comments(slug)
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
  }, [slug])

  useEffect(() => {
    if (!replyTo) return
    const frame = requestAnimationFrame(() => {
      composer.current?.focus()
      composer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [replyTo])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!user || submitting) return
    const text = content.trim()
    if (text.length < 2) {
      setNotice(t('多写两个字再发吧。', 'A few more characters, please.'))
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      await api.addComment(slug, text, replyTo?.id)
      setContent('')
      setReplyTo(null)
      setNotice(t('评论已发布。', 'Comment posted.'))
      const result = await api.comments(slug)
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

  async function remove(id: string) {
    if (!window.confirm(t('删除这条评论？', 'Delete this comment?'))) return
    try {
      await api.deleteComment(id)
      const result = await api.comments(slug)
      setData(result)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : t('删除失败，请稍后再试。', 'Could not delete. Please try again later.'))
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`
  const count = data ? String(data.total).padStart(2, '0') : '00'

  function renderComment(comment: PostComment, isReply = false) {
    const initial = comment.authorName.trim().charAt(0).toUpperCase() || '·'
    return (
      <article
        key={comment.id}
        className={`comment${isReply ? ' comment--reply' : ''}${comment.deleted ? ' is-deleted' : ''}`}
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
              <button type="button" className="comment__action" onClick={() => remove(comment.id)}>
                {t('删除', 'Delete')}
              </button>
            ) : null}
          </header>

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
      <header className="comments__head">
        <div className="comments__intro">
          <span className="eyebrow">Discussion / {t('讨论', 'Discussion')}</span>
          <h2 className="comments__title">
            <span>{t('留下一条', 'Leave a')}</span>
            <em>{t('注脚', 'note')}</em>
            <span className="comments__count mono">{count}</span>
          </h2>
          <p className="comments__lede">
            {t(
              '补充、质疑，或者只是打个招呼。登录后可以评论，也能收到楼中楼回复提醒。',
              'Add context, push back, or just say hello. Sign in to comment and get notified when someone replies.'
            )}
          </p>
        </div>
        <span className="comments__mark" aria-hidden="true">
          ?
        </span>
      </header>

      <div className="comments__body">
        <aside className="comments__aside">
          {user ? (
            <form className="comment-form" onSubmit={submit}>
              <div className="comment-form__head">
                <span className="mono comment-form__label">{t('新注脚', 'New note')}</span>
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
        </aside>

        <div className="comments__stream">
          <div className="comments__stream-head">
            <span className="mono">{t('全部评论', 'All comments')}</span>
            <span className="mono comments__stream-count">{count}</span>
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
    </section>
  )
}
