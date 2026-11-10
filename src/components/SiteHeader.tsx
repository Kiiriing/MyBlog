import { Link, useLocation } from 'react-router-dom'
import { useUi, setMenuOpen, toggleMenu } from '../store/ui'
import { closePanel, useNotifications } from '../store/notifications'
import { signOut, useAuth } from '../store/auth'
import { scrollTo } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import NotificationBell from './NotificationBell'
import '../styles/components/SiteHeader.css'
import '../styles/components/Notifications.css'

export default function SiteHeader() {
  const ui = useUi()
  const inbox = useNotifications()
  const auth = useAuth()
  const location = useLocation()

  function onBrandClick(event: React.MouseEvent) {
    if (ui.menuOpen) setMenuOpen(false)
    if (inbox.open) closePanel()
    if (location.pathname === '/') {
      event.preventDefault()
      scrollTo(0, { duration: 1.2 })
    }
  }

  function onMenuClick() {
    if (inbox.open) closePanel()
    toggleMenu()
  }

  return (
    <header
      className={[
        'site-header',
        ui.introDone ? 'is-visible' : '',
        ui.menuOpen ? 'is-menu-open' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Link to="/" className="brand" aria-label="LU YU — 返回首页" onClick={onBrandClick}>
        <span className="brand__name">
          LU YU<span className="brand__reg">®</span>
        </span>
        <span className="brand__meta">陆屿 / {site.role}</span>
      </Link>

      <div className="header-note">
        <span className="header-note__dot" />
        <span>{site.availability}</span>
      </div>

      <div className="header-actions">
        <NotificationBell />

        {auth.user ? (
          <button
            className="header-login is-user"
            type="button"
            title="退出登录"
            aria-label={`${auth.user.displayName}，退出登录`}
            onClick={signOut}
          >
            <span className="header-login__name">{auth.user.displayName}</span>
          </button>
        ) : (
          <Link to="/login" className="header-login" aria-label="登录">
            <span>登录</span>
            <span className="header-login__arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        )}

        <button
          className="menu-btn"
          type="button"
          aria-expanded={ui.menuOpen}
          aria-controls="site-menu"
          aria-label={ui.menuOpen ? '关闭菜单' : '打开菜单'}
          onClick={onMenuClick}
        >
          <span className="menu-btn__label">{ui.menuOpen ? 'Close' : 'Menu'}</span>
          <span className="menu-btn__icon" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>
    </header>
  )
}
