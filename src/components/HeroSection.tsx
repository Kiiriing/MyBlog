import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { gsap, SplitText } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { useUi } from '../store/ui'
import { site } from '../data/site'
import '../styles/components/HeroSection.css'

/* WebGL 抖动之幕按需加载：首屏不进入主包，所有断点都渲染（窄屏改为下方居中展示） */
const DitherVeil = lazy(() => import('./DitherVeil'))

export default function HeroSection() {
  const ui = useUi()
  const hero = useRef<HTMLElement>(null)
  const title = useRef<HTMLHeadingElement>(null)

  const [ready, setReady] = useState(false)

  const splits = useRef<any[]>([])
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const hasPlayed = useRef(false)

  /* Scroll ---------------------------------------------------------------- */

  useEffect(() => {
    const el = hero.current
    if (!el) return

    const q = gsap.utils.selector(el) as (selector: string) => HTMLElement[]

    if (!prefersReducedMotion()) {
      const lines = title.current?.querySelectorAll('.hero__line-inner')
      if (lines?.length) {
        splits.current = Array.from(lines).map(
          (line) =>
            new SplitText(line, {
              type: 'chars',
              charsClass: 'hero-char'
            })
        )
        gsap.set(q('.hero__title'), { opacity: 0 })
        const chars = splits.current.flatMap((split) => split.chars)
        gsap.set(chars, { yPercent: 125, opacity: 0, rotate: 5 })
      }
    }

    let scrollTween: gsap.core.Timeline | null = null
    let bottomTween: gsap.core.Tween | null = null

    if (!prefersReducedMotion()) {
      scrollTween = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      })
      scrollTween.to(q('.hero__lead'), { yPercent: -5, ease: 'none' }, 0)

      bottomTween = gsap.to(q('.hero__bottom'), {
        yPercent: -14,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '65% top',
          scrub: true
        }
      })
    }

    return () => {
      timeline.current?.kill()
      scrollTween?.scrollTrigger?.kill()
      scrollTween?.kill()
      bottomTween?.scrollTrigger?.kill()
      bottomTween?.kill()
      splits.current.forEach((split) => split.revert())
      splits.current = []
    }
  }, [])

  /* Intro ----------------------------------------------------------------- */

  useEffect(() => {
    const el = hero.current
    if (!ui.introDone || hasPlayed.current || !el) return

    hasPlayed.current = true
    setReady(true)

    const q = gsap.utils.selector(el) as (selector: string) => HTMLElement[]

    if (prefersReducedMotion()) {
      gsap.set(q('.hero__title'), { opacity: 1 })
      gsap.set(q('.hero__kicker'), { opacity: 1, y: 0 })
      gsap.set(q('.hero-fade'), { opacity: 1, y: 0 })
      return
    }

    const chars = splits.current.flatMap((split) => split.chars)

    gsap.set(q('.hero__title'), { opacity: 1 })
    gsap.set(q('.hero-fade'), { opacity: 0, y: 24 })

    const tl = gsap.timeline({ delay: 0.08 })
    timeline.current = tl
    tl.to(chars, {
      yPercent: 0,
      opacity: 1,
      rotate: 0,
      duration: 1.35,
      ease: 'expo.out',
      stagger: {
        each: 0.028,
        from: 'start'
      }
    })
    tl.to(q('.hero__kicker'), { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=1')
    tl.to(
      q('.hero-fade'),
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.12
      },
      '-=0.8'
    )
  }, [ui.introDone])

  return (
    <section
      id="index"
      ref={hero}
      className={`hero${ready ? ' is-ready' : ''}`}
      data-section="01"
      data-label="Index"
    >
      <div className="hero__ambient" aria-hidden="true" />
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="hero__top shell">
        <div className="hero__edition">
          <span className="mono">Portfolio / Vol. 06</span>
          <span className="mono">2024 — 2026</span>
        </div>
        <span className="hero__top-note mono">Index / 01 — Full-stack</span>
      </div>

      <div className="hero__body shell">
        <div className="hero__lead">
          <p className="hero__kicker">Full-stack Web Developer</p>

          <h1 ref={title} className="hero__title">
            <span className="hero__line">
              <span className="hero__line-inner hero__line-inner--one">Full-stack</span>
            </span>
            <span className="hero__line hero__line--two">
              <span className="hero__line-inner hero__line-inner--two">in production.</span>
            </span>
          </h1>

          <div className="hero__sub">
            <p className="hero__cn hero-fade">{site.intro}</p>
            <p className="hero__desc hero-fade">
              在读全栈开发者。2024 年起在校内工作室写接口，2025 年成为合作企业管理系统的技术负责人：
              NestJS + PostgreSQL + Redis 的服务端，Vue / React 的界面，一个人把需求推到上线。
            </p>
            <p className="hero__stack hero-fade mono">
              {site.stack.map((tech, index) => (
                <span key={tech}>
                  {tech}
                  {index < site.stack.length - 1 ? <span className="hero__stack-sep"> / </span> : null}
                </span>
              ))}
            </p>
          </div>
        </div>

        <div className="hero__veil hero-fade" aria-hidden="true">
          <Suspense fallback={null}>
            <DitherVeil src="/art/chrome-head.png" fit="contain" inkColor="#08080a" />
          </Suspense>
        </div>
      </div>

      <div className="hero__bottom shell">
        <div className="hero__scroll-hint hero-fade">
          <span className="hero__scroll-line" />
          <span className="mono">Scroll to explore</span>
        </div>

        <div className="hero__bottom-meta hero-fade">
          <span className="mono">Beijing, CN</span>
          <span className="mono">{site.coords}</span>
        </div>

        <button
          className="scroll-badge hero-fade"
          type="button"
          aria-label="向下滚动至自述"
          data-cursor="Scroll"
          onClick={() => scrollToSection('manifesto')}
        >
          <svg className="scroll-badge__ring" viewBox="0 0 140 140" aria-hidden="true">
            <defs>
              <path id="scroll-circle" d="M70,70 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0" />
            </defs>
            <text>
              <textPath href="#scroll-circle">
                SCROLL TO EXPLORE · SCROLL TO EXPLORE ·
              </textPath>
            </text>
          </svg>
          <span className="scroll-badge__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16M6 14l6 6 6-6" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          </span>
        </button>
      </div>

      <div className="hero__edge hero-fade" aria-hidden="true">
        <span className="mono">Building for the open web</span>
      </div>
    </section>
  )
}
