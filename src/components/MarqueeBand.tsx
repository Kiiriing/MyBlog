import { useEffect, useRef } from 'react'
import { useI18n } from '../store/i18n'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/MarqueeBand.css'

const items = [
  'NestJS 11',
  'TypeScript',
  'PostgreSQL',
  'Redis',
  'Flask',
  'Vue 3 / React 19',
  'uni-app',
  'Docker',
  'ECharts',
  'Full-stack',
  'Interface',
  'Interaction'
]

export default function MarqueeBand() {
  const { t } = useI18n()
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = track.current
    /* 横向滚动交给 CSS 动画，由合成线程执行：空闲时主线程完全不参与。
       这里只保留滚动带来的倾斜，滚动停下后缓动归零，不再常驻 ticker。 */
    const move = el?.firstElementChild as HTMLElement | null
    if (!el || !move) return

    /* 尊重减少动态：保持静态排版，仍然可读 */
    if (prefersReducedMotion()) return

    /* 轨道半宽只在尺寸变化时量一次：逐帧读 scrollWidth 会反复触发强制布局 */
    const measure = () => {
      const halfWidth = move.scrollWidth / 2
      if (halfWidth > 0) move.style.setProperty('--marquee-duration', `${(halfWidth / 74).toFixed(2)}s`)
    }
    measure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(move)
    window.addEventListener('resize', measure)

    const skew = { value: 0 }
    let lastScroll = window.scrollY
    let settleTimer = 0

    const write = () => {
      el.style.transform = Math.abs(skew.value) > 0.02 ? `skewX(${skew.value.toFixed(2)}deg)` : ''
    }
    const toSkew = gsap.quickTo(skew, 'value', {
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: write
    })

    /* 滚动越快，倾斜越大；滚完 140ms 后把倾斜缓动回 0 */
    const onScroll = () => {
      const scrollY = window.scrollY
      const velocity = scrollY - lastScroll
      lastScroll = scrollY
      if (velocity === 0 && Math.abs(skew.value) < 0.02) return
      toSkew(gsap.utils.clamp(-7, 7, velocity * 0.14))
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => toSkew(0), 140)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(settleTimer)
      gsap.killTweensOf(skew)
      el.style.transform = ''
    }
  }, [])

  return (
    <div className="marquee theme-paper" aria-hidden="true">
      <div ref={track} className="marquee__track">
        <div className="marquee__move">
          {[0, 1].map((copy) => (
            <span key={copy} style={{ display: 'contents' }}>
              {items.map((item, i) => (
                <span
                  key={`${copy}-${i}`}
                  className={`marquee__item${/[\u4e00-\u9fa5]/.test(item) ? ' is-cn' : ''}`}
                >
                  <span>{item}</span>
                  <i className="marquee__star">✦</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      <span className="marquee__label mono">Capabilities / {t('能力', 'Capabilities')}</span>
    </div>
  )
}
