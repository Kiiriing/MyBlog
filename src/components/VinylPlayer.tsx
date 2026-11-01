import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { useUi } from '../store/ui'
import { VinylEngine, vinylTracks } from '../lib/vinylAudio'
import '../styles/components/VinylPlayer.css'

const BAR_COUNT = 10
const MARGIN = 8
const DRAG_THRESHOLD = 5

type Offset = { x: number; y: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clockOf(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* 左下角的黑胶播放器：收起时只有一张唱片，点击把唱片向左挪、控制条向右展开。
   唱片按下即开始拖拽（5px 以内仍算点击），整块可以拖到任意位置；
   底色由「唱片正下方实际是什么」决定 —— 用 elementsFromPoint 读到控件底下的页面，
   遇到 `.theme-paper` 就换成奶油纸面的深色文字，所以滚动与拖动时颜色会自动跟着变。 */
export default function VinylPlayer() {
  const ui = useUi()
  const location = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)
  const meterRef = useRef<HTMLSpanElement>(null)
  const engineRef = useRef<VinylEngine | null>(null)
  const toneFrame = useRef(0)
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    rect: null as DOMRect | null
  })

  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [tone, setTone] = useState<'dark' | 'paper'>('dark')
  const [elapsed, setElapsed] = useState(0)

  const track = vinylTracks[trackIndex]

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new VinylEngine()
    return engineRef.current
  }, [])

  /* 主题嗅探 ------------------------------------------------------------- */

  const sampleTone = useCallback(() => {
    const root = rootRef.current
    if (!root) return

    const rect = root.getBoundingClientRect()
    const x = clamp(rect.left + rect.width / 2, MARGIN, window.innerWidth - MARGIN)
    const y = clamp(rect.top + rect.height / 2, MARGIN, window.innerHeight - MARGIN)

    /* elementsFromPoint 会连同控件下方的页面一起返回，跳过播放器自身即可读到真正的背景 */
    const stack =
      typeof document.elementsFromPoint === 'function'
        ? document.elementsFromPoint(x, y)
        : [document.elementFromPoint(x, y)].filter((el): el is Element => Boolean(el))

    const paper = stack.some(
      (element) => !root.contains(element) && Boolean(element.closest('.theme-paper'))
    )
    setTone(paper ? 'paper' : 'dark')
  }, [])

  const scheduleTone = useCallback(() => {
    if (toneFrame.current) return
    toneFrame.current = window.requestAnimationFrame(() => {
      toneFrame.current = 0
      sampleTone()
    })
  }, [sampleTone])

  useEffect(() => {
    scheduleTone()
    window.addEventListener('scroll', scheduleTone, { passive: true })
    window.addEventListener('resize', scheduleTone)
    return () => {
      window.removeEventListener('scroll', scheduleTone)
      window.removeEventListener('resize', scheduleTone)
      if (toneFrame.current) window.cancelAnimationFrame(toneFrame.current)
    }
  }, [scheduleTone])

  /* 换页后整页底色可能从暗场换成奶油纸面，不必等用户滚动就重新嗅一次 */
  useEffect(() => {
    scheduleTone()
    const timer = window.setTimeout(scheduleTone, 720)
    return () => window.clearTimeout(timer)
  }, [location.pathname, scheduleTone])

  /* 展开/拖动后控件位置变了，重新嗅一次；展开时若右侧越界，把整块挪回可视区 */
  useEffect(() => {
    scheduleTone()
    if (!open) return
    const timer = window.setTimeout(() => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const overflow = rect.right + MARGIN - (window.innerWidth - MARGIN)
      if (overflow > 0) setOffset((current) => ({ ...current, x: current.x - overflow }))
    }, 620)
    return () => window.clearTimeout(timer)
  }, [open, offset, scheduleTone])

  /* 视口变小时把控件拉回屏幕内 */
  useEffect(() => {
    function keepInside() {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const dx =
        rect.left < MARGIN
          ? MARGIN - rect.left
          : rect.right > window.innerWidth - MARGIN
            ? window.innerWidth - MARGIN - rect.right
            : 0
      const dy =
        rect.top < MARGIN
          ? MARGIN - rect.top
          : rect.bottom > window.innerHeight - MARGIN
            ? window.innerHeight - MARGIN - rect.bottom
            : 0
      if (dx || dy) setOffset((current) => ({ x: current.x + dx, y: current.y + dy }))
      scheduleTone()
    }

    window.addEventListener('resize', keepInside)
    return () => window.removeEventListener('resize', keepInside)
  }, [scheduleTone])

  /* 播放中每秒走一次计时 -------------------------------------------------- */

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [playing, trackIndex])

  /* 频谱 ---------------------------------------------------------------- */

  useEffect(() => {
    const bars = Array.from(meterRef.current?.children ?? []) as HTMLElement[]
    if (!bars.length) return

    if (!playing) {
      bars.forEach((bar) => {
        bar.style.transform = 'scaleY(0.08)'
      })
      return
    }
    if (prefersReducedMotion()) return

    let frame = 0
    const values = new Float32Array(bars.length)

    const draw = () => {
      const bins = engineRef.current?.levels()
      if (bins) {
        const span = Math.min(46, bins.length - 4)
        for (let i = 0; i < bars.length; i += 1) {
          const index = Math.floor(2 + (i / bars.length) * span)
          const raw = (bins[index] ?? 0) / 255
          values[i] += (raw - values[i]) * 0.24
          bars[i].style.transform = `scaleY(${(0.08 + values[i] * 0.92).toFixed(3)})`
        }
      }
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [playing])

  useEffect(
    () => () => {
      engineRef.current?.dispose()
      engineRef.current = null
      if (toneFrame.current) window.cancelAnimationFrame(toneFrame.current)
    },
    []
  )

  /* 交互 ---------------------------------------------------------------- */

  function togglePlay() {
    const engine = getEngine()
    if (playing) {
      engine.pause()
      setPlaying(false)
      return
    }
    engine.setVolume(volume)
    engine.setTrack(trackIndex)
    engine.play()
    setPlaying(true)
  }

  function shiftTrack(direction: number) {
    const next = (trackIndex + direction + vinylTracks.length) % vinylTracks.length
    setTrackIndex(next)
    setElapsed(0)
    getEngine().setTrack(next)
  }

  function changeVolume(value: number) {
    setVolume(value)
    getEngine().setVolume(value)
  }

  function onDiscDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    const root = rootRef.current
    if (!root) return

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      rect: root.getBoundingClientRect()
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onDiscMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag.active || !drag.rect) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
      drag.moved = true
    }

    const rect = drag.rect
    setOffset({
      x: clamp(drag.baseX + dx, MARGIN - rect.left, window.innerWidth - MARGIN - rect.right),
      y: clamp(drag.baseY + dy, MARGIN - rect.top, window.innerHeight - MARGIN - rect.bottom)
    })
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function onDiscUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag.active) return
    const tapped = !drag.moved
    endDrag(event)
    if (tapped) setOpen((value) => !value)
  }

  const hint = playing ? 'Now playing' : open ? 'Drag me' : 'Tap to open'

  return (
    <div
      ref={rootRef}
      className={`vinyl-player${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
      data-tone={tone}
      data-playing={playing ? 'true' : 'false'}
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      role="group"
      aria-label="黑胶音乐播放器"
      /* 菜单打开时整块让出焦点与点击，和 #main 一样退到后面 */
      inert={ui.menuOpen || undefined}
    >
      <div className="vinyl-player__head">
        <button
          className="vinyl-player__disc"
          type="button"
          aria-expanded={open}
          aria-label={open ? '收起播放器' : '展开播放器，按住可拖动位置'}
          data-cursor="Drag"
          onPointerDown={onDiscDown}
          onPointerMove={onDiscMove}
          onPointerUp={onDiscUp}
          onPointerCancel={endDrag}
          onClick={(event) => {
            /* 键盘触发的 click（detail 为 0）才切换展开；指针的展开/收起在 pointerup 里处理 */
            if (event.detail === 0) setOpen((value) => !value)
          }}
        >
          <span className="vinyl-player__platter" aria-hidden="true">
            <span className="vinyl-player__sheen" />
            <span className="vinyl-player__label">
              <span className="vinyl-player__label-no">
                {String(trackIndex + 1).padStart(2, '0')}
              </span>
              <span className="vinyl-player__label-rule" />
              <span className="vinyl-player__label-side">LY</span>
            </span>
            <span className="vinyl-player__hole" />
          </span>
          <span className="vinyl-player__arm" aria-hidden="true">
            <span className="vinyl-player__arm-head" />
          </span>
        </button>
        <span className="vinyl-player__hint mono" aria-hidden="true">
          {hint}
        </span>
      </div>

      <div className="vinyl-player__panel" inert={!open}>
        <div className="vinyl-player__panel-inner">
          <div className="vinyl-player__meta mono">
            <span>{track.side}</span>
            <span className="vinyl-player__time">{clockOf(elapsed)}</span>
          </div>

          <div className="vinyl-player__title">
            <span className="vinyl-player__title-en">{track.title}</span>
            <span className="vinyl-player__title-cn">{track.cn}</span>
          </div>

          <div className="vinyl-player__controls">
            <button
              className="vinyl-player__btn"
              type="button"
              aria-label="上一首"
              data-cursor="Prev"
              onClick={() => shiftTrack(-1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 5v14" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M19 5l-9 7 9 7z" fill="currentColor" />
              </svg>
            </button>

            <button
              className="vinyl-player__btn vinyl-player__btn--play"
              type="button"
              aria-label={playing ? '暂停' : '播放'}
              data-cursor={playing ? 'Pause' : 'Play'}
              onClick={togglePlay}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 4h3v16H8zM14 4h3v16h-3z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 4l12 8-12 8z" fill="currentColor" />
                </svg>
              )}
            </button>

            <button
              className="vinyl-player__btn"
              type="button"
              aria-label="下一首"
              data-cursor="Next"
              onClick={() => shiftTrack(1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 5v14" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M5 5l9 7-9 7z" fill="currentColor" />
              </svg>
            </button>

            <label className="vinyl-player__vol">
              <span className="sr-only">音量</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                style={{ '--vp-vol': `${Math.round(volume * 100)}%` } as CSSProperties}
                onChange={(event) => changeVolume(Number(event.target.value))}
              />
            </label>

            <span ref={meterRef} className="vinyl-player__meter" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }, (_, index) => (
                <span key={index} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
