import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { PostComment } from '../../lib/api'
import { getLang } from '../../store/i18n'

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

/** 只负责测量自身高度并回报，切换排序或滚动时随窗口一起挂载 / 卸载 */
export function CommentRow({
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

export type CommentItemProps = {
  comment: PostComment
  isReply?: boolean
  replyTo: PostComment | null
  onReply: (comment: PostComment) => void
  onDelete: (comment: PostComment) => void
  onLike: (comment: PostComment) => void
  onLoadReplies: (comment: PostComment) => void
  expandingId: string | null
  t: (zh: string, en: string) => string
}

/** 一条（一级或楼中楼）评论；DOM 结构与 className 供 Comments.css 与高度测量依赖 */
export default function CommentItem({
  comment,
  isReply = false,
  replyTo,
  onReply,
  onDelete,
  onLike,
  onLoadReplies,
  expandingId,
  t
}: CommentItemProps) {
  const initial = comment.authorName.trim().charAt(0).toUpperCase() || '·'
  return (
    <article
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
            <button type="button" className="comment__action" onClick={() => onDelete(comment)}>
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
              onClick={() => onReply(comment)}
            >
              <span aria-hidden="true">↳</span>
              {replyTo?.id === comment.id ? t('取消回复', 'Cancel reply') : t('回复', 'Reply')}
            </button>
            <button
              type="button"
              className={`comment__like${comment.likedByMe ? ' is-on' : ''}`}
              aria-pressed={comment.likedByMe}
              aria-label={t('点赞', 'Like')}
              onClick={() => onLike(comment)}
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
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply
                replyTo={replyTo}
                onReply={onReply}
                onDelete={onDelete}
                onLike={onLike}
                onLoadReplies={onLoadReplies}
                expandingId={expandingId}
                t={t}
              />
            ))}
            {comment.replyCount > comment.replies.length ? (
              <button
                type="button"
                className="comment__more mono"
                onClick={() => onLoadReplies(comment)}
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
