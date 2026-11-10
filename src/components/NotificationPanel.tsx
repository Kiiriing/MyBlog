import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { NotificationCategory, NotificationItem } from '../lib/api'
import { useAuth } from '../store/auth'
import {
  closePanel,
  markAllRead,
  markRead,
  removeNotification,
  setFilter,
  togglePin,
  useNotifications,
  type NotificationFilter
} from '../store/notifications'
import '../styles/components/Notifications.css'

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  SYSTEM: '系统通知',
  FEEDBACK: '用户反馈',
  DIRECT: '私信'
}

const TABS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'unread', label: '未读' },
  { id: 'read', label: '已读' }
]

function formatTime(iso: string) {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export default function NotificationPanel() {
  const inbox = useNotifications()
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!inbox.open) return

    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel()
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [inbox.open])

  function openItem(item: NotificationItem) {
    if (!item.read) void markRead(item.id)
    if (!item.link) return
    closePanel()
    navigate(item.link)
  }

  return (
    <div
      className={`inbox${inbox.open ? ' is-open' : ''}`}
      aria-hidden={!inbox.open}
      inert={!inbox.open || undefined}
    >
      <button
        className="inbox__backdrop"
        type="button"
        aria-label="关闭站内信"
        onClick={closePanel}
      />

      <aside className="inbox__panel" role="dialog" aria-modal="true" aria-label="站内信">
        <header className="inbox__head">
          <div>
            <span className="eyebrow">Inbox / 站内信</span>
            <p className="inbox__count mono">
              {auth.user ? (inbox.unread > 0 ? `${inbox.unread} 条未读` : '全部已读') : '未登录'}
            </p>
          </div>
          <button className="inbox__close" type="button" aria-label="关闭" onClick={closePanel}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {auth.user ? (
          <>
            <div className="inbox__tabs" role="tablist" aria-label="通知筛选">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={inbox.filter === tab.id}
                  className={`inbox__tab${inbox.filter === tab.id ? ' is-active' : ''}`}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="inbox__list" data-lenis-prevent>
              {inbox.loading && inbox.items.length === 0 ? (
                <p className="inbox__hint mono">Loading…</p>
              ) : inbox.items.length === 0 ? (
                <p className="inbox__hint">这里还没有消息。</p>
              ) : (
                inbox.items.map((item) => (
                  <article
                    key={item.id}
                    className={[
                      'inbox__item',
                      item.read ? 'is-read' : '',
                      item.pinned ? 'is-pinned' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      className="inbox__item-main"
                      type="button"
                      onClick={() => openItem(item)}
                    >
                      <span className="inbox__item-meta">
                        <span className={`inbox__tag inbox__tag--${item.category.toLowerCase()}`}>
                          {CATEGORY_LABEL[item.category]}
                        </span>
                        <span className="inbox__time mono">{formatTime(item.createdAt)}</span>
                        {item.pinned ? <span className="inbox__pin-mark mono">Pinned</span> : null}
                        {!item.read ? <span className="inbox__dot" aria-label="未读" /> : null}
                      </span>
                      <span className="inbox__item-title">{item.title}</span>
                      <span className="inbox__item-body">
                        {item.senderName ? `${item.senderName} · ` : ''}
                        {item.body}
                      </span>
                    </button>

                    <div className="inbox__item-actions">
                      <button
                        type="button"
                        onClick={() => togglePin(item.id)}
                        aria-label={item.pinned ? '取消置顶' : '置顶'}
                      >
                        {item.pinned ? '取消置顶' : '置顶'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeNotification(item.id)}
                        aria-label="删除"
                      >
                        删除
                      </button>
                    </div>
                  </article>
                ))
              )}

              {inbox.error ? (
                <p className="inbox__hint inbox__hint--error" role="alert">
                  {inbox.error}
                </p>
              ) : null}
            </div>

            <footer className="inbox__foot">
              <span className="mono">{auth.user.email}</span>
              <button
                className="inbox__read-all"
                type="button"
                onClick={() => markAllRead()}
                disabled={inbox.unread === 0}
              >
                全部已读
              </button>
            </footer>
          </>
        ) : (
          <div className="inbox__locked">
            <span className="inbox__locked-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </span>
            <p>登录后可以接收站点公告、反馈回执与私信。</p>
            <Link className="inbox__login" to="/login" onClick={closePanel}>
              去登录 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
