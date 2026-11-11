import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import '../styles/components/SwipeRow.css'

export type SwipeAction = {
  id: string
  label: string
  icon?: ReactNode
  color?: string
  dismiss?: boolean
  onSelect?: () => void
}

type SwipeRowProps = {
  children: ReactNode
  actions?: SwipeAction[]
  actionColor?: string
  drawerColor?: string
  rowColor?: string
  textColor?: string
  /** 数字为固定行高（官方默认 64），auto 让行高跟随内容 */
  height?: number | 'auto'
  radius?: number
  actionWidth?: number
  direction?: 'left' | 'right'
  snapBounce?: number
  resistance?: number
  collapseMs?: number
  commitAt?: number
  fullSwipe?: boolean
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAction?: (action: SwipeAction) => void
  onCommit?: (action: SwipeAction) => void
  closeOnAction?: boolean
  /** 提交后是否折叠收尾；交给外部原地替换时设为 false，避免先塌陷再撑开 */
  collapseOnCommit?: boolean
  haptic?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

/* React Bits SwipeRow（micro/swipe-row）的 1:1 站内实现：
   同样的橡皮阻尼、速度投影、弹簧回弹与全滑提交，只把图标换成内联 SVG。 */

const HYST = 10
const FLICK = 110
const DECEL = 0.998
const VMAX = 1500
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const SPRING_UI = { type: 'spring' as const, duration: 0.3, bounce: 0 }
const DEFAULT_ACTIONS: SwipeAction[] = [{ id: 'delete', label: '删除' }]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const rubber = (o: number, dim: number, c: number) => (o * dim * c) / (dim + c * Math.abs(o))
const unrubber = (y: number, dim: number, c: number) =>
  (y * dim) / (c * Math.max(1, dim - Math.abs(y)))
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL)
const velocityOf = (hist: [number, number][]) => {
  if (hist.length < 2) return 0
  const a = hist[0]
  const b = hist[hist.length - 1]
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000
}
const onColor = (hex: string) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const h =
    m[1].length === 3
      ? [...m[1]].map((ch) => ch + ch).join('')
      : m[1]
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#111111' : '#ffffff'
}

type LiveDrag = { move: (event: PointerEvent) => void; up: (event: PointerEvent) => void }

const watchWindow = (live: { current: LiveDrag }) => {
  const onMove = (event: PointerEvent) => {
    if (event.isTrusted) live.current.move(event)
  }
  const onUp = (event: PointerEvent) => {
    if (event.isTrusted) live.current.up(event)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }
}

