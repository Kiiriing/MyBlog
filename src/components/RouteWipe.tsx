import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/RouteWipe.css'

export type RouteWipeHandle = {
  play: (label?: string, meta?: string) => void
}

const RouteWipe = forwardRef<RouteWipeHandle>(function RouteWipe(_, ref) {
  const root = useRef<HTMLDivElement>(null)
  const labelEl = useRef<HTMLSpanElement>(null)
  const metaEl = useRef<HTMLSpanElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const [label, setLabel] = useState('Index')
  const [meta, setMeta] = useState('/')

  useImperativeHandle(ref, () => ({
    play(nextLabel?: string, nextMeta?: string) {
      if (!root.current || prefersReducedMotion()) return

      setLabel(nextLabel || 'Index')
      setMeta(nextMeta || '/')

      timelineRef.current?.kill()
      const timeline = gsap.timeline()
      timelineRef.current = timeline
      timeline
        .set(root.current, { clipPath: 'inset(100% 0 0 0)' })
        .set([labelEl.current, metaEl.current], { yPercent: 110, opacity: 0 })
        .to(
          root.current,
          {
            clipPath: 'inset(0% 0 0 0)',
            duration: 0.45,
            ease: 'power3.inOut'
          },
          0
        )
        .to(
          [labelEl.current, metaEl.current],
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power3.out'
          },
          0.25
        )
        .to(
          root.current,
          {
            clipPath: 'inset(0 0 100% 0)',
            duration: 0.5,
            ease: 'power3.inOut'
          },
          1.08
        )
        .to(
          [labelEl.current, metaEl.current],
          {
            yPercent: -120,
            opacity: 0,
            duration: 0.35,
            ease: 'power2.in'
          },
          1.08
        )
    }
  }))

  return (
    <div ref={root} className="route-wipe" aria-hidden="true">
      <div className="route-wipe__texture" />
      <span className="route-wipe__mark" aria-hidden="true">
        ↗
      </span>

      <div className="shell route-wipe__inner">
        <div className="route-wipe__top mono">
          <span>LU YU — Route transition</span>
          <span>2020 / 2026</span>
        </div>

        <div className="route-wipe__center">
          <span className="route-wipe__eyebrow mono">Now entering</span>
          <span className="route-wipe__line">
            <span ref={labelEl} className="route-wipe__label">
              {label}
            </span>
          </span>
          <span className="route-wipe__line route-wipe__line--meta">
            <span ref={metaEl} className="route-wipe__sub mono">
              {meta}
            </span>
          </span>
        </div>

        <div className="route-wipe__bottom mono">
          <span>Please wait a moment</span>
          <span>Selected work &amp; notes</span>
        </div>
      </div>
    </div>
  )
})

export default RouteWipe
