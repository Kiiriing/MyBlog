import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { useUi } from '../store/ui'
import { useI18n } from '../store/i18n'
import { site } from '../data/site'
import StrokeText from './StrokeText'
import TextType from './TextType'
import LetterGlitch from './LetterGlitch'
import '../styles/components/HeroSection.css'

/* 自述段落：改用打字机逐字出现，文案由站点主人自述 */
const HERO_INTRO =
  '我相信好的网页不是把所有东西都加上去，而是在复杂度里找到最清晰的那条路径。我从前端、API 与数据库之间工作，关心一次加载、一个边界条件、和每一处不该让用户等待的地方。它们让复杂系统重新变得简单、可信。'

const HERO_INTRO_EN =
  'I believe a good website is not about adding everything, but finding the clearest path through complexity. I work between the front end, APIs and databases, caring about each load, each edge case, and every place a user should not have to wait. Those details make complex systems feel simple and trustworthy again.'

/* WebGL 抖动之幕按需加载：首屏不进入主包，所有断点都渲染（窄屏改为下方居中展示） */
const DitherVeil = lazy(() => import('./DitherVeil'))

/* 开场只在整页加载后播一次：站内从别的页面返回首页时直接呈现完成态。
   200px 描边 SVG 的逐字勾画 + 逐字打字都很吃渲染，重新播放正好压在
   路由幕布揭开的那几帧上，看起来就是首页卡顿。 */
let heroIntroPlayed = false

export default function HeroSection() {
  const ui = useUi()
  const { t, isZh } = useI18n()
  const intro = isZh ? HERO_INTRO : HERO_INTRO_EN
  const hero = useRef<HTMLElement>(null)

  const playIntro = useRef(!heroIntroPlayed).current
  const [ready, setReady] = useState(!playIntro)

  const timeline = useRef<gsap.core.Timeline | null>(null)

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
      /* 离场时让字符场一起「沉下去」：背景先退，文字与展示图后走，形成一次镜头拉开 */
      scrollTween.to(q('.hero__glitch'), { yPercent: -14, opacity: 0.18, ease: 'none' }, 0)
      scrollTween.to(q('.hero__ambient'), { yPercent: -8, ease: 'none' }, 0)
      scrollTween.to(q('.hero__veil'), { yPercent: -6, ease: 'none' }, 0)

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
    if (!ui.introDone || !el) return

    const q = gsap.utils.selector(el) as (selector: string) => HTMLElement[]

    /* 站内返回：直接落到开场结束的状态（CSS 里这些元素初始 opacity 为 0） */
    if (!playIntro || heroIntroPlayed) {
      gsap.set(q('.hero__title'), { opacity: 1 })
      gsap.set(q('.hero__kicker'), { opacity: 1, y: 0 })
      gsap.set(q('.hero-fade'), { opacity: 1, y: 0 })
      return
    }

    heroIntroPlayed = true
    setReady(true)

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
  }, [ui.introDone, playIntro])

  /* Pointer depth --------------------------------------------------------- */

  useEffect(() => {
    const el = hero.current
    if (!el || prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const lines = Array.from(el.querySelectorAll<HTMLElement>('.hero__line'))
    const veil = el.querySelector<HTMLElement>('.hero__veil-inner')
    if (!lines.length && !veil) return

    const lineX = lines.map((line) =>
      gsap.quickTo(line, 'x', { duration: 0.9, ease: 'power3.out' })
    )
    const lineY = lines.map((line) =>
      gsap.quickTo(line, 'y', { duration: 0.9, ease: 'power3.out' })
    )
    const veilX = veil ? gsap.quickTo(veil, 'x', { duration: 1.1, ease: 'power3.out' }) : null
    const veilY = veil ? gsap.quickTo(veil, 'y', { duration: 1.1, ease: 'power3.out' }) : null

    /* 标题与展示图反向位移：指针一动，前后景各自错开，画面就有了厚度 */
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / rect.width - 0.5
      const ny = (event.clientY - rect.top) / rect.height - 0.5

      lines.forEach((_, index) => {
        lineX[index](-nx * (10 + index * 5))
        lineY[index](-ny * 6)
      })
      veilX?.(nx * 18)
      veilY?.(ny * 12)
    }

    const reset = () => {
      lines.forEach((_, index) => {
        lineX[index](0)
        lineY[index](0)
      })
      veilX?.(0)
      veilY?.(0)
    }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', reset)

    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', reset)
      gsap.killTweensOf([...lines, veil].filter(Boolean))
    }
  }, [])

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
                start={playIntro && ready}
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
                start={playIntro && ready}
              />
            </span>
          </h1>

          <div className="hero__sub">
            <p className="hero__cn hero-fade">
              {t(
                site.intro,
                'Full-stack developer in Beijing. Building interfaces, APIs and the systems behind them.'
              )}
            </p>
            <p className="hero__desc hero-fade">
              {/* ghost 预留整段文字的高度，打字过程中段落与下方技术栈不跳动 */}
              <span className="hero__desc-ghost" aria-hidden="true">
                {intro}
              </span>
              <TextType
                as="span"
                className="hero__desc-type"
                text={intro}
                start={ready}
                instant={!playIntro}
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
          <div className="hero__veil-inner">
            <Suspense fallback={null}>
              <DitherVeil src="/art/chrome-head.png" fit="contain" inkColor="#08080a" />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="hero__bottom shell">
        {/* 左下角原本的 Scroll to explore 提示位，改由常驻的黑胶播放器占据 */}
        <div className="hero__bottom-meta hero-fade">
          <span className="mono">Beijing, CN</span>
          <span className="mono">{site.coords}</span>
        </div>

        <button
          className="scroll-badge hero-fade"
          type="button"
          aria-label={t('向下滚动至自述', 'Scroll down to the introduction')}
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
