import { Link, useLocation } from 'react-router-dom'
import { useUi, setMenuOpen, toggleMenu } from '../store/ui'
import { scrollTo } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import '../styles/components/SiteHeader.css'

export default function SiteHeader() {
  const ui = useUi()
  const location = useLocation()

  function onBrandClick(event: React.MouseEvent) {
    if (ui.menuOpen) setMenuOpen(false)
    if (location.pathname === '/') {
      event.preventDefault()
      scrollTo(0, { duration: 1.2 })
    }
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

      <button
        className="menu-btn"
        type="button"
        aria-expanded={ui.menuOpen}
        aria-controls="site-menu"
        aria-label={ui.menuOpen ? '关闭菜单' : '打开菜单'}
        onClick={toggleMenu}
      >
        <span className="menu-btn__label">{ui.menuOpen ? 'Close' : 'Menu'}</span>
        <span className="menu-btn__icon" aria-hidden="true">
          <i />
          <i />
        </span>
      </button>
    </header>
  )
}
