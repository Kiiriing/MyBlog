import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import '../styles/components/CustomCursor.css'

const SELECTORS =
  'a, button, [data-cursor], input, textarea, select, [role="button"]'

function isFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null)
  const follower = useRef<HTMLDivElement>(null)

  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState(false)
  const [label, setLabel] = useState('')
  const [down, setDown] = useState(false)

  const visibleRef = useRef(false)
  const activeRef = useRef(false)
  const labelRef = useRef('')
  const downRef = useRef(false)
  const quick = useRef<{
    dotX: (value: number) => void
    dotY: (value: number) => void
    ringX: (value: number) => void
    ringY: (value: number) => void
  } | null>(null)

  useEffect(() => {
    if (!isFinePointer()) return

    const toDotX = gsap.quickTo(dot.current, 'x', { duration: 0.08, ease: 'power3' })
    const toDotY = gsap.quickTo(dot.current, 'y', { duration: 0.08, ease: 'power3' })
    const toRingX = gsap.quickTo(follower.current, 'x', { duration: 0.38, ease: 'power3' })
    const toRingY = gsap.quickTo(follower.current, 'y', { duration: 0.38, ease: 'power3' })
    quick.current = { dotX: toDotX, dotY: toDotY, ringX: toRingX, ringY: toRingY }

    function showAt(x: number, y: number) {
      if (!visibleRef.current) {
        visibleRef.current = true
        // The native cursor is only hidden once the custom one is actually visible,
        // so a failed mount or a not-yet-moved pointer never leaves the page cursorless.
        setVisible(true)
        document.documentElement.classList.add('has-custom-cursor')
        gsap.set([dot.current, follower.current], { x, y })
      }
      toDotX(x)
      toDotY(y)
      toRingX(x)
      toRingY(y)
    }

    function hide() {
      if (!visibleRef.current) return
      visibleRef.current = false
      setVisible(false)
      document.documentElement.classList.remove('has-custom-cursor')
      activeRef.current = false
      labelRef.current = ''
      downRef.current = false
      setActive(false)
      setLabel('')
      setDown(false)
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      showAt(event.clientX, event.clientY)
    }

    function onPointerOver(event: PointerEvent) {
      const target = (event.target as Element | null)?.closest?.(SELECTORS) as HTMLElement | null
      const nextActive = Boolean(target)
      const nextLabel = target?.dataset?.cursor || ''
      activeRef.current = nextActive
      labelRef.current = nextLabel
      setActive(nextActive)
      setLabel(nextLabel)
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      showAt(event.clientX, event.clientY)
      downRef.current = true
      setDown(true)
    }

    function onPointerUp() {
      downRef.current = false
      setDown(false)
    }

    function onPointerLeave(event: MouseEvent) {
      if (event.relatedTarget) return
      hide()
    }

    function onVisibilityChange() {
      if (document.hidden) hide()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerover', onPointerOver, { passive: true })
    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointerup', onPointerUp, { passive: true })
    document.documentElement.addEventListener('mouseleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', hide)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.documentElement.removeEventListener('mouseleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', hide)
      document.documentElement.classList.remove('has-custom-cursor')
      quick.current = null
    }
  }, [])

  return (
    <>
      <div
        ref={follower}
        className={[
          'cursor',
          active ? 'is-active' : '',
          label ? 'is-labelled' : '',
          down ? 'is-down' : '',
          visible ? 'is-visible' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        <span className="cursor__ring" />
        <span className="cursor__label">{label}</span>
      </div>
      <div
        ref={dot}
        className={`cursor-dot${visible ? ' is-visible' : ''}`}
        aria-hidden="true"
      />
    </>
  )
}
