import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/Preloader.css'

type PreloaderProps = {
  onIntro?: () => void
  onDone?: () => void
}

function statusFor(progress: number) {
  if (progress < 36) return 'Compiling the interface'
  if (progress < 74) return 'Wiring the backend'
  if (progress < 99) return 'Shipping the details'
  return 'Welcome'
}

export default function Preloader({ onIntro, onDone }: PreloaderProps) {
  const root = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  const count = String(progress).padStart(3, '0')
  const status = statusFor(progress)

  useEffect(() => {
    let timeline: gsap.core.Timeline | null = null
    let fallbackTimer = 0

    if (prefersReducedMotion()) {
      setProgress(100)
      onIntro?.()
      fallbackTimer = window.setTimeout(() => onDone?.(), 250)
      return () => window.clearTimeout(fallbackTimer)
    }

    const counter = { value: 0 }
    const el = root.current
    if (!el) return

    const masks = el.querySelectorAll('.preloader__mask > span')
    const copy = el.querySelector('.preloader__copy')

    timeline = gsap.timeline()
    timeline.from(masks, {
      yPercent: 130,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.07
    })
    timeline.to(
      counter,
      {
        value: 100,
        duration: 1.35,
        ease: 'power2.inOut',
        onUpdate: () => {
          setProgress(Math.round(counter.value))
        }
      },
      '<0.1'
    )
    timeline.to(
      copy,
      {
        yPercent: -8,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in'
      },
      '+=0.05'
    )
    timeline.to(
      el,
      {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.85,
        ease: 'expo.inOut',
        onStart: () => onIntro?.()
      },
      '-=0.05'
    )
    timeline.call(() => onDone?.())

    return () => {
      timeline?.kill()
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
    }
  }, [])

  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div className="preloader__inner">
        <div className="preloader__top">
          <span className="mono">LU YU® / Portfolio 2026</span>
          <span className="mono">Beijing, CN</span>
        </div>

        <div className="preloader__copy">
          <div className="preloader__brand">
            <span className="preloader__mask">
              <span className="serif-italic">LU</span>
            </span>
            <span className="preloader__mask preloader__mask--offset">
              <span className="serif-italic">YU</span>
            </span>
          </div>
          <div className="preloader__sub">
            <span className="preloader__cn">陆 屿</span>
            <span className="mono">from interface to infrastructure</span>
          </div>
        </div>

        <div className="preloader__bottom">
          <span className="preloader__status">{status}</span>
          <span className="preloader__count">
            {count}
            <i>/100</i>
          </span>
        </div>

        <div className="preloader__bar">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      </div>
    </div>
  )
}
