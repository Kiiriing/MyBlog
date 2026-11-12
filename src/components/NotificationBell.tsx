import WarmTooltip from './WarmTooltip'
import { useAuth } from '../store/auth'
import { togglePanel, useNotifications } from '../store/notifications'
import { setMenuOpen, useUi } from '../store/ui'
import { useI18n } from '../store/i18n'

export default function NotificationBell() {
  const ui = useUi()
  const auth = useAuth()
  const inbox = useNotifications()
  const { t } = useI18n()
  const unread = auth.user ? inbox.unread : 0
  const label =
    unread > 0
      ? t(`站内信，${unread} 条未读`, `Inbox, ${unread} unread`)
      : t('站内信', 'Inbox')

  function onClick() {
    if (ui.menuOpen) setMenuOpen(false)
    togglePanel()
  }

  return (
    <WarmTooltip content={t('消息', 'Messages')} side="bottom">
      <button
        className={`bell${unread > 0 ? ' has-unread' : ''}${inbox.open ? ' is-open' : ''}`}
        type="button"
        aria-label={label}
        aria-expanded={inbox.open}
        onClick={onClick}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6.6 9.6a5.4 5.4 0 0 1 10.8 0c0 3.1.7 5 1.6 6.1.3.4 0 1-.5 1H5.5c-.5 0-.8-.6-.5-1 .9-1.1 1.6-3 1.6-6.1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2.2 2.2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 ? <span className="bell__badge">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
    </WarmTooltip>
  )
}
