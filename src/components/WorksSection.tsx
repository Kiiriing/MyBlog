import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  getLenis,
  prefersReducedMotion,
  scrollTo,
  scrollToSection
} from '../composables/useSmoothScroll'
import { works } from '../data/works'
import ArtworkFrame from './ArtworkFrame'
import { useReveal } from '../hooks/useReveal'
import { useI18n } from '../store/i18n'
import '../styles/components/WorksSection.css'

function RevealCard({
  delay,
  className = 'work-card',
  children
}: {
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  const ref = useReveal<HTMLElement>({ delay })
  return (
    <article ref={ref} className={className}>
      {children}
    </article>
  )
}

export default function WorksSection() {
  const { t } = useI18n()
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)

  const counterEl = useRef<HTMLSpanElement>(null)
  const prevBtn = useRef<HTMLButtonElement>(null)
  const nextBtn = useRef<HTMLButtonElement>(null)
  const progressEl = useRef<HTMLSpanElement>(null)
  const nowEl = useRef<HTMLSpanElement>(null)

  const maxX = useRef(0)
  const indexRef = useRef(1)
  const trackTween = useRef<gsap.core.Tween | null>(null)
  const resizeTimer = useRef(0)
  const dragging = useRef(false)
  const didDrag = useRef(false)
  const startX = useRef(0)
  const startScroll = useRef(0)

  const totalCount = String(works.length).padStart(2, '0')

  function measure() {
    if (!section.current || !track.current || !viewport.current) return
    const vh = window.innerHeight
    maxX.current = Math.max(0, track.current.scrollWidth - viewport.current.clientWidth)
    section.current.style.height = `${vh + maxX.current}px`
  }

  function applyProgress(p: number) {
    const total = works.length
    const index =
      p >= 0.995 ? total : Math.min(total, Math.max(1, Math.floor(p * total) + 1))
    indexRef.current = index

    if (counterEl.current) counterEl.current.textContent = String(index).padStart(2, '0')
    if (progressEl.current) progressEl.current.style.transform = `scaleX(${p})`
    if (prevBtn.current) prevBtn.current.disabled = p <= 0.015
    if (nextBtn.current) nextBtn.current.disabled = p >= 0.985
    if (nowEl.current) nowEl.current.textContent = `Now viewing — ${works[index - 1].title}`
  }

  function createScrollMotion() {
    trackTween.current?.scrollTrigger?.kill()
    trackTween.current?.kill()

    if (!track.current) return

    gsap.set(track.current, { x: 0 })
    applyProgress(0)

    trackTween.current = gsap.to(track.current, {
      x: () => -maxX.current,
      ease: 'none',
      scrollTrigger: {
        trigger: section.current,
        start: 'top top',
        end: () => `+=${maxX.current}`,
        scrub: prefersReducedMotion() ? true : 0.55,
        invalidateOnRefresh: true,
        onUpdate: (self: ScrollTrigger) => {
          applyProgress(self.progress)
        }
      }
    })
  }

  function setup() {
    measure()
    createScrollMotion()
    ScrollTrigger.refresh()
  }

  function onResize() {
    window.clearTimeout(resizeTimer.current)
    resizeTimer.current = window.setTimeout(() => {
      setup()
    }, 180)
  }

  function goToCard(index: number) {
    if (!track.current || !section.current) return
    const cards = Array.from(track.current.querySelectorAll<HTMLElement>('.work-card'))
    const target = cards[Math.min(cards.length - 1, Math.max(0, index - 1))]
    if (!target) return

    const pad = parseFloat(window.getComputedStyle(track.current).paddingLeft || '0')
    const offset = Math.min(maxX.current, Math.max(0, target.offsetLeft - pad))
    scrollTo(section.current.offsetTop + offset, { duration: 1.1 })
  }

  function step(direction: number) {
    const next = indexRef.current + direction
    if (next < 1 || next > works.length) return
    goToCard(next)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    dragging.current = true
    didDrag.current = false
    startX.current = event.clientX
    startScroll.current = window.scrollY
    viewport.current?.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const delta = event.clientX - startX.current
    if (!didDrag.current && Math.abs(delta) < 5) return
    didDrag.current = true
    event.preventDefault()

    if (!section.current) return
    const min = section.current.offsetTop
    const max = section.current.offsetTop + maxX.current
    const target = Math.min(max, Math.max(min, startScroll.current - delta * 1.65))
    const lenis = getLenis()

    if (lenis) lenis.scrollTo(target, { immediate: true, force: true })
    else window.scrollTo(0, target)
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    dragging.current = false
    viewport.current?.releasePointerCapture?.(event.pointerId)
    window.setTimeout(() => {
      didDrag.current = false
    }, 20)
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!didDrag.current) return
    event.preventDefault()
    event.stopPropagation()
    didDrag.current = false
  }

  function onCardMove(event: React.PointerEvent<HTMLAnchorElement>) {
    if (window.matchMedia('(hover: none)').matches || dragging.current) return
    const visual = event.currentTarget.querySelector<HTMLElement>('.work-card__visual')
    if (!visual) return
    const rect = visual.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    gsap.to(visual, {
      rotationY: x * 6,
      rotationX: y * -5,
      transformPerspective: 900,
      duration: 0.65,
      ease: 'power3.out'
    })
  }

  function onCardLeave(event: React.PointerEvent<HTMLAnchorElement>) {
    const visual = event.currentTarget.querySelector<HTMLElement>('.work-card__visual')
    if (!visual) return
    gsap.to(visual, {
      rotationY: 0,
      rotationX: 0,
      duration: 0.9,
      ease: 'power3.out'
    })
  }

  useEffect(() => {
    let cancelled = false

    setup()

    ;(async () => {
      try {
        await document.fonts?.ready
      } catch {
        // fonts are optional
      }
      if (!cancelled) setup()
    })()

    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelled = true
      window.clearTimeout(resizeTimer.current)
      window.removeEventListener('resize', onResize)
      trackTween.current?.scrollTrigger?.kill()
      trackTween.current?.kill()
    }
  }, [])

  return (
    <section
      id="work"
      ref={section}
      className="works"
      data-section="04"
      data-label="Work"
      style={{ '--work-count': works.length } as React.CSSProperties}
    >
      {/* 缓慢游走的暖光与冷光：暗场上唯一持续呼吸的东西，把整幕串在一起 */}
      <div className="works__ambient" aria-hidden="true" />

      <div className="works__sticky">
        <header className="works__head shell">
          <div className="works__head-left">
            <span className="eyebrow">04 / Selected Work</span>
            <h2 className="works__title">
              <span>Selected</span>
              <em>work.</em>
            </h2>
          </div>

          <div className="works__head-right">
            <p className="works__intro">
              {t(
                '四个真正交付过的项目：企业管理系统、签到考勤、20 余张数据大屏与校企协作。 界面、接口、数据库与部署，都是同一条链路。',
                'Four projects that actually shipped: enterprise management, attendance tracking, 20+ data walls and university collaboration. Interface, API, database and deployment are all one chain.'
              )}
            </p>

            <div className="works__controls">
              <div className="works__counter mono">
                <span ref={counterEl}>01</span>
                <span className="works__counter-total">/ 0{works.length}</span>
              </div>
              <Link to="/work" className="works__all mono" data-cursor="Index">
                <span>{t('全部项目', 'All projects')}</span>
                <span className="works__all-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <div className="works__arrows">
                <button
                  ref={prevBtn}
                  className="works__arrow"
                  type="button"
                  aria-label={t('上一个项目', 'Previous project')}
                  disabled
                  onClick={() => step(-1)}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </button>
                <button
                  ref={nextBtn}
                  className="works__arrow"
                  type="button"
                  aria-label={t('下一个项目', 'Next project')}
                  onClick={() => step(1)}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div
          ref={viewport}
          className="works__viewport"
          data-cursor="Drag"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
        >
          <div ref={track} className="works__track">
            {works.map((work, index) => (
              <RevealCard key={work.slug} delay={index * 60}>
                <Link
                  to={`/work/${work.slug}`}
                  className="work-card__link"
                  aria-label={t(`查看项目 ${work.title}`, `View project ${work.title}`)}
                  data-cursor="View"
                  onPointerMove={onCardMove}
                  onPointerLeave={onCardLeave}
                >
                  <div className="work-card__visual">
                    <ArtworkFrame src={work.art} alt={t(`${work.title} 项目视觉`, `${work.title} project visual`)} ratio="4 / 5" parallax={4} />
                    <div className="work-card__top mono">
                      <span>
                        #{work.index} / {totalCount}
                      </span>
                      <span>{work.year}</span>
                    </div>
                    <span className="work-card__view">
                      <span className="mono">{t('查看项目', 'View project')}</span>
                      <span className="work-card__view-icon" aria-hidden="true">
                        ↗
                      </span>
                    </span>
                  </div>

                  <div className="work-card__meta">
                    <div className="work-card__names">
                      <h3 className="work-card__title">{work.title}</h3>
                      <span className="work-card__cn">{work.cn}</span>
                    </div>
                    <div className="work-card__tags">
                      <span className="work-card__category mono">
                        {work.category.split(' / ')[0]}
                      </span>
                      <span className="work-card__stack mono">
                        {work.stack?.slice(0, 2).join(' · ')}
                      </span>
                    </div>
                  </div>
                </Link>
              </RevealCard>
            ))}

            <RevealCard className="work-card work-card--end" delay={works.length * 60}>
              <div className="work-end">
                <span className="mono work-end__no">
                  {works.length} → {works.length + 1}
                </span>
                <h3 className="work-end__title">
                  Have a project
                  <em>in mind?</em>
                </h3>
                <p className="work-end__copy">
                  {t(
                    '现在开放 2026 年的实习与全栈岗位机会。无论是从零开始的产品， 还是需要有人把前后端一起推进的项目，都可以聊聊。',
                    'Open to internships and full-stack roles in 2026. Whether it is a product starting from zero or a project that needs someone to push the front end and back end together, let’s talk.'
                  )}
                </p>
                <button
                  className="work-end__cta"
                  type="button"
                  data-cursor="Talk"
                  onClick={() => scrollToSection('contact')}
                >
                  <span>{t('开始一段对话', 'Start a conversation')}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </RevealCard>
          </div>
        </div>

        <footer className="works__foot shell">
          <div className="works__progress" aria-hidden="true">
            <span ref={progressEl} />
          </div>
          <div className="works__foot-meta">
            <span className="mono works__hint">Scroll / drag to explore</span>
            <span ref={nowEl} className="mono works__now">
              Now viewing — {works[0].title}
            </span>
            <span className="mono works__foot-year">© 2024—2026</span>
          </div>
        </footer>
      </div>
    </section>
  )
}
