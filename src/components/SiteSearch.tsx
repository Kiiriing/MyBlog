import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { lockScroll, scrollTo, scrollToSection, unlockScroll } from '../composables/useSmoothScroll'
import {
  escapeRegExp,
  searchSite,
  splitTokens,
  suggestions,
  type SearchItem
} from '../data/search'
import '../styles/components/SiteSearch.css'

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)

/** 收起动画的时长，和 CSS 里的 search-panel-out 保持一致；减弱动效时直接跳过等待 */
const CLOSE_MS =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : 200

/* 全站搜索：头部的搜索按钮打开一层面板，匹配页面 / 作品 / 手记 / 更新 / 履历。
   面板挂在 body 上，避免被头部的 mix-blend-mode 反相；
   打开、收起、跳转都有过渡，收起动画放完才真正卸载。 */
export default function SiteSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef(0)

  const mounted = phase !== 'closed'
  const tokens = useMemo(() => splitTokens(query), [query])
  const results = useMemo(
    () => (tokens.length ? searchSite(query) : suggestions),
    [query, tokens.length]
  )

  const openPanel = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    setQuery('')
    setActive(0)
    setPhase('open')
  }, [])

  const close = useCallback(() => {
    setPhase((prev) => (prev === 'open' ? 'closing' : prev))
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      setPhase('closed')
      triggerRef.current?.focus({ preventScroll: true })
    }, CLOSE_MS)
  }, [])

  const jump = useCallback(
    (item: SearchItem) => {
      setPhase('closing')
      window.clearTimeout(closeTimer.current)
      closeTimer.current = window.setTimeout(() => {
        setPhase('closed')
        const hashAt = item.path.indexOf('#')
        if (hashAt < 0) {
          if (location.pathname === item.path) scrollTo(0, { duration: 1.1 })
          else navigate(item.path)
          return
        }
        const target = item.path.slice(hashAt + 1)
        if (location.pathname === '/') window.setTimeout(() => scrollToSection(target), 160)
        else navigate(`/#${target}`)
      }, CLOSE_MS)
    },
    [location.pathname, navigate]
  )

  /* ⌘K / Ctrl+K 随时唤起 */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (phase === 'closed') openPanel()
        else close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, openPanel, phase])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  /* 面板打开期间锁住页面滚动，收起动画结束后再放开 */
  useEffect(() => {
    if (!mounted) return undefined
    lockScroll()
    return () => unlockScroll()
  }, [mounted])

  useEffect(() => {
    if (phase !== 'open') return undefined
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [phase])

  /* 键盘上下切换时，让当前行留在可视区内 */
  useEffect(() => {
    if (!mounted) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active, mounted])

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((prev) => (results.length ? (prev + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0))
    } else if (event.key === 'Enter') {
      const item = results[active]
      if (item) jump(item)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  function highlight(text: string) {
    if (!tokens.length) return text
    const pattern = tokens.map(escapeRegExp).join('|')
    const parts = text.split(new RegExp(`(${pattern})`, 'gi'))
    return parts.map((part, index) =>
      index % 2 === 1 ? <mark key={index}>{part}</mark> : part
    )
  }

  const shortcut = isMac ? '⌘ K' : 'Ctrl K'

  return (
    <>
      <button
        ref={triggerRef}
        className="search-trigger"
        type="button"
        aria-label={`搜索全站（${shortcut}）`}
        aria-haspopup="dialog"
        aria-expanded={mounted}
        onClick={openPanel}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
          <path d="m15.6 15.6 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="search-trigger__label">搜索</span>
        <span className="search-trigger__kbd mono">{shortcut}</span>
      </button>

      {mounted
        ? createPortal(
            <div
              className={`search${phase === 'closing' ? ' is-closing' : ' is-open'}`}
              role="dialog"
              aria-modal="true"
              aria-label="全站搜索"
            >
              <button
                className="search__backdrop"
                type="button"
                tabIndex={-1}
                aria-label="关闭搜索"
                onClick={close}
              />

              <div className="search__panel">
                <div className="search__bar">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
                    <path
                      d="m15.6 15.6 4 4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    ref={inputRef}
                    className="search__input"
                    type="text"
                    value={query}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="搜索页面、作品、手记、更新…"
                    aria-label="搜索关键词"
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setActive(0)
                    }}
                    onKeyDown={onInputKey}
                  />
                  <button className="search__esc mono" type="button" onClick={close}>
                    ESC
                  </button>
                </div>

                <div className="search__body" ref={listRef} data-lenis-prevent>
                  {!tokens.length ? <p className="search__group mono">快速前往</p> : null}

                  {results.length ? (
                    results.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        data-row={index}
                        className={`search__row${index === active ? ' is-active' : ''}`}
                        style={{ animationDelay: `${Math.min(index, 8) * 22}ms` }}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => jump(item)}
                      >
                        <span className="search__kind mono">{item.label}</span>
                        <span className="search__title">{highlight(item.title)}</span>
                        <span className="search__meta mono">{item.meta}</span>
                      </button>
                    ))
                  ) : (
                    <div className="search__empty">
                      <p className="search__empty-title">没有找到「{query.trim()}」</p>
                      <p className="search__empty-note">
                        换个关键词试试，比如「幂等」「企业系统」「更新」「证书」。
                      </p>
                    </div>
                  )}
                </div>

                <div className="search__foot mono">
                  <span>
                    <b>↑↓</b> 选择 · <b>↵</b> 打开 · <b>ESC</b> 关闭
                  </span>
                  <span>{tokens.length ? `共 ${results.length} 条` : '输入关键词开始搜索'}</span>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