export default function SwipeRow({
  children,
  actions = DEFAULT_ACTIONS,
  actionColor,
  drawerColor,
  rowColor,
  textColor,
  height = 64,
  radius = 16,
  actionWidth = 80,
  direction = 'left',
  snapBounce = 0.2,
  resistance = 0.55,
  collapseMs = 200,
  commitAt = 0.6,
  fullSwipe = true,
  disabled = false,
  open: openProp,
  onOpenChange,
  onAction,
  onCommit,
  closeOnAction = true,
  collapseOnCommit = true,
  haptic = true,
  label = '列表行',
  className = '',
  style
}: SwipeRowProps) {
  const uid = useId()
  const reduce = useReducedMotion()
  const s = direction === 'left' ? -1 : 1
  const A = actionWidth
  const n = actions.length
  const D = n * A
  const c = clamp(resistance, 0.05, 1)
  const primary = actions[0]
  const [openState, setOpenState] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'committing' | 'collapsing'>('idle')
  const [say, setSay] = useState('')
  const open = openProp ?? openState

  const root = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const w = useRef(360)
  const grip = useRef<{
    id: number
    x0: number
    y0: number
    grab: number | null
    moved: boolean
    hist: [number, number][]
    touch: boolean
  } | null>(null)
  const unwatch = useRef<(() => void) | null>(null)
  const live = useRef<LiveDrag>({ move: () => {}, up: () => {} })
  const foldTimer = useRef<number | undefined>(undefined)
  const heading = useRef<number | null>(null)
  const suppressClick = useRef(false)

  const x = useMotionValue(0)
  const spread = useMotionValue(0)
  const landed = useMotionValue(0)
  const commitPoint = () => Math.max(commitAt * w.current, D + A / 2)
  const canCommit = () => fullSwipe && n > 0 && commitPoint() <= w.current
  const exposed = useTransform(x, (v) => s * v)
  const surfaceXf = useTransform(x, (v) => `translateX(${v}px)`)
  const railXf = useTransform(exposed, (e) => `translateX(${-s * Math.max(0, D - e)}px)`)
  const shift = useTransform([exposed, spread], ([e, p]) =>
    (p as number) * Math.max(0, (e as number) - A)
  )
  const blockXf = useTransform(shift, (v) => `translateX(${s * v}px)`)
  const glyphXf = useTransform([shift, landed], ([v, l]) =>
    `translateX(${-s * (l as number) * ((v as number) - (w.current - A) / 2)}px)`
  )

  const map = (raw: number) => {
    const W = w.current
    if (raw < 0) return rubber(raw, W, c)
    if (raw <= D) return raw
    if (!canCommit()) return D + rubber(raw - D, W, c)
    const C = commitPoint()
    const knee = D + (C - D) / c
    return raw <= knee ? D + c * (raw - D) : C + rubber(raw - knee, W, c)
  }
  const inv = (ex: number) => {
    const W = w.current
    if (ex < 0) return unrubber(ex, W, c)
    if (ex <= D) return ex
    if (!canCommit()) return D + unrubber(ex - D, W, c)
    const C = commitPoint()
    const knee = D + (C - D) / c
    return ex <= C ? D + (ex - D) / c : knee + unrubber(ex - C, W, c)
  }

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return undefined
    w.current = el.offsetWidth || w.current
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) w.current = width
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(foldTimer.current)
      unwatch.current?.()
    },
    []
  )

  const setOpen = (next: boolean) => {
    if (next === open) return
    setOpenState(next)
    onOpenChange?.(next)
  }

  const settle = (target: number, v = 0) => {
    heading.current = target
    if (reduce) {
      animate(x, s * target, { duration: 0.2, ease: EASE_OUT })
      return
    }
    const flick = Math.abs(v) >= FLICK
    animate(
      x,
      s * target,
      flick
        ? {
            type: 'spring',
            duration: 0.4,
            bounce: snapBounce,
            velocity: s * clamp(v, -VMAX, VMAX)
          }
        : { ...SPRING_UI, velocity: s * v }
    )
  }

  const setSpread = (on: boolean) => {
    if ((spread.get() === 1) === on) return
    if (reduce) spread.set(on ? 1 : 0)
    else animate(spread, on ? 1 : 0, SPRING_UI)
    if (on && primary) {
      setSay(`松开以${primary.label}`)
      if (haptic && grip.current?.touch) navigator.vibrate?.(8)
    }
  }

  /* 收起时把当前高度写成具体像素再归零，行高自适应时也能平滑折叠 */
  const fold = (action: SwipeAction) => {
    /* 外部会立刻原地换成别的行时不折叠，否则整列会先塌陷再被撑回去 */
    if (!collapseOnCommit) {
      onCommit?.(action)
      action.onSelect?.()
      return
    }
    const el = root.current
    if (el) {
      const current = el.offsetHeight
      el.style.height = `${current}px`
      el.style.marginBottom = getComputedStyle(el).marginBottom
      void el.offsetHeight
    }
    setPhase('collapsing')
    if (el) {
      el.style.height = '0px'
      el.style.marginBottom = '0px'
      el.style.opacity = '0'
    }
    foldTimer.current = window.setTimeout(() => {
      onCommit?.(action)
      action.onSelect?.()
    }, collapseMs)
  }

  const commit = (action: SwipeAction, viaKey: boolean, v = 0) => {
    const leap = action === primary
    setPhase('committing')
    setSay(action.label)
    setOpen(false)
    if (viaKey || reduce) {
      if (leap) {
        spread.set(1)
        landed.set(1)
      }
      if (viaKey) {
        x.set(s * w.current)
        fold(action)
      } else {
        animate(x, s * w.current, { duration: 0.2, ease: EASE_OUT }).then(() => fold(action))
      }
      return
    }
    if (leap) {
      if (spread.get() < 1) animate(spread, 1, SPRING_UI)
      animate(landed, 1, SPRING_UI)
    }
    animate(x, s * w.current, { ...SPRING_UI, velocity: s * v }).then(() => fold(action))
  }

  useEffect(() => {
    if (openProp === undefined || grip.current || phase !== 'idle') return
    const target = open ? D : 0
    if (heading.current === target) return
    if (Math.abs(exposed.get() - target) > 0.5) settle(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, D])

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || n === 0 || phase !== 'idle' || grip.current || event.button !== 0) return
    x.stop()
    heading.current = null
    grip.current = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      grab: null,
      moved: false,
      hist: [],
      touch: event.pointerType === 'touch'
    }
    /* 不调用 setPointerCapture：捕获会把后续 click 改派到 surface，
       行内的展开按钮与链接就再也点不到了；拖动统一交给 window 监听。 */
    unwatch.current?.()
    unwatch.current = watchWindow(live)
  }

  const move = (event: PointerEvent) => {
    const g = grip.current
    if (!g || g.id !== event.pointerId) return
    if (g.grab === null) {
      const dx = event.clientX - g.x0
      const dy = event.clientY - g.y0
      if (Math.abs(dx) < HYST || Math.abs(dx) < Math.abs(dy)) return
      g.grab = s * (g.x0 + Math.sign(dx) * HYST) - inv(exposed.get())
      g.moved = true
      root.current?.setAttribute('data-dragging', '')
    }
    const ex = map(s * event.clientX - g.grab)
    x.set(s * ex)
    g.hist.push([performance.now(), ex])
    if (g.hist.length > 4) g.hist.shift()
    setSpread(canCommit() && ex >= commitPoint())
  }

  const up = (event: PointerEvent) => {
    const g = grip.current
    if (!g || g.id !== event.pointerId) return
    grip.current = null
    unwatch.current?.()
    unwatch.current = null
    root.current?.removeAttribute('data-dragging')
    const ex = exposed.get()
    const v = velocityOf(g.hist)
    if (!g.moved) {
      if (open) {
        suppressClick.current = true
        setOpen(false)
        settle(0)
      }
      return
    }
    suppressClick.current = true
    if (primary && canCommit() && ex >= commitPoint()) {
      commit(primary, false, v)
      return
    }
    const target = Math.abs(v) >= FLICK ? (v > 0 ? D : 0) : ex + project(v) > D / 2 ? D : 0
    setSpread(false)
    setOpen(target === D)
    settle(target, v)
  }
  live.current = { move, up }

  const act = (action: SwipeAction, event: { detail: number }) => {
    if (phase !== 'idle') return
    onAction?.(action)
    if (action === primary || action.dismiss) {
      commit(action, event.detail === 0)
      return
    }
    action.onSelect?.()
    if (!closeOnAction) return
    setOpen(false)
    if (event.detail === 0) {
      heading.current = 0
      x.set(0)
    } else settle(0)
  }

  const openNow = () => {
    heading.current = D
    x.set(s * D)
    setOpen(true)
    setSay(`已展开 ${n} 个操作`)
  }
  const closeNow = () => {
    heading.current = 0
    x.set(0)
    setOpen(false)
  }

  const onToggleKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled || phase !== 'idle' || n === 0) return
    const openKey = s < 0 ? 'ArrowLeft' : 'ArrowRight'
    const closeKey = s < 0 ? 'ArrowRight' : 'ArrowLeft'
    const toggle = event.key === 'Enter' || event.key === ' '
    if (event.key === openKey || (toggle && !open)) {
      event.preventDefault()
      openNow()
    } else if (event.key === closeKey || event.key === 'Escape' || (toggle && open)) {
      event.preventDefault()
      closeNow()
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && open && primary && canCommit()) {
      event.preventDefault()
      commit(primary, true)
    }
  }

  const onToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 || disabled || phase !== 'idle' || n === 0) return
    if (open) closeNow()
    else openNow()
  }

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const railId = `${uid}-rail`
  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={`swipe-row${className ? ` ${className}` : ''}`}
      data-direction={direction}
      data-open={open ? '' : undefined}
      data-phase={phase}
      data-disabled={disabled ? '' : undefined}
      style={
        {
          '--sr-h': height === 'auto' ? 'auto' : `${height}px`,
          '--sr-r': `${radius}px`,
          '--sr-a': `${A}px`,
          '--sr-collapse': `${collapseMs}ms`,
          /* 颜色留给 CSS 变量兜底，跟随站点的暗色 / 纸色主题 */
          ...(rowColor ? { '--sr-row': rowColor } : null),
          ...(textColor ? { '--sr-text': textColor } : null),
          ...(drawerColor
            ? { '--sr-drawer': drawerColor, '--sr-on-drawer': onColor(drawerColor) }
            : null),
          ...(actionColor
            ? { '--sr-action': actionColor, '--sr-on-action': onColor(actionColor) }
            : null),
          ...style
        } as CSSProperties
      }
    >
      <div className="swipe-row__clip">
        <motion.div
          id={railId}
          className="swipe-row__rail"
          style={{ transform: railXf }}
          inert={!open || undefined}
          aria-hidden={!open}
        >
          {actions.slice(1).map((action, i) => (
            <button
              key={action.id}
              type="button"
              className="swipe-row__action"
              onClick={(event) => act(action, event)}
              style={
                s < 0
                  ? {
                      right: (i + 1) * A,
                      ...(action.color
                        ? { background: action.color, color: onColor(action.color) }
                        : null)
                    }
                  : {
                      left: (i + 1) * A,
                      ...(action.color
                        ? { background: action.color, color: onColor(action.color) }
                        : null)
                    }
              }
            >
              <span className="swipe-row__glyph">
                {action.icon ? <span className="swipe-row__icon">{action.icon}</span> : null}
                <span>{action.label}</span>
              </span>
            </button>
          ))}
          {primary ? (
            <motion.div className="swipe-row__block" style={{ transform: blockXf }}>
              <motion.button
                type="button"
                className="swipe-row__action swipe-row__action--commit"
                style={{ transform: glyphXf }}
                onClick={(event) => act(primary, event)}
              >
                <span className="swipe-row__glyph">
                  {primary.icon ? <span className="swipe-row__icon">{primary.icon}</span> : null}
                  <span>{primary.label}</span>
                </span>
              </motion.button>
            </motion.div>
          ) : null}
        </motion.div>
        <motion.div
          ref={surface}
          className="swipe-row__surface"
          style={{ transform: surfaceXf }}
          onPointerDown={down}
          onClickCapture={onClickCapture}
        >
          {children}
          <button
            type="button"
            className="swipe-row__toggle"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={open}
            aria-controls={railId}
            aria-keyshortcuts={s < 0 ? 'ArrowLeft' : 'ArrowRight'}
            onKeyDown={onToggleKey}
            onClick={onToggleClick}
          >
            {n} 个操作
          </button>
        </motion.div>
      </div>
      <span className="swipe-row__sr" aria-live="polite">
        {say}
      </span>
    </div>
  )
}
