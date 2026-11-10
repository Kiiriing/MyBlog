import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { gsap } from '../lib/gsap'
import '../styles/components/RubberSegment.css'

export type SegmentItem = {
  value: string
  label: string
}

type RubberSegmentProps = {
  items: SegmentItem[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
}

/**
 * 橡皮筋分段控件：选中块移动时先横向拉伸再回弹到目标位置。
 * 参考 reactbits 的 RubberSegment，用 GSAP 实现、支持键盘操作。
 */
export default function RubberSegment({
  items,
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Segmented control'
}: RubberSegmentProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const slots = useRef<Array<{ x: number; w: number }>>([])
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  )
  const indexRef = useRef(index)
  const first = useRef(true)
  indexRef.current = index

  const measure = useCallback(() => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb) return

    const rect = track.getBoundingClientRect()
    const pad = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0

    slots.current = itemRefs.current.map((element) => {
      if (!element) return { x: 0, w: 0 }
      const box = element.getBoundingClientRect()
      return { x: box.left - rect.left - pad, w: box.width }
    })

    const slot = slots.current[indexRef.current]
    if (slot) gsap.set(thumb, { x: slot.x, width: slot.w })
  }, [])

  const listKey = items.map((item) => item.value).join('|')

  useLayoutEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (trackRef.current) observer.observe(trackRef.current)
    if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(measure)
    return () => observer.disconnect()
  }, [measure, listKey])

  useEffect(() => {
    const thumb = thumbRef.current
    const slot = slots.current[index]
    if (!thumb || !slot) return

    if (first.current) {
      first.current = false
      gsap.set(thumb, { x: slot.x, width: slot.w })
      return
    }

    const current = {
      x: Number(gsap.getProperty(thumb, 'x')),
      w: Number(gsap.getProperty(thumb, 'width'))
    }
    /* 先撑到两端并集（皮筋被拉长），再收回到目标槽位 */
    const left = Math.min(current.x, slot.x)
    const right = Math.max(current.x + current.w, slot.x + slot.w)
    gsap
      .timeline()
      .to(thumb, { x: left, width: right - left, duration: 0.16, ease: 'power2.out' })
      .to(thumb, { x: slot.x, width: slot.w, duration: 0.34, ease: 'power3.out' })
  }, [index, listKey])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const last = items.length - 1
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(last, index + 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(0, index - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    if (next === index) return
    onChange(items[next].value)
    itemRefs.current[next]?.focus()
  }

  return (
    <div
      ref={trackRef}
      className="rubber-segment"
      role="tablist"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
    >
      <span ref={thumbRef} className="rubber-segment__thumb" aria-hidden="true" />
      {items.map((item, i) => (
        <button
          key={item.value}
          ref={(element) => {
            itemRefs.current[i] = element
          }}
          type="button"
          role="tab"
          aria-selected={i === index}
          tabIndex={i === index ? 0 : -1}
          disabled={disabled}
          className="rubber-segment__item"
          onClick={() => {
            if (i !== index) onChange(item.value)
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
