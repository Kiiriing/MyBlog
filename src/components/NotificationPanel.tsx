import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { NotificationCategory, NotificationItem } from '../lib/api'
import { useAuth } from '../store/auth'
import WarmTooltip from './WarmTooltip'
import SwipeRow, { type SwipeAction } from './SwipeRow'
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.9 12.5h9.2L17.5 7" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
      <path d="M12 14v6" />
    </svg>
  )
}

type InboxRowProps = {
  item: NotificationItem
  index: number
}

function InboxRow({ item, index }: InboxRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [long, setLong] = useState(false)
  const bodyRef = useRef<HTMLSpanElement>(null)

  const measure = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    setLong(el.scrollHeight - el.clientHeight > 2)
  }, [])

  useLayoutEffect(() => {
    if (!expanded) measure()
  }, [expanded, measure, item.body])

  useEffect(() => {
    const el = bodyRef.current
    if (!el || expanded) return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded, measure])

  function onToggle() {
    if (!item.read) void markRead(item.id)
    setExpanded((value) => !value)
  }

  const actions: SwipeAction[] = [
    {
      id: 'delete',
      label: '删除',
      icon: <TrashIcon />,
      onSelect: () => removeNotification(item.id)
    },
    {
      id: 'pin',
      label: item.pinned ? '取消置顶' : '置顶',
      icon: <PinIcon />,
      onSelect: () => togglePin(item.id)
    }
  ]

  return (
    <SwipeRow
      className="inbox__row"
      style={{ '--i': Math.min(index, 9) } as CSSProperties}
      height="auto"
      actions={actions}
      label={`${CATEGORY_LABEL[item.category]}：${item.title}`}
    >
      <article
        className={[
          'inbox__item',
          item.read ? 'is-read' : '',
          item.pinned ? 'is-pinned' : '',
          expanded ? 'is-expanded' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          className="inbox__item-main"
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
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
          <span ref={bodyRef} className="inbox__item-body">
            {item.senderName ? `${item.senderName} · ` : ''}
            {item.body}
          </span>
          {long || expanded ? (
            <span className="inbox__more mono">{expanded ? '收起' : '…… 点击查看全文'}</span>
          ) : null}
        </button>
        {item.link ? (
          <Link className="inbox__item-link mono" to={item.link} onClick={closePanel}>
            查看详情 <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
      </article>
    </SwipeRow>
  )
}

export default function NotificationPanel() {
  const inbox = useNotifications()
  const auth = useAuth()

  useEffect(() => {
    if (!inbox.open) return

    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel()
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [inbox.open])

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
          <WarmTooltip content="关闭站内信" shortcut="Esc" side="bottom" disabled={!inbox.open}>
            <button className="inbox__close" type="button" aria-label="关闭" onClick={closePanel}>
              <span aria-hidden="true">×</span>
            </button>
          </WarmTooltip>
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
                inbox.items.map((item, index) => (
                  <InboxRow
                    key={`${inbox.filter}-${item.id}`}
                    item={item}
                    index={index}
                  />
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
              <WarmTooltip content="一键全部标为已读" side="top" disabled={!inbox.open}>
                <button
                  className="inbox__read-all"
                  type="button"
                  onClick={() => markAllRead()}
                  disabled={inbox.unread === 0}
                >
                  全部已读
                </button>
              </WarmTooltip>
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
