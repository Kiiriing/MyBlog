import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { scrollTo } from '../composables/useSmoothScroll'
import { changelog } from '../data/changelog'
import SiteFooter from '../components/SiteFooter'
import '../styles/components/UpdatesView.css'

/** 版本层级：只影响时间线圆点的样式，不改内容 */
function levelOf(version: string) {
  const [, minor, patch] = version.replace(/^v/, '').split('.').map(Number)
  if (patch) return 'patch'
  if (minor) return 'minor'
  return 'major'
}

/** 把文案里的 `xxx` 渲染成行内代码 */
function renderText(text: string) {
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? <code key={i}>{part}</code> : part
  )
}

export default function UpdatesView() {
  const [active, setActive] = useState(changelog[0].version)
  const listRef = useRef<HTMLOListElement>(null)
  const navListRef = useRef<HTMLOListElement>(null)
  /* 目录列表是否还有被遮住的内容：决定上下两条渐隐遮罩是否出现 */
  const [edge, setEdge] = useState({ top: false, bottom: false })
  /* 点击目录后先锁住高亮，等平滑滚动结束再交还给滚动监听，避免中途闪到别的版本 */
  const lockUntil = useRef(0)

  useEffect(() => {
    document.title = '更新记录 Changelog — 陆屿 LU YU'
  }, [])

  /* 滚动时把左侧目录同步到当前正在读的那条：
     取「顶部已越过视口 32% 线」的最后一条，比 IntersectionObserver 在窄检测带内更稳，
     也不会在点击跳转的平滑滚动过程中跳到别的版本。 */
  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      if (performance.now() < lockUntil.current) return

      const items = listRef.current?.querySelectorAll<HTMLElement>('.timeline__item')
      if (!items?.length) return

      const line = window.innerHeight * 0.32
      let current = items[0].id
      items.forEach((item) => {
        if (item.getBoundingClientRect().top <= line) current = item.id
      })
      setActive(current)
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  /* 目录列表自身可滚动（滚轮 / 触摸），滚到两端时切换渐隐遮罩 */
  useEffect(() => {
    const nav = navListRef.current
    if (!nav) return

    let frame = 0
    const sync = () => {
      frame = 0
      const max = nav.scrollHeight - nav.clientHeight
      const top = nav.scrollTop > 4
      const bottom = nav.scrollTop < max - 4
      setEdge((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(sync)
    }

    sync()
    nav.addEventListener('scroll', onScroll, { passive: true })
    const observer = new ResizeObserver(sync)
    observer.observe(nav)

    return () => {
      nav.removeEventListener('scroll', onScroll)
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  /* 页面滚动把当前版本推到目录可视区之外时，目录自己跟着滚，保持高亮项始终可见 */
  useEffect(() => {
    const nav = navListRef.current
    const item = nav?.querySelector<HTMLElement>(`[data-nav-version="${active}"]`)
    if (!nav || !item) return

    const navRect = nav.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const offset = itemRect.top - navRect.top

    if (offset < 0 || offset + itemRect.height > navRect.height) {
      nav.scrollTo({
        top: nav.scrollTop + offset - nav.clientHeight / 2 + itemRect.height / 2,
        behavior: 'smooth'
      })
    }
  }, [active])

  const jump = useCallback((version: string) => {
    const el = document.getElementById(version)
    if (!el) return
    lockUntil.current = performance.now() + 1500
    setActive(version)
    scrollTo(el, { offset: -200 })
  }, [])

  const total = String(changelog.length).padStart(2, '0')
  const latest = changelog[0]
  const activeIndex = changelog.findIndex((entry) => entry.version === active)

  return (
    <div className="updates-page theme-paper">
      <div className="updates-page__grid" aria-hidden="true" />

      <header className="updates-page__head">
        <div className="shell">
          <div className="updates-page__meta">
            <span className="eyebrow">Changelog / 更新</span>
            <span className="mono updates-page__meta-note">{total} milestones · 2026</span>
          </div>

          <h1 className="updates-page__title">
            <span>Shipping,</span>
            <em>one release at a time.</em>
          </h1>

          <div className="updates-page__intro">
            <p>
              从第一行代码到现在，每一次修复、重构和深夜的调整都记在这里。
              按时间倒序排列，最近的一次在最上面。
            </p>
            <div className="updates-page__index mono">
              <span>Latest {latest.version}</span>
              <span>{latest.date}</span>
              <span>Beijing</span>
            </div>
          </div>
        </div>
      </header>

      <main className="updates-page__body">
        <div className="shell">
          <div className="updates-layout">
            <aside className="updates-nav" aria-label="版本目录">
              <div className="updates-nav__head">
                <span className="updates-nav__label mono">Milestones</span>
                <span className="updates-nav__total mono">{total}</span>
              </div>
              <ol
                ref={navListRef}
                className={`updates-nav__list${edge.top ? ' is-faded-top' : ''}${edge.bottom ? ' is-faded-bottom' : ''}`}
                data-lenis-prevent
              >
                {changelog.map((entry) => (
                  <li key={entry.version} data-nav-version={entry.version}>
                    <button
                      type="button"
                      className={`updates-nav__item${active === entry.version ? ' is-active' : ''}`}
                      aria-current={active === entry.version ? 'true' : undefined}
                      onClick={() => jump(entry.version)}
                    >
                      <span className="updates-nav__version mono">{entry.version}</span>
                      <span className="updates-nav__title">{entry.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="updates-nav__foot">
                <span className="updates-nav__count mono">
                  {String(activeIndex + 1).padStart(2, '0')} / {total}
                </span>
                <span className="updates-nav__track" aria-hidden="true">
                  <span
                    className="updates-nav__track-fill"
                    style={{ transform: `scaleX(${(activeIndex + 1) / changelog.length})` }}
                  />
                </span>
              </div>
            </aside>

            <ol className="timeline" ref={listRef}>
              {changelog.map((entry, i) => (
                <li
                  key={entry.version}
                  id={entry.version}
                  className={`timeline__item timeline__item--${levelOf(entry.version)}${active === entry.version ? ' is-active' : ''}`}
                  style={{ '--i': Math.min(i, 6) } as CSSProperties}
                >
                  <span className="timeline__dot" aria-hidden="true" />

                  <div className="timeline__meta">
                    <span className="timeline__version mono">{entry.version}</span>
                    {i === 0 ? <span className="timeline__latest mono">Latest</span> : null}
                    <time className="timeline__date mono" dateTime={entry.dateTime}>
                      {entry.date}
                    </time>
                  </div>

                  <h2 className="timeline__title">{entry.title}</h2>

                  <ul className="timeline__list">
                    {entry.items.map((item) => (
                      <li key={item}>{renderText(item)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>

          <div className="updates-page__foot">
            <p className="mono">End of log — 共 {changelog.length} 个里程碑。</p>
            <Link to="/" className="updates-page__home" data-cursor="Index">
              <span>Back to index</span>
              <span aria-hidden="true">↖</span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
