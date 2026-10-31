import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { scrollTo, prefersReducedMotion } from '../composables/useSmoothScroll'
import { useClock } from '../hooks/useClock'
import { site } from '../data/site'
import CircleButton from './CircleButton'
import '../styles/components/SiteFooter.css'

export default function SiteFooter() {
  const clock = useClock()
  const footer = useRef<HTMLElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  const quick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null)

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const resetTimer = useRef(0)

  const status = error
    ? error
    : subscribed
      ? '已收到 — 下一封构建手记正在写。'
      : '每月一至两封，关于构建与工程。'

  useEffect(() => {
    if (!footer.current || !glow.current) return
    if (prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const x = gsap.quickTo(glow.current, 'x', { duration: 0.9, ease: 'power3.out' })
    const y = gsap.quickTo(glow.current, 'y', { duration: 0.9, ease: 'power3.out' })
    quick.current = { x, y }

    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current)
      gsap.killTweensOf(glow.current)
      quick.current = null
    }
  }, [])

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const q = quick.current
    if (!q || !footer.current) return
    const rect = footer.current.getBoundingClientRect()
    q.x((event.clientX - rect.left - rect.width / 2) * 0.42)
    q.y((event.clientY - rect.top - rect.height / 2) * 0.42)
  }

  function onPointerLeave() {
    quick.current?.x(0)
    quick.current?.y(0)
  }

  function subscribe(event: React.FormEvent) {
    event.preventDefault()
    if (resetTimer.current) window.clearTimeout(resetTimer.current)

    const value = email.trim()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)

    if (!valid) {
      setSubscribed(false)
      setError('请留下一个有效的邮箱地址。')
      return
    }

    setError('')
    setSubscribed(true)
    setEmail('')
    resetTimer.current = window.setTimeout(() => {
      setSubscribed(false)
    }, 5600)
  }

  function backToTop() {
    scrollTo(0, { duration: 1.25 })
  }

  return (
    <footer
      id="contact"
      ref={footer}
      className="site-footer"
      data-section="08"
      data-label="Contact"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div ref={glow} className="site-footer__glow" aria-hidden="true" />
      <div className="site-footer__grid-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="shell site-footer__inner">
        <header className="site-footer__head">
          <span className="eyebrow">08 / Contact · 联系</span>
          <span className="site-footer__status mono">
            <span className="dot" />
            {site.availability}
          </span>
        </header>

        <div className="site-footer__hero">
          <h2 className="site-footer__title">
            <span className="site-footer__line">Let’s make</span>
            <span className="site-footer__line site-footer__line--indent">
              <em>it work, beautifully.</em>
            </span>
          </h2>

          <div className="site-footer__hero-side">
            <p className="site-footer__cn">
              如果你有一个想认真做的产品，或者需要有人把前后端 一起推进，欢迎写信给我。
            </p>
            <span className="site-footer__reply mono">Usually replies within 48 hours</span>
          </div>
        </div>

        <a className="site-footer__email" href={`mailto:${site.email}`} data-cursor="Write">
          <span className="site-footer__email-text">{site.email}</span>
          <span className="site-footer__email-arrow" aria-hidden="true">
            ↗
          </span>
        </a>

        <div className="site-footer__columns">
          <div className="site-footer__col site-footer__col--news">
            <span className="site-footer__label mono">Newsletter / 构建手记</span>
            <form className="site-footer__form" noValidate onSubmit={subscribe}>
              <label className="sr-only" htmlFor="footer-email">
                邮箱地址
              </label>
              <div className="field site-footer__field">
                <input
                  id="footer-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  aria-invalid={!!error}
                  aria-describedby="newsletter-status"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError('')
                  }}
                />
                <button
                  className="site-footer__submit"
                  type="submit"
                  aria-label="订阅来信"
                  data-cursor="Send"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </button>
              </div>
              <p
                id="newsletter-status"
                className={[
                  'site-footer__form-note mono',
                  error ? 'is-error' : '',
                  subscribed ? 'is-ok' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-live="polite"
              >
                {status}
              </p>
            </form>
          </div>

          <div className="site-footer__col">
            <span className="site-footer__label mono">Elsewhere / 别处</span>
            <ul className="site-footer__socials">
              {site.socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    className="site-footer__social"
                    target="_blank"
                    rel="noreferrer"
                    data-cursor={social.label}
                  >
                    <span>{social.label}</span>
                    <span className="site-footer__social-handle">{social.handle}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__col site-footer__col--clock">
            <span className="site-footer__label mono">Local time / 此刻</span>
            <p className="site-footer__clock">{clock}</p>
            <div className="site-footer__place mono">
              <span>{site.location}</span>
              <span>{site.coords}</span>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p className="mono">© 2026 LU YU — All systems operational</p>
          <p className="mono site-footer__built">Designed &amp; coded with React, GSAP &amp; Vite</p>
          <CircleButton
            label="Back to top"
            direction="up"
            size={52}
            cursor="Top"
            className="site-footer__top"
            onClick={backToTop}
          />
        </div>
      </div>
    </footer>
  )
}
