import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import '../styles/components/WarmTooltip.css'

/* React Bits WarmTooltip 的站内实现：浅色浮层 + 小箭头 + 弹出微动画，
   并且保留「暖」行为 —— 任意一个提示刚出现过，相邻提示就直接出现。 */

type Side = 'top' | 'bottom' | 'left' | 'right'

export type WarmTooltipProps = {
  content: ReactNode
  shortcut?: string
  side?: Side
  delay?: number
  gap?: number
  disabled?: boolean
  children: ReactElement<{ 'aria-describedby'?: string }>
}

const MARGIN = 8
const GRACE = 80
const WARM_WINDOW = 360
const FADE_MS = 160

let warmUntil = 0
let activeCloser: (() => void) | null = null

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type Placement = { x: number; y: number; arrow: number }

export default function WarmTooltip({
  content,
  shortcut,
  side = 'top',
  delay = 400,
  gap = 8,
  disabled = false,
  children
}: WarmTooltipProps) {
  const tooltipId = `warm-tooltip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const timers = useRef({ open: 0, hide: 0, close: 0, frame: 0 })
  const closerRef = useRef<() => void>(() => {})

  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
  const [shown, setShown] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)

  const place = useCallback(() => {
    const trigger = triggerRef.current
    const tip = tipRef.current
    if (!trigger || !tip) return

    const rect = trigger.getBoundingClientRect()
    const width = tip.offsetWidth
    const height = tip.offsetHeight
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    let x = centerX - width / 2
    let y = rect.top - gap - height
    if (side === 'bottom') {
      y = rect.bottom + gap
    } else if (side === 'left') {
      x = rect.left - gap - width
      y = centerY - height / 2
    } else if (side === 'right') {
      x = rect.right + gap
      y = centerY - height / 2
    }

    x = clamp(x, MARGIN, Math.max(MARGIN, window.innerWidth - MARGIN - width))
    y = clamp(y, MARGIN, Math.max(MARGIN, window.innerHeight - MARGIN - height))

    const horizontal = side === 'top' || side === 'bottom'
    const arrow = horizontal
      ? clamp(centerX - x, 12, width - 12)
      : clamp(centerY - y, 12, height - 12)

    setPlacement({ x, y, arrow })
  }, [side, gap])

  const closeInstant = useCallback(() => {
    window.clearTimeout(timers.current.open)
    window.clearTimeout(timers.current.hide)
    window.clearTimeout(timers.current.close)
    cancelAnimationFrame(timers.current.frame)
    setPhase('closed')
    setShown(false)
    setPlacement(null)
    if (activeCloser === closerRef.current) activeCloser = null
  }, [])

  closerRef.current = closeInstant

  const beginClose = useCallback(() => {
    warmUntil = Date.now() + WARM_WINDOW
    setShown(false)
    setPhase('closing')
    timers.current.close = window.setTimeout(() => {
      setPhase('closed')
      setPlacement(null)
      if (activeCloser === closerRef.current) activeCloser = null
    }, FADE_MS)
  }, [])

  const hide = useCallback(
    (instant = false) => {
      window.clearTimeout(timers.current.open)
      window.clearTimeout(timers.current.hide)
      window.clearTimeout(timers.current.close)
      if (instant) {
        closeInstant()
        return
      }
      timers.current.hide = window.setTimeout(beginClose, GRACE)
    },
    [beginClose, closeInstant]
  )

  const openTooltip = useCallback(
    (instant: boolean) => {
      if (disabled) return
      window.clearTimeout(timers.current.hide)
      window.clearTimeout(timers.current.close)
      window.clearTimeout(timers.current.open)

      const warm = instant || Date.now() < warmUntil
      if (warm) {
        warmUntil = Date.now() + WARM_WINDOW
        activeCloser?.()
        activeCloser = closerRef.current
        setPhase('open')
        setShown(true)
        return
      }

      timers.current.open = window.setTimeout(() => {
        warmUntil = Date.now() + WARM_WINDOW
        activeCloser?.()
        activeCloser = closerRef.current
        setPhase('open')
      }, delay)
    },
    [delay, disabled]
  )

  useLayoutEffect(() => {
    if (phase === 'closed') return undefined
    place()
    if (phase === 'open' && !shown) {
      timers.current.frame = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(timers.current.frame)
    }
    return undefined
  }, [phase, shown, place])

  useEffect(() => {
    if (phase === 'closed') return undefined
    const follow = () => place()
    window.addEventListener('scroll', follow, { capture: true, passive: true })
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, { capture: true })
      window.removeEventListener('resize', follow)
    }
  }, [phase, place])

  useEffect(() => {
    if (phase === 'closed') return undefined
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInstant()
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [phase, closeInstant])

  useEffect(() => {
    if (disabled) closeInstant()
  }, [disabled, closeInstant])

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.open)
      window.clearTimeout(timers.current.hide)
      window.clearTimeout(timers.current.close)
      cancelAnimationFrame(timers.current.frame)
      if (activeCloser === closerRef.current) activeCloser = null
    },
    []
  )

  const describedBy =
    phase === 'closed'
      ? children.props['aria-describedby']
      : [children.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')

  const style = {
    left: placement ? placement.x : 0,
    top: placement ? placement.y : 0,
    '--wt-arrow': `${placement ? placement.arrow : 0}px`
  } as CSSProperties

  return (
    <>
      <span
        ref={triggerRef}
        className="warm-tooltip__trigger"
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') openTooltip(false)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') hide(false)
        }}
        onFocus={(event) => {
          if (disabled) return
          if ((event.target as Element).matches?.(':focus-visible')) openTooltip(true)
        }}
        onBlur={() => hide(true)}
      >
        {cloneElement(children, { 'aria-describedby': describedBy })}
      </span>

      {phase !== 'closed' && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tipRef}
              id={tooltipId}
              role="tooltip"
              className={`warm-tooltip${shown ? ' is-shown' : ''}`}
              data-side={side}
              style={style}
            >
              <span className="warm-tooltip__box">
                <span className="warm-tooltip__text">
                  {content}
                  {shortcut ? <kbd className="warm-tooltip__kbd">{shortcut}</kbd> : null}
                </span>
                <span className="warm-tooltip__arrow" aria-hidden="true" />
              </span>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
