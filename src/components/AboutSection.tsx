import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import { capabilities, stats } from '../data/profile'
import { techStack } from '../data/stack'
import LogoLoop from './LogoLoop'
import { useNearViewport } from '../hooks/useNearViewport'
import { useIdleReady } from '../hooks/useIdleReady'
import { useReveal } from '../hooks/useReveal'
import { useI18n } from '../store/i18n'
import { useUi } from '../store/ui'
import '../styles/components/AboutSection.css'

const loadLanyard = () => import('./Lanyard')
const Lanyard = lazy(loadLanyard)

export default function AboutSection() {
  const { t } = useI18n()
  const statsEl = useRef<HTMLDivElement>(null)

  const titleLine1 = useReveal<HTMLSpanElement>()
  const titleLine2 = useReveal<HTMLSpanElement>({ delay: 90 })
  const cnRef = useReveal<HTMLParagraphElement>({ delay: 160 })
  const copy1 = useReveal<HTMLParagraphElement>()
  const copy2 = useReveal<HTMLParagraphElement>({ delay: 70 })
  const capRef = useReveal<HTMLDivElement>()
  const statsReveal = useReveal<HTMLDivElement>()
  const availability = useReveal<HTMLDivElement>()
  const colRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  /* 宽屏双栏时画布被拉高到与右栏同底，卡片按画布高度取比例会过大，
     因此宽屏单独收一档卡片尺寸；挂绳长度保持原值不动 */
  const [compactLanyard, setCompactLanyard] = useState(false)
  /* 吊牌在第三屏，首屏看不到：接近视口时再挂载，并等浏览器空闲，
     让建上下文、编译着色器、上传贴图都发生在滚动停下之后 */
  const [lanyardHost, lanyardNear] = useNearViewport<HTMLDivElement>('1400px 0px')
  /* 入场结束后再预热吊牌场景：把建上下文 / 编译着色器 / 上传贴图的开销
     放在用户还在看首屏时完成，滚到吊牌时只剩物理启动，低配机也不会在滚动中卡住 */
  const [lanyardWarm, setLanyardWarm] = useState(false)
  const [introSettled, setIntroSettled] = useState(false)
  const ui = useUi()
  /* 入场动画 + 首屏标题动画全部落定前不挂载：
     1400px 预取范围在大窗口下首屏就会命中，必须自己再挡一层，
     否则建 WebGL 上下文的同步长任务会直接顶掉入场动画的帧 */
  const lanyardReady = useIdleReady(introSettled && (lanyardNear || lanyardWarm))

  /* 入场动画一开始就把吊牌模块异步取回来：只下载 / 解析，不在动画里建场景。
     放进空闲回调，动画正在跑时不和它抢主线程；慢一点没关系，不顶帧 */
  useEffect(() => {
    /* 运行时守卫：Safari 没有 requestIdleCallback */
    const idle = window.requestIdleCallback?.bind(window)
    if (!idle) {
      const timer = window.setTimeout(() => void loadLanyard(), 400)
      return () => window.clearTimeout(timer)
    }
    const handle = idle(() => void loadLanyard(), { timeout: 4000 })
    return () => window.cancelIdleCallback?.(handle)
  }, [])

  useEffect(() => {
    /* 入场动画结束前绝不建场景：建上下文、编译着色器、上传贴图
       都是同步长任务，叠在动画上就是肉眼可见的卡顿 */
    if (!ui.introDone) return

    /* 首屏标题动画约 2.5 秒，再等 3 秒才放开挂载 */
    const timer = window.setTimeout(() => {
      setIntroSettled(true)

      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      /* 省流模式不做预热，仍等接近视口再加载 */
      if (conn?.saveData) return
      /* 用户已经往下走了就不在视野里建场景，交给接近视口的挂载逻辑 */
      if (window.scrollY < window.innerHeight * 0.6) setLanyardWarm(true)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [ui.introDone])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)')
    const sync = () => setCompactLanyard(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /* 右侧 Capabilities 悬停会展开条目、把整行撑高，左列跟着拉伸会让吊牌上下跳。
     宽屏双栏时把左列高度锁在右侧内容的常态高度上，悬停只在右侧内部展开 */
  useEffect(() => {
    const col = colRef.current
    const content = contentRef.current
    if (!col || !content) return

    if (compactLanyard) {
      col.style.height = ''
      return
    }

    const expanded = () => Boolean(content.querySelector('.about__cap:hover'))

    const sync = () => {
      /* 条目展开期间量到的是过渡中的高度，不能作为基准 */
      if (expanded()) return
      col.style.height = `${content.getBoundingClientRect().height}px`
    }

    sync()

    /* 用 ResizeObserver 跟踪右栏的自然高度，但要等展开 / 收起的过渡（0.5s）结束再锁，
       否则会把中途的高度当成基准，吊牌反而被拉长再缩回 */
    let active = true
    let timer = 0
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(sync, 520)
    })
    observer.observe(content)

    document.fonts?.ready.then(() => {
      if (active) sync()
    })
    return () => {
      active = false
      window.clearTimeout(timer)
      observer.disconnect()
      col.style.height = ''
    }
  }, [compactLanyard])

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
          <span className="eyebrow">03 / About · {t('关于', 'About')}</span>
          <div className="about__head-note mono">
            <span>Beijing, CN</span>
            <span>Working everywhere</span>
          </div>
        </div>

        <div className="about__grid">
          <div ref={colRef} className="about__visual-col">
            <div className="about__visual">
              <div ref={lanyardHost} className="about__lanyard">
                {lanyardReady ? (
                  <Suspense fallback={null}>
                    <Lanyard
                      frontImage="/art/avatar-kiiriing.png"
                      backImage="/art/lanyard-back.png"
                      cardColor="#f2ede4"
                      size={compactLanyard ? 0.57 : 0.33}
                      strapLength={0.35}
                      strapImage="/brand/logo-white.png"
                      strapColor="#191820"
                    />
                  </Suspense>
                ) : null}
              </div>
            </div>

            <div className="about__visual-meta mono">
              <span>Interface / systems / speed</span>
              <span>01 — 01</span>
            </div>
          </div>

          <div ref={contentRef} className="about__content">
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
              {t('从界面，到基础设施。', 'From interface to infrastructure.')}
            </p>

            <div className="about__copy">
              <p ref={copy1}>
                {t(
                  '我是Kiiriing，一名在读的全栈开发者。2024 年起在校内工作室和校企项目里写接口，2025 年成为合作企业管理系统的技术负责人（CTO），带团队把 NestJS + PostgreSQL 的服务推进到可以对外合作的状态。',
                  'I am Kiiriing, a full-stack developer still studying. Since 2024 I have been writing APIs at a campus studio and on university–industry projects. In 2025 I became CTO of a partner enterprise management system, leading a team that took a NestJS + PostgreSQL service to the point where it could be offered externally.'
                )}
              </p>
              <p ref={copy2}>
                {t(
                  '写过 Vue 3 也写过 React 19，从 Flask 到 NestJS，从 MySQL 到 PostgreSQL。关注接口设计、数据库索引与性能，也关注界面上的每一次反馈：让边界条件有答案，让每一次点击都有明确的下一步。',
                  'I have written Vue 3 and React 19, worked from Flask to NestJS and from MySQL to PostgreSQL. I care about API design, database indexes and performance — and about every piece of feedback in the interface: giving edge cases an answer and every click a clear next step.'
                )}
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
              <p>
                {t(
                  '现在开放 2026 年的实习与全栈岗位机会，也接可以一起推进的小项目。',
                  'Open to internships and full-stack roles in 2026, and to small projects we can move forward together.'
                )}
              </p>
              <a
                href={`mailto:${site.email}`}
                className="about__mail link-underline"
                data-cursor="Write"
              >
                {t('开始一段对话', 'Start a conversation')} ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="about__stack">
        <div className="about__stack-head mono">
          <span>Stack / {t('技术栈', 'Stack')}</span>
          <span>{techStack.length} icons · {t('拖动可回看', 'drag to revisit')}</span>
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
