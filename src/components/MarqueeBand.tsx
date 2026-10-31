import { useEffect, useRef } from 'react'
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
  const band = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = track.current
    if (!el) return

    /* 尊重减少动态：保持静态排版，仍然可读 */
    if (prefersReducedMotion()) return

    const hovered = { value: false }
    const skew = { value: 0 }
    let x = 0
    let lastTime = gsap.ticker.time
    let lastScroll =
      typeof window !== 'undefined' ? window.scrollY : 0

    /* GSAP ticker 驱动的滚动速度响应：滚动越快，横向速度与倾斜越大 */
    const tick = (time: number) => {
      const delta = Math.min(0.05, time - lastTime)
      lastTime = time

      const scrollY = window.scrollY
      const velocity = scrollY - lastScroll
      lastScroll = scrollY

      const targetSkew = gsap.utils.clamp(-7, 7, velocity * 0.14)
      skew.value += (targetSkew - skew.value) * Math.min(1, delta * 7)

      const speed =
        (hovered.value ? 0.4 : 1) * (74 + Math.abs(skew.value) * 6) * delta
      x -= speed

      const width = el.scrollWidth / 2
      while (width > 0 && x <= -width) x += width

      el.style.transform = `translate3d(${x}px, 0, 0) skewX(${skew.value}deg)`
    }

    const onEnter = () => {
      hovered.value = true
    }
    const onLeave = () => {
      hovered.value = false
    }

    band.current?.addEventListener('pointerenter', onEnter)
    band.current?.addEventListener('pointerleave', onLeave)
    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      band.current?.removeEventListener('pointerenter', onEnter)
      band.current?.removeEventListener('pointerleave', onLeave)
      el.style.transform = ''
    }
  }, [])

  return (
    <div ref={band} className="marquee theme-paper" aria-hidden="true">
      <div ref={track} className="marquee__track">
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
      <span className="marquee__label mono">Capabilities / 能力</span>
    </div>
  )
}
