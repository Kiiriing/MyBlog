import { useEffect, useMemo, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import { capabilities, stats } from '../data/profile'
import { techStack } from '../data/stack'
import ArtworkFrame from './ArtworkFrame'
import LogoLoop from './LogoLoop'
import { useReveal } from '../hooks/useReveal'
import '../styles/components/AboutSection.css'

export default function AboutSection() {
  const visual = useRef<HTMLDivElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  const statsEl = useRef<HTMLDivElement>(null)

  const quick = useRef<{
    rotateX: (v: number) => void
    rotateY: (v: number) => void
    glowX: (v: number) => void
    glowY: (v: number) => void
  } | null>(null)

  const titleLine1 = useReveal<HTMLSpanElement>()
  const titleLine2 = useReveal<HTMLSpanElement>({ delay: 90 })
  const cnRef = useReveal<HTMLParagraphElement>({ delay: 160 })
  const copy1 = useReveal<HTMLParagraphElement>()
  const copy2 = useReveal<HTMLParagraphElement>({ delay: 70 })
  const capRef = useReveal<HTMLDivElement>()
  const statsReveal = useReveal<HTMLDivElement>()
  const availability = useReveal<HTMLDivElement>()

  /* 技术栈长条：直接用品牌图标，悬停时停下、恢复原色并显示「名称 · 分类」 */
  const stackLogos = useMemo(
    () =>
      techStack.map((tech) => ({
        src: tech.icon,
        alt: tech.name,
        title: `${tech.name} · ${tech.group}`,
        width: 512,
        height: 512
      })),
    []
  )

  /* Tilt ----------------------------------------------------------------- */

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return
    const tilt = visual.current?.querySelector('.about__tilt')
    if (!tilt) return

    const rotateX = gsap.quickTo(tilt, 'rotationX', { duration: 0.6, ease: 'power3.out' })
    const rotateY = gsap.quickTo(tilt, 'rotationY', { duration: 0.6, ease: 'power3.out' })
    const glowX = gsap.quickTo(glow.current, 'x', { duration: 0.7, ease: 'power3.out' })
    const glowY = gsap.quickTo(glow.current, 'y', { duration: 0.7, ease: 'power3.out' })
    quick.current = { rotateX, rotateY, glowX, glowY }

    return () => {
      quick.current = null
      gsap.killTweensOf([tilt, glow.current])
    }
  }, [])

  function onVisualMove(event: React.PointerEvent<HTMLDivElement>) {
    const q = quick.current
    if (!q || !visual.current) return
    const rect = visual.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    q.rotateY(x * 7)
    q.rotateX(y * -6)
    q.glowX(x * rect.width * 0.55)
    q.glowY(y * rect.height * 0.55)
  }

  function onVisualLeave() {
    const q = quick.current
    if (!q) return
    q.rotateX(0)
    q.rotateY(0)
    q.glowX(0)
    q.glowY(0)
  }

  /* Stats ---------------------------------------------------------------- */

  useEffect(() => {
    if (prefersReducedMotion()) return

    const numbers = Array.from(statsEl.current?.querySelectorAll<HTMLElement>('[data-stat]') || [])

    const trigger = ScrollTrigger.create({
      trigger: statsEl.current,
      start: 'top 86%',
      once: true,
      onEnter: () => {
        stats.forEach((stat, index) => {
          const el = numbers[index]
          if (!el) return
          const counter = { value: 0 }
          gsap.to(counter, {
            value: stat.value,
            duration: 1.7,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = `${Math.round(counter.value)}${stat.suffix}`
            }
          })
        })
      }
    })

    return () => {
      trigger.kill()
      gsap.killTweensOf(numbers)
    }
  }, [])

  return (
    <section id="about" className="about" data-section="03" data-label="About">
      <div className="about__ambient" aria-hidden="true" />

      <div className="shell">
        <div className="about__head">
          <span className="eyebrow">03 / About · 关于</span>
          <div className="about__head-note mono">
            <span>Beijing, CN</span>
            <span>Working everywhere</span>
          </div>
        </div>

        <div className="about__grid">
          <div className="about__visual-col">
            <div
              ref={visual}
              className="about__visual"
              onPointerMove={onVisualMove}
              onPointerLeave={onVisualLeave}
            >
              <div ref={glow} className="about__glow" aria-hidden="true" />
              <div className="about__tilt">
                <ArtworkFrame
                  src="/art/portrait.svg"
                  alt="我的抽象自画像，焦糖色的人像轮廓与橘色光晕"
                  ratio="4 / 5"
                  parallax={5}
                >
                  <span className="about__caption mono">Fig. 01 — At the desk, 2026</span>
                </ArtworkFrame>
              </div>

              <button
                className="about__badge"
                type="button"
                aria-label="联系我"
                data-cursor="Hello"
                onClick={() => scrollToSection('contact')}
              >
                <svg viewBox="0 0 140 140" aria-hidden="true">
                  <defs>
                    <path
                      id="about-circle"
                      d="M70,70 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#about-circle">
                      OPEN FOR FULL-STACK WORK · 2026 · OPEN FOR FULL-STACK WORK ·
                    </textPath>
                  </text>
                </svg>
                <span className="about__badge-star">✦</span>
              </button>
            </div>

            <div className="about__visual-meta mono">
              <span>Interface / systems / speed</span>
              <span>01 — 01</span>
            </div>
          </div>

          <div className="about__content">
            <h2 className="about__title">
              <span ref={titleLine1} className="about__title-line">
                from interface
              </span>
              <span
                ref={titleLine2}
                className="about__title-line about__title-line--italic"
              >
                to infrastructure.
              </span>
            </h2>

            <p ref={cnRef} className="about__cn">
              从界面，到基础设施。
            </p>

            <div className="about__copy">
              <p ref={copy1}>
                我是Kiiriing，一名在读的全栈开发者。2024 年起在校内工作室和校企项目里写接口，2025 年成为合作企业管理系统的技术负责人（CTO），带团队把 NestJS + PostgreSQL 的服务推进到可以对外合作的状态。
              </p>
              <p ref={copy2}>
                写过 Vue 3 也写过 React 19，从 Flask 到 NestJS，从 MySQL 到 PostgreSQL。关注接口设计、数据库索引与性能，
                也关注界面上的每一次反馈：让边界条件有答案，让每一次点击都有明确的下一步。
              </p>
            </div>

            <div ref={capRef} className="about__capabilities">
              <div className="about__cap-header mono">
                <span>Capabilities</span>
                <span>0{capabilities.length}</span>
              </div>
              <ul>
                {capabilities.map((cap) => (
                  <li key={cap.no} className="about__cap">
                    <span className="about__cap-no">{cap.no}</span>
                    <span className="about__cap-main">
                      <span className="about__cap-en">{cap.en}</span>
                      <span className="about__cap-items mono">{cap.items.join(' / ')}</span>
                    </span>
                    <span className="about__cap-cn">{cap.cn}</span>
                    <span className="about__cap-plus" aria-hidden="true">
                      +
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              ref={(node) => {
                statsReveal.current = node
                statsEl.current = node
              }}
              className="about__stats"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="about__stat">
                  <strong data-stat>
                    {stat.value}
                    {stat.suffix}
                  </strong>
                  <span className="mono">{stat.label}</span>
                </div>
              ))}
            </div>

            <div ref={availability} className="about__availability">
              <span className="dot" />
              <p>现在开放 2026 年的实习与全栈岗位机会，也接可以一起推进的小项目。</p>
              <a
                href={`mailto:${site.email}`}
                className="about__mail link-underline"
                data-cursor="Write"
              >
                Start a conversation ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="about__stack">
        <div className="about__stack-head mono">
          <span>Stack / 技术栈</span>
          <span>{techStack.length} icons · 拖动可回看</span>
        </div>
        <LogoLoop
          logos={stackLogos}
          speed={64}
          direction="left"
          logoHeight={71}
          gap={92}
          fadeOut
          fadeOutWidth={0.09}
          scaleOnHover
          labels="hover"
          muted={0.5}
          ariaLabel="技术栈"
          className="about__stack-loop"
        />
      </div>
    </section>
  )
}
