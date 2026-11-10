import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { menuItems, site } from '../data/site'
import { useUi, setMenuOpen } from '../store/ui'
import { useClock } from '../hooks/useClock'
import { scrollTo, scrollToSection } from '../composables/useSmoothScroll'
import ProfileCard from './ProfileCard'
import '../styles/components/MenuOverlay.css'

type MenuItem = (typeof menuItems)[number]

function chooseInitialPreview(path: string) {
  if (path.startsWith('/journal')) return 2
  if (path.startsWith('/work')) return 1
  return 3
}

export default function MenuOverlay() {
  const ui = useUi()
  const location = useLocation()
  const navigate = useNavigate()
  const time = useClock()

  const [hovered, setHovered] = useState(3)
  const contactItem = menuItems[menuItems.length - 1]

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && ui.menuOpen) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ui.menuOpen])

  useEffect(() => {
    if (!ui.menuOpen) return
    setHovered(chooseInitialPreview(location.pathname))
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLElement>('.menu__item')?.focus({ preventScroll: true })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [ui.menuOpen])

  function go(item: MenuItem) {
    setMenuOpen(false)

    if (item.type === 'route') {
      if (location.pathname === item.to) {
        scrollTo(0, { duration: 1.1 })
      } else {
        navigate(item.to)
      }
      return
    }

    if (location.pathname === '/') {
      window.setTimeout(() => scrollToSection(item.target), 220)
    } else {
      navigate(`/#${item.target}`)
    }
  }

  return (
    <div
      id="site-menu"
      className={`menu${ui.menuOpen ? ' is-open' : ''}`}
      inert={!ui.menuOpen}
      role="dialog"
      aria-modal="true"
      aria-label="站点菜单"
      data-lenis-prevent
    >
      <div className="menu__ambient" aria-hidden="true">
        <span className="menu__glow menu__glow--one" />
        <span className="menu__glow menu__glow--two" />
        <span className="menu__grid" />
      </div>

      <div className="menu__body">
        <div className="menu__inner shell">
          <div className="menu__nav-wrap">
            <div className="menu__eyebrow eyebrow">Navigation / 导航</div>
            <nav className="menu__nav" aria-label="主要导航" onMouseLeave={() => setHovered(3)}>
              {menuItems.map((item, i) => (
                <button
                  key={item.index}
                  type="button"
                  className={`menu__item${hovered === i ? ' is-active' : ''}`}
                  style={{ '--i': i } as React.CSSProperties}
                  data-cursor={item.type === 'route' ? 'Go' : 'Jump'}
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onClick={() => go(item)}
                >
                  <span className="menu__index">{item.index}</span>
                  <span className="menu__label">
                    <span className="menu__en">{item.en}</span>
                    <span className="menu__cn">{item.cn}</span>
                  </span>
                  <span className="menu__arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M5 19L19 5M9 5h10v10" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <aside className="menu__preview">
            <ProfileCard
              avatarUrl="/art/avatar-kiiriing.png"
              miniAvatarUrl="/art/avatar-kiiriing-sm.png"
              name="Kiiriing"
              title="Full-stack Web Developer"
              handle="Kiiriing"
              status="Open for 2026"
              contactText="Contact"
              onContactClick={() => go(contactItem)}
              className="menu__profile"
            />
            <div className="menu__preview-foot">
              <span className="mono">Profile</span>
              <span className="mono">{site.coords}</span>
            </div>
          </aside>
        </div>

        <footer className="menu__footer shell">
          <a className="menu__email link-underline" href={`mailto:${site.email}`} data-cursor="Write">
            {site.email}
          </a>
          <div className="menu__socials">
            {site.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="menu__social mono"
              >
                {social.label}
              </a>
            ))}
          </div>
          <div className="menu__clock mono">
            <span className="dot" />
            Beijing · {time}
          </div>
        </footer>
      </div>
    </div>
  )
}
