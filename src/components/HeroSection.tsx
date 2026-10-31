import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { useUi } from '../store/ui'
import { site } from '../data/site'
import StrokeText from './StrokeText'
import TextType from './TextType'
import LetterGlitch from './LetterGlitch'
import '../styles/components/HeroSection.css'

/* 自述段落：改用打字机逐字出现，文案由站点主人自述 */
const HERO_INTRO =
  '我相信好的网页不是把所有东西都加上去，而是在复杂度里找到最清晰的那条路径。我从前端、API 与数据库之间工作，关心一次加载、一个边界条件、和每一处不该让用户等待的地方。它们让复杂系统重新变得简单、可信。'

/* WebGL 抖动之幕按需加载：首屏不进入主包，所有断点都渲染（窄屏改为下方居中展示） */
const DitherVeil = lazy(() => import('./DitherVeil'))

export default function HeroSection() {
  const ui = useUi()
  const hero = useRef<HTMLElement>(null)

  const [ready, setReady] = useState(false)

  const timeline = useRef<gsap.core.Timeline | null>(null)
  const hasPlayed = useRef(false)

  /* Scroll ---------------------------------------------------------------- */

  useEffect(() => {
    const el = hero.current
    if (!el) return

    const q = gsap.utils.selector(el) as (selector: string) => HTMLElement[]

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

    gsap.set(q('.hero__title'), { opacity: 1 })
    gsap.set(q('.hero-fade'), { opacity: 0, y: 24 })

    const tl = gsap.timeline({ delay: 0.08 })
    timeline.current = tl
    tl.to(q('.hero__kicker'), { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
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
      {/* 首屏背景：React Bits LetterGlitch，整屏铺满的字符故障场 */}
      <div className="hero__glitch" aria-hidden="true">
        <LetterGlitch />
      </div>
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

          <h1 className="hero__title">
            {/* 描边先被画笔勾出，再由左向右擦除出实心字形。
                StrokeText 以 200px 为绘制基准，外部按 --line-size 等比缩放；
                letter-spacing 为 -0.055em，颜色对应 --accent / --paper */}
            <span className="hero__line">
              <StrokeText
                text="Welcome"
                fontFamily="var(--font-serif)"
                fontSize={200}
                fontWeight={400}
                letterSpacing={-11}
                strokeWidth={2}
                strokeColor="#ff5a2f"
                fillColor="#efe8db"
                start={ready}
              />
            </span>
            <span className="hero__line hero__line--two">
              <StrokeText
                text="Personal Blog"
                fontFamily="var(--font-serif)"
                fontSize={200}
                fontWeight={400}
                letterSpacing={-11}
                strokeWidth={2}
                strokeColor="#ff5a2f"
                fillColor="#efe8db"
                start={ready}
              />
            </span>
          </h1>

          <div className="hero__sub">
            <p className="hero__cn hero-fade">{site.intro}</p>
            <p className="hero__desc hero-fade">
              {/* ghost 预留整段文字的高度，打字过程中段落与下方技术栈不跳动 */}
              <span className="hero__desc-ghost" aria-hidden="true">
                {HERO_INTRO}
              </span>
              <TextType
                as="span"
                className="hero__desc-type"
                text={HERO_INTRO}
                start={ready}
                loop={false}
                typingSpeed={26}
              />
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
