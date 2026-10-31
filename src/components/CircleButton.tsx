import { useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from '../lib/gsap'
import '../styles/components/CircleButton.css'

type Direction = 'right' | 'down' | 'left' | 'up'

type Props = {
  to?: string
  href?: string
  label?: string
  direction?: Direction
  size?: number
  cursor?: string
  tone?: 'light' | 'dark'
  className?: string
  onClick?: () => void
}

const ROTATION: Record<Direction, number> = { right: 0, down: 90, left: 180, up: -90 }

export default function CircleButton({
  to,
  href,
  label = 'View',
  direction = 'right',
  size = 64,
  cursor = '',
  tone = 'light',
  className = '',
  onClick
}: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const tween = useRef<any>(null)

  const rotation = ROTATION[direction] ?? 0

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(hover: none)').matches) return
    const el = wrap.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    tween.current?.kill()
    tween.current = gsap.to(el, { x: x * 0.32, y: y * 0.32, duration: 0.55, ease: 'power3.out' })
  }

  const onLeave = () => {
    if (!wrap.current) return
    tween.current?.kill()
    tween.current = gsap.to(wrap.current, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' })
  }

  const buttonClass = `circle-button circle-button--${tone}`

  const content = (
    <>
      <span className="circle-button__arrow" style={{ '--rotation': `${rotation}deg` } as CSSProperties}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </span>
      <span className="circle-button__sr">{label}</span>
    </>
  )

  return (
    <div
      ref={wrap}
      className={`circle-button-wrap${className ? ` ${className}` : ''}`}
      style={{ '--size': `${size}px` } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {to ? (
        <Link to={to} className={buttonClass} aria-label={label} data-cursor={cursor || undefined}>
          {content}
        </Link>
      ) : href ? (
        <a href={href} className={buttonClass} aria-label={label} data-cursor={cursor || undefined}>
          {content}
        </a>
      ) : (
        <button
          type="button"
          className={buttonClass}
          aria-label={label}
          data-cursor={cursor || undefined}
          onClick={onClick}
        >
          {content}
        </button>
      )}
    </div>
  )
}
