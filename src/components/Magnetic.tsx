import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/Magnetic.css'

type Props = {
  children: ReactNode
  /** 位移强度：0.2 轻微吸附，0.5 明显跟随 */
  strength?: number
  className?: string
}

/**
 * 磁性交互：外层保留原始命中区域，内层用 quickTo 跟随指针。
 * 指针离开后回弹到原位，并尊重 prefers-reduced-motion。
 */
export default function Magnetic({ children, strength = 0.32, className = '' }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = wrap.current
    const target = inner.current
    if (!host || !target) return
    if (prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const xTo = gsap.quickTo(target, 'x', { duration: 0.55, ease: 'power3.out' })
    const yTo = gsap.quickTo(target, 'y', { duration: 0.55, ease: 'power3.out' })

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      xTo((event.clientX - (rect.left + rect.width / 2)) * strength)
      yTo((event.clientY - (rect.top + rect.height / 2)) * strength)
    }

    const onLeave = () => {
      xTo(0)
      yTo(0)
    }

    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)

    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      gsap.killTweensOf(target)
    }
  }, [strength])

  return (
    <div ref={wrap} className={`magnetic${className ? ` ${className}` : ''}`}>
      <div ref={inner} className="magnetic__inner">
        {children}
      </div>
    </div>
  )
}
