import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { NotificationCategory, NotificationItem } from '../lib/api'
import { useAuth } from '../store/auth'
import { getLang, useI18n } from '../store/i18n'
import WarmTooltip from './WarmTooltip'
import SwipeRow, { type SwipeAction } from './SwipeRow'
import FuseButton from './FuseButton'
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

const CATEGORY_LABEL: Record<NotificationCategory, [string, string]> = {
  SYSTEM: ['系统通知', 'System'],
  FEEDBACK: ['用户反馈', 'Feedback'],
  COMMENT: ['评论回复', 'Comment'],
  DIRECT: ['私信', 'Direct']
}

function categoryLabel(category: NotificationCategory) {
  const [zh, en] = CATEGORY_LABEL[category]
  return getLang() === 'zh' ? zh : en
}

const TABS: { id: NotificationFilter; zh: string; en: string }[] = [
  { id: 'all', zh: '全部', en: 'All' },
  { id: 'unread', zh: '未读', en: 'Unread' },
  { id: 'read', zh: '已读', en: 'Read' }
]

function formatTime(iso: string) {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const en = getLang() === 'en'

  if (diff < minute) return en ? 'just now' : '刚刚'
  if (diff < hour) {
    const value = Math.floor(diff / minute)
    return en ? `${value} min ago` : `${value} 分钟前`
  }
  if (diff < day) {
    const value = Math.floor(diff / hour)
    return en ? `${value} hr ago` : `${value} 小时前`
  }
  if (diff < day * 7) {
    const value = Math.floor(diff / day)
    return en ? `${value} d ago` : `${value} 天前`
  }

  return date.toLocaleDateString(en ? 'en-GB' : 'zh-CN', { month: '2-digit', day: '2-digit' })
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
  onDelete: (rowHeight: number) => void
}

function InboxRow({ item, index, onDelete }: InboxRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [long, setLong] = useState(false)
  const bodyRef = useRef<HTMLSpanElement>(null)
  const shellRef = useRef<HTMLElement>(null)
  const { t } = useI18n()

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
      label: t('删除', 'Delete'),
      icon: <TrashIcon />,
      onSelect: () => onDelete(shellRef.current?.offsetHeight ?? 0)
    },
    {
      id: 'pin',
      label: item.pinned ? t('取消置顶', 'Unpin') : t('置顶', 'Pin'),
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
      collapseOnCommit={false}
      label={`${categoryLabel(item.category)}: ${item.title}`}
    >
      <article
        ref={shellRef}
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
              {categoryLabel(item.category)}
            </span>
            <span className="inbox__time mono">{formatTime(item.createdAt)}</span>
            {item.pinned ? <span className="inbox__pin-mark mono">Pinned</span> : null}
            {!item.read ? <span className="inbox__dot" aria-label={t('未读', 'Unread')} /> : null}
          </span>
          <span className="inbox__item-title">{item.title}</span>
          <span ref={bodyRef} className="inbox__item-body">
            {item.senderName ? `${item.senderName} · ` : ''}
            {item.body}
          </span>
          {long || expanded ? (
            <span className="inbox__more mono">
              {expanded ? t('收起', 'Collapse') : t('…… 点击查看全文', '… show full text')}
            </span>
          ) : null}
        </button>
        {item.link ? (
          <Link
            className="inbox__item-link mono"
            to={item.link}
            onClick={() => {
              if (!item.read) void markRead(item.id)
              closePanel()
            }}
          >
            {t('查看详情', 'View details')} <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
      </article>
    </SwipeRow>
  )
}

type UndoStripProps = {
  item: NotificationItem
  index: number
  rowHeight: number
  onUndo: () => void
  onDone: () => void
}

/* 删除后留在原位的保险丝条：先按原行高度占位，等保险丝亮起再把余量平顺收掉 */
function UndoStrip({ item, index, rowHeight, onUndo, onDone }: UndoStripProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(rowHeight || undefined)
  const [relaxed, setRelaxed] = useState(!rowHeight)
  const [closing, setClosing] = useState(false)
  const timers = useRef<number[]>([])
  const { t } = useI18n()

  useEffect(() => {
    const id = window.setTimeout(() => {
      const natural = innerRef.current?.offsetHeight
      if (natural) setHeight(natural)
      setRelaxed(true)
    }, 280)
    timers.current.push(id)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id))
    },
    []
  )

  /* 烧完先收掉保险丝条的高度，动画结束后才真正落库 */
  const close = () => {
    setClosing(true)
    setHeight(0)
    timers.current.push(window.setTimeout(onDone, 380))
  }

  return (
    <div
      className={`inbox__undo-row${relaxed ? ' is-relaxed' : ''}${closing ? ' is-closing' : ''}`}
      style={
        {
          '--i': Math.min(index, 9),
          height: height === undefined ? undefined : `${height}px`
        } as CSSProperties
      }
    >
      <div ref={innerRef} className="inbox__undo-inner">
        <span className="inbox__undo-label mono">
          {t(`已删除「${item.title}」`, `Removed “${item.title}”`)}
        </span>
        <FuseButton
          className="inbox__undo"
          label={t('删除', 'Delete')}
          undoLabel={t('撤销删除', 'Undo')}
          doneLabel={t('已删除', 'Deleted')}
          size="sm"
          radius={12}
          undoWindow={4000}
          autoArm
          commitOn="fuseEnd"
          settle="stay"
          onUndo={onUndo}
          onCommit={(reason) => {
            if (reason === 'fuseEnd') close()
          }}
        />
      </div>
    </div>
  )
}

