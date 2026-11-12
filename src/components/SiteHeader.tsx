import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useUi, setMenuOpen, toggleMenu } from '../store/ui'
import { closePanel, useNotifications } from '../store/notifications'
import { signOut, useAuth } from '../store/auth'
import { lockScroll, scrollTo, unlockScroll } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import { useI18n } from '../store/i18n'
import NotificationBell from './NotificationBell'
import SiteSearch from './SiteSearch'
import LangToggle from './LangToggle'
import WarmTooltip from './WarmTooltip'
import '../styles/components/SiteHeader.css'
import '../styles/components/Notifications.css'

export default function SiteHeader() {
  const ui = useUi()
  const inbox = useNotifications()
  const auth = useAuth()
  const location = useLocation()
  const { t } = useI18n()

  /* 退出登录前先确认，避免误点把登录状态清掉 */
  const [signOutOpen, setSignOutOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!signOutOpen) return undefined
    lockScroll()
    const frame = requestAnimationFrame(() => cancelRef.current?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSignOut()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      unlockScroll()
    }
  }, [signOutOpen])

  function closeSignOut() {
    setSignOutOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  function confirmSignOut() {
    setSignOutOpen(false)
    signOut()
  }

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
      <Link
        to="/"
        className="brand"
        aria-label={t('LU YU — 返回首页', 'LU YU — back to home')}
        onClick={onBrandClick}
      >
        <span className="brand__name">
          LU YU<span className="brand__reg">®</span>
        </span>
        <span className="brand__meta">
          {site.cn} / {t('全栈开发者', site.role)}
        </span>
      </Link>

      <div className="header-note">
        <span className="header-note__dot" />
        <span>{t('2026 开放实习与全栈岗位', site.availability)}</span>
      </div>

      <div className="header-actions">
        <SiteSearch />
        <NotificationBell />

        {auth.user ? (
          <WarmTooltip
            content={t('退出登录 · 下次需要重新验证邮箱', 'Sign out · email verification required next time')}
            side="bottom"
            disabled={signOutOpen}
          >
            <button
              ref={triggerRef}
              className="header-login is-user"
              type="button"
              aria-haspopup="dialog"
              aria-label={t(`${auth.user.displayName}，退出登录`, `${auth.user.displayName}, sign out`)}
              onClick={() => setSignOutOpen(true)}
            >
              <span className="header-login__name">{auth.user.displayName}</span>
            </button>
          </WarmTooltip>
        ) : (
          <Link to="/login" className="header-login" aria-label={t('登录', 'Sign in')}>
            <span>{t('登录', 'Sign in')}</span>
            <span className="header-login__arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        )}

        {/* 语言切换固定在登录与 MENU 之间 */}
        <LangToggle />

        <button
          className="menu-btn"
          type="button"
          aria-expanded={ui.menuOpen}
          aria-controls="site-menu"
          aria-label={ui.menuOpen ? t('关闭菜单', 'Close menu') : t('打开菜单', 'Open menu')}
          onClick={onMenuClick}
        >
          <span className="menu-btn__label">
            {ui.menuOpen ? t('Close', 'Close') : t('Menu', 'Menu')}
          </span>
          <span className="menu-btn__icon" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>

        {signOutOpen
          ? createPortal(
              <div
                className="signout"
                role="dialog"
                aria-modal="true"
                aria-labelledby="signout-title"
                aria-describedby="signout-note"
              >
                <button
                  type="button"
                  className="signout__backdrop"
                  tabIndex={-1}
                  aria-label={t('取消退出登录', 'Cancel sign out')}
                  onClick={closeSignOut}
                />
                <div className="signout__card">
                  <span className="signout__kicker">Session / {t('登录状态', 'Sign in state')}</span>
                  <h2 className="signout__title" id="signout-title">
                    {t('确定要退出登录吗？', 'Sign out of this session?')}
                  </h2>
                  <p className="signout__note" id="signout-note">
                    {t(
                      '退出后本机保存的登录令牌会立即清除，站内信与个人状态将暂不可用，下次访问需要重新验证邮箱。',
                      'The token stored on this device will be cleared immediately. Inbox and account features will be unavailable until you verify your email again.'
                    )}
                  </p>
                  <div className="signout__actions">
                    <button
                      ref={cancelRef}
                      type="button"
                      className="signout__ghost"
                      onClick={closeSignOut}
                    >
                      {t('再待一会儿', 'Stay a while')}
                    </button>
                    <button type="button" className="signout__primary" onClick={confirmSignOut}>
                      {t('确认退出', 'Sign out')}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    </header>
  )
}
