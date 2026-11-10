import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from 'react'
import '../styles/components/SwipeRow.css'

export type SwipeAction = {
  id: string
  label: string
  tone?: 'default' | 'danger'
  onSelect: () => void
}

type SwipeRowProps = {
  actions: SwipeAction[]
  children: ReactNode
  className?: string
  style?: CSSProperties
  label?: string
}

/* React Bits SwipeRow 的站内实现：左滑露出操作按钮，右滑或点按收回，
   不改动原有行内容，仅在外面加一层可拖动的表面。 */

const ACTION_WIDTH = 88
const HYST = 8
const OPEN_RATIO = 0.5
const REMOVE_MS = 260

export default function SwipeRow({
  actions,
  children,
  className = '',
  style,
  label = '列表行'
}: SwipeRowProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const position = useRef(0)
  const suppressClick = useRef(false)
  const removeTimer = useRef(0)
  const drag = useRef<{
    id: number
    x0: number
    y0: number
    base: number
    axis: '' | 'x' | 'y'
    moved: boolean
    interactive: boolean
    width: number
  } | null>(null)

  const drawer = actions.length * ACTION_WIDTH
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const openRef = useRef(false)

  const setOpenState = (next: boolean) => {
    openRef.current = next
    setOpen(next)
  }

  const paint = useCallback((value: number) => {
    position.current = value
    if (surfaceRef.current) {
      surfaceRef.current.style.transform = `translate3d(${value}px, 0, 0)`
    }
  }, [])

  const settle = useCallback(
    (value: number) => {
      if (surfaceRef.current) surfaceRef.current.style.transition = ''
      paint(value)
      setOpenState(value !== 0)
    },
    [paint]
  )

  const close = useCallback(() => settle(0), [settle])

  /** 执行操作：表面滑出屏幕，行收起后再真正删除 */
  const commit = useCallback(
    (action: SwipeAction) => {
      const width = rootRef.current?.offsetWidth ?? 420
      if (surfaceRef.current) surfaceRef.current.style.transition = ''
      setRemoving(true)
      setOpenState(false)
      paint(-width)
      window.clearTimeout(removeTimer.current)
      removeTimer.current = window.setTimeout(() => action.onSelect(), REMOVE_MS)
    },
    [paint]
  )

  useEffect(
    () => () => {
      window.clearTimeout(removeTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!open) return undefined

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }

    window.addEventListener('keydown', onKeydown)
    document.addEventListener('pointerdown', onOutside, true)
    return () => {
      window.removeEventListener('keydown', onKeydown)
      document.removeEventListener('pointerdown', onOutside, true)
    }
  }, [open, close])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (removing || event.button !== 0) return
    const surface = surfaceRef.current
    if (!surface) return
    drag.current = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      base: position.current,
      axis: '',
      moved: false,
      interactive: Boolean((event.target as HTMLElement).closest('button, a')),
      width: rootRef.current?.offsetWidth ?? 420
    }
    surface.style.transition = 'none'
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* 某些浏览器不支持捕获，拖动仍可继续 */
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return

    const dx = event.clientX - state.x0
    const dy = event.clientY - state.y0

    if (!state.axis) {
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      if (ax < HYST && ay < HYST) return
      /* 纵向滑动交给页面滚动，不抢手势；方向未明朗时先继续等待，避免轻微抖动直接放弃 */
      if (ay > ax && ay >= HYST * 1.5) {
        drag.current = null
        if (surfaceRef.current) surfaceRef.current.style.transition = ''
        return
      }
      if (ax <= ay) return
      state.axis = 'x'
      setDragging(true)
    }

    state.moved = true
    const raw = state.base + dx
    /* 越界时加阻尼，拖出 88px 也不会把整行拉空 */
    const next =
      raw > 0 ? raw * 0.25 : raw < -drawer ? -drawer + (raw + drawer) * 0.25 : raw
    paint(next)
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    drag.current = null
    setDragging(false)

    try {
      surfaceRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* 忽略释放失败 */
    }

    if (state.axis !== 'x' || !state.moved) {
      if (surfaceRef.current) surfaceRef.current.style.transition = ''
      /* 打开时点一下行内容：先收回，不上报点击；行内按钮保持原有点击行为 */
      if (openRef.current && !state.interactive) {
        suppressClick.current = true
        close()
      }
      return
    }

    suppressClick.current = true
    settle(position.current <= -drawer * OPEN_RATIO ? -drawer : 0)
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      ref={rootRef}
      className={`swipe-row${className ? ` ${className}` : ''}`}
      style={{ ...style, '--sr-drawer': `${drawer}px` } as CSSProperties}
      data-open={open ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      data-removing={removing ? '' : undefined}
      role="group"
      aria-label={label}
      onClickCapture={onClickCapture}
    >
      <div className="swipe-row__inner">
        <div className="swipe-row__clip">
          <div className="swipe-row__drawer" inert={!open || removing}>
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`swipe-row__action${action.tone === 'danger' ? ' is-danger' : ''}`}
                onClick={() => commit(action)}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div
            ref={surfaceRef}
            className="swipe-row__surface"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