export default function NotificationPanel() {
  const inbox = useNotifications()
  const auth = useAuth()
  const { t, lang } = useI18n()
  const [pending, setPending] = useState<Record<string, { item: NotificationItem; height: number }>>({})

  const stageDelete = (item: NotificationItem, height: number) => {
    setPending((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: { item, height } }))
  }

  const undoDelete = (id: string) => {
    setPending((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const commitDelete = async (id: string) => {
    await removeNotification(id)
    undoDelete(id)
  }

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
        aria-label={t('关闭站内信', 'Close inbox')}
        onClick={closePanel}
      />

      <aside className="inbox__panel" role="dialog" aria-modal="true" aria-label={t('站内信', 'Inbox')}>
        <header className="inbox__head">
          <div>
            <span className="eyebrow">Inbox / {t('站内信', 'Inbox')}</span>
            <p className="inbox__count mono">
              {auth.user
                ? inbox.unread > 0
                  ? t(`${inbox.unread} 条未读`, `${inbox.unread} unread`)
                  : t('全部已读', 'All read')
                : t('未登录', 'Not signed in')}
            </p>
          </div>
          <WarmTooltip content={t('关闭站内信', 'Close inbox')} shortcut="Esc" side="bottom" disabled={!inbox.open}>
            <button className="inbox__close" type="button" aria-label={t('关闭', 'Close')} onClick={closePanel}>
              <span aria-hidden="true">×</span>
            </button>
          </WarmTooltip>
        </header>

        {auth.user ? (
          <>
            <div className="inbox__tabs" role="tablist" aria-label={t('通知筛选', 'Notification filters')}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={inbox.filter === tab.id}
                  className={`inbox__tab${inbox.filter === tab.id ? ' is-active' : ''}`}
                  onClick={() => setFilter(tab.id)}
                >
                  {lang === 'zh' ? tab.zh : tab.en}
                </button>
              ))}
            </div>

            <div className="inbox__list" data-lenis-prevent>
              {inbox.loading && inbox.items.length === 0 ? (
                <p className="inbox__hint mono">Loading…</p>
              ) : inbox.items.length === 0 ? (
                <p className="inbox__hint">{t('这里还没有消息。', 'No messages here yet.')}</p>
              ) : (
                inbox.items.map((item, index) => {
                  const staged = pending[item.id]
                  return staged ? (
                    <UndoStrip
                      key={`undo-${item.id}`}
                      item={staged.item}
                      index={index}
                      rowHeight={staged.height}
                      onUndo={() => undoDelete(item.id)}
                      onDone={() => void commitDelete(item.id)}
                    />
                  ) : (
                    <InboxRow
                      key={`${inbox.filter}-${item.id}`}
                      item={item}
                      index={index}
                      onDelete={(height) => stageDelete(item, height)}
                    />
                  )
                })
              )}

              {inbox.error ? (
                <p className="inbox__hint inbox__hint--error" role="alert">
                  {inbox.error}
                </p>
              ) : null}
            </div>

            <footer className="inbox__foot">
              <span className="mono">{auth.user.email}</span>
              <WarmTooltip content={t('一键全部标为已读', 'Mark all as read')} side="top" disabled={!inbox.open}>
                <button
                  className="inbox__read-all"
                  type="button"
                  onClick={() => markAllRead()}
                  disabled={inbox.unread === 0}
                >
                  {t('全部已读', 'Mark all read')}
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
            <p>{t('登录后可以接收站点公告、反馈回执与私信。', 'Sign in to receive announcements, feedback replies and direct messages.')}</p>
            <Link className="inbox__login" to="/login" onClick={closePanel}>
              {t('去登录', 'Sign in')} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
