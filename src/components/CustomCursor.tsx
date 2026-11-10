import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import '../styles/components/CustomCursor.css'

const SELECTORS =
  'a, button, [data-cursor], input, textarea, select, [role="button"]'

/** 黑胶播放器自带交互，整块交还系统光标，不叠加反色圆环 */
const PLAIN_REGION = '.vinyl-player'

function isFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function isPlainTarget(event: Event) {
  const element = event.target as Element | null
  return Boolean(element?.closest?.(PLAIN_REGION))
}

export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null)
  const follower = useRef<HTMLDivElement>(null)

  const [visible, setVisible] = useState(false)
  const [active, setActive] = useState(false)
  const [label, setLabel] = useState('')
  const [down, setDown] = useState(false)
  /* 指针落在黑胶播放器上时收起自定义圆环，交还系统光标 */
  const [plain, setPlain] = useState(false)

  const visibleRef = useRef(false)
  const activeRef = useRef(false)
  const labelRef = useRef('')
  const downRef = useRef(false)
  const plainRef = useRef(false)
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

    function applyPlain(next: boolean) {
      if (plainRef.current === next) return
      plainRef.current = next
      setPlain(next)
      /* 播放器里不显示圆环，也就没有可高亮 / 可标注的目标 */
      if (next) {
        activeRef.current = false
        labelRef.current = ''
        setActive(false)
        setLabel('')
      }
    }

    function hide() {
      plainRef.current = false
      setPlain(false)
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

    /* 每次移动都重读指针下的元素：像荣誉通道这种在画布内部动态切换
       「照片 / 非照片」的区域，只在 pointerover 时判断会漏掉状态变化 */
    function syncActive(event: PointerEvent) {
      const inPlain = isPlainTarget(event)
      applyPlain(inPlain)
      const target = inPlain
        ? null
        : ((event.target as Element | null)?.closest?.(SELECTORS) as HTMLElement | null)
      const nextActive = Boolean(target)
      const nextLabel = target?.dataset?.cursor || ''
      if (nextActive === activeRef.current && nextLabel === labelRef.current) return
      activeRef.current = nextActive
      labelRef.current = nextLabel
      setActive(nextActive)
      setLabel(nextLabel)
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      showAt(event.clientX, event.clientY)
      syncActive(event)
    }

    function onPointerOver(event: PointerEvent) {
      syncActive(event)
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'touch') return
      showAt(event.clientX, event.clientY)
      applyPlain(isPlainTarget(event))
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
          visible ? 'is-visible' : '',
          plain ? 'is-plain' : ''
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
        className={`cursor-dot${visible ? ' is-visible' : ''}${plain ? ' is-plain' : ''}`}
        aria-hidden="true"
      />
    </>
  )
}
