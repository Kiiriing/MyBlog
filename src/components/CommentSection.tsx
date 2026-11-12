import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, ApiError, type CommentList, type PostComment } from '../lib/api'
import { useAuth } from '../store/auth'
import '../styles/components/Comments.css'

function formatTime(iso: string) {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const diff = Date.now() - time
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return new Date(time).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function CommentSection({ slug }: { slug: string }) {
  const { user } = useAuth()
  const location = useLocation()
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
        if (alive) setError('评论加载失败，请稍后再试。')
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
      setNotice('多写两个字再发吧。')
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      await api.addComment(slug, text, replyTo?.id)
      setContent('')
      setReplyTo(null)
      setNotice('评论已发布。')
      const result = await api.comments(slug)
      setData(result)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : '发布失败，请稍后再试。')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('删除这条评论？')) return
    try {
      await api.deleteComment(id)
      const result = await api.comments(slug)
      setData(result)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : '删除失败，请稍后再试。')
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`

  function renderComment(comment: PostComment, isReply = false) {
    return (
      <article
        key={comment.id}
        className={`comment${isReply ? ' comment--reply' : ''}${comment.deleted ? ' is-deleted' : ''}`}
      >
        <header className="comment__head">
          <span className="comment__author">{comment.authorName}</span>
          <time className="mono" dateTime={comment.createdAt}>
            {formatTime(comment.createdAt)}
          </time>
          {comment.mine && !comment.deleted ? (
            <button type="button" className="comment__action" onClick={() => remove(comment.id)}>
              删除
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
              {replyTo?.id === comment.id ? '取消回复' : '回复'}
            </button>
          </div>
        ) : null}

        {comment.replies.length ? (
          <div className="comment__replies">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <section className="comments shell" id="comments" aria-label="评论区">
      <div className="comments__head">
        <div>
          <span className="eyebrow">Comments / 评论</span>
          <h2 className="comments__title">
            说点什么
            <em>{data ? String(data.total).padStart(2, '0') : '00'}</em>
          </h2>
        </div>
        <span className="mono comments__note">登录后可以评论与回复</span>
      </div>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <div className="comment-form__top">
            <span className="mono comment-form__as">以 {user.displayName} 的身份</span>
            {replyTo ? (
              <button type="button" className="comment-form__replying" onClick={() => setReplyTo(null)}>
                回复 @{replyTo.authorName} · 取消
              </button>
            ) : null}
          </div>
          <textarea
            ref={composer}
            className="comment-form__input"
            value={content}
            maxLength={800}
            placeholder={replyTo ? `回复 @${replyTo.authorName}…` : '写下你的想法…'}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
          />
          <div className="comment-form__foot">
            <span className="mono comment-form__count">{content.length} / 800</span>
            <button type="submit" className="comment-form__submit" disabled={submitting}>
              {submitting ? '发布中…' : '发布评论'}
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-gate">
          <p>评论需要登录。登录后可以回复、收到楼中楼通知。</p>
          <Link to={loginHref} className="comment-gate__link" data-cursor="Login">
            去登录 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}

      {notice ? (
        <p className="mono comments__notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="comments__list">
        {loading ? <p className="mono comments__empty">正在加载评论…</p> : null}
        {!loading && error ? <p className="mono comments__empty">{error}</p> : null}
        {!loading && !error && data && data.items.length === 0 ? (
          <p className="comments__empty">还没有评论，来写下第一条。</p>
        ) : null}
        {data?.items.map((comment) => renderComment(comment))}
      </div>
    </section>
  )
}
