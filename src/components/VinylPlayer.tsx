import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { useUi } from '../store/ui'
import { useI18n } from '../store/i18n'
import { VinylEngine, vinylTracks } from '../lib/vinylAudio'
import '../styles/components/VinylPlayer.css'

const BAR_COUNT = 10
const MARGIN = 8
const DRAG_THRESHOLD = 5

type Offset = { x: number; y: number }
type Edge = { left: number; right: number; top: number; bottom: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clockOf(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* 左下角的黑胶播放器：收起时只有一张唱片，点击把唱片向左挪、控制条向右展开。
   唱片按下即开始拖拽（5px 以内仍算点击），整块可以拖到任意位置；
   底色由「唱片正下方实际是什么」决定 —— 用 elementsFromPoint 读到控件底下的页面，
   遇到 `.theme-paper` 就换成奶油纸面的深色文字，所以滚动与拖动时颜色会自动跟着变。 */
export default function VinylPlayer() {
  const ui = useUi()
  const { t } = useI18n()
  const location = useLocation()

  const rootRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const meterRef = useRef<HTMLSpanElement>(null)
  const sparkRef = useRef<HTMLSpanElement>(null)
  const engineRef = useRef<VinylEngine | null>(null)
  const toneFrame = useRef(0)

  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    head: null as Edge | null
  })

  const volumeRef = useRef(0.15)
  const autoStarted = useRef(false)
  const userPaused = useRef(false)
  const scrubbing = useRef(false)
  const volTimer = useRef(0)

  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [audible, setAudible] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [volume, setVolume] = useState(0.15)
  const [volOpen, setVolOpen] = useState(false)
  const [volHover, setVolHover] = useState(false)
  const [tone, setTone] = useState<'dark' | 'paper'>('dark')
  const [trackDuration, setTrackDuration] = useState(vinylTracks[0].duration ?? 0)

  const track = vinylTracks[trackIndex]
  /* 真实音频的元数据可能还没到，先用曲目表里的兜底长度撑住进度条 */
  const total = trackDuration || track.duration || 0

  /* 播放进度直接写 DOM：200ms 一次的轮询不再触发 React 重渲染 */
  const positionRef = useRef(0)
  const totalRef = useRef(total)
  const timeRef = useRef<HTMLSpanElement>(null)
  const rangeRef = useRef<HTMLInputElement>(null)

  const paint = useCallback((seconds: number) => {
    positionRef.current = seconds
    const duration = totalRef.current
    if (timeRef.current) {
      timeRef.current.textContent = `${clockOf(seconds)} / ${clockOf(duration)}`
    }
    const range = rangeRef.current
    if (!range) return
    const at = Math.min(seconds, duration || 1)
    range.value = String(at)
    range.style.setProperty('--vp-progress', `${duration ? clamp(at / duration, 0, 1) * 100 : 0}%`)
    range.setAttribute('aria-valuetext', `${clockOf(seconds)} / ${clockOf(duration)}`)
  }, [])

  useEffect(() => {
    totalRef.current = total
    paint(positionRef.current)
  }, [total, paint])

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      const engine = new VinylEngine()
      /* 真实音频读到元数据后会把实际长度报回来 */
      engine.onDuration = (seconds) => {
        if (Number.isFinite(seconds) && seconds > 0) setTrackDuration(seconds)
      }
      engineRef.current = engine
    }
    return engineRef.current
  }, [])

  /* 换曲先回到曲目表里的兜底长度，真实元数据到了再被 onDuration 覆盖 */
  useEffect(() => {
    setTrackDuration(vinylTracks[trackIndex].duration ?? 0)
  }, [trackIndex])

  /* 挂载时就把首曲排进下载 / 解码队列，等下载开始后再预热音频图：
     预加载结束时文件与音频节点都已就绪，标题动画启动那一刻就能直接出声 */
  useEffect(() => {
    const engine = getEngine()
    engine.preload()
    const id = window.setTimeout(() => engine.warm(), 320)
    return () => window.clearTimeout(id)
  }, [getEngine])

  /* 音量槽悬停：指针一进入（喇叭或左侧滑槽）就展开；
     离开后留 0.5s，让指针能穿过图标与滑槽之间那道缝，落到滑槽上继续停留 */
  const showVolume = useCallback(() => {
    if (volTimer.current) {
      window.clearTimeout(volTimer.current)
      volTimer.current = 0
    }
    setVolHover(true)
  }, [])

  const hideVolumeSoon = useCallback(() => {
    if (volTimer.current) window.clearTimeout(volTimer.current)
    volTimer.current = window.setTimeout(() => {
      volTimer.current = 0
      setVolHover(false)
      /* 指针已经不在音量区域，点按锁定的展开也一并收回 */
      setVolOpen(false)
    }, 500)
  }, [])

  const closeVolume = useCallback(() => {
    if (volTimer.current) {
      window.clearTimeout(volTimer.current)
      volTimer.current = 0
    }
    setVolHover(false)
    setVolOpen(false)
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

  /* 展开 / 收起：宽度与内容交给 GSAP 编排，收起时内容先退、面板后收，展开时反过来。
     比单纯给 width 加 CSS 过渡更顺：内容按 0.06s 依次进场，唱片与面板同时位移。 */
  useEffect(() => {
    const panel = panelRef.current
    const inner = innerRef.current
    const head = headRef.current
    if (!panel) return

    const speed = prefersReducedMotion() ? 0.01 : 1
    const full = Math.round(inner?.offsetWidth || 0) || 268
    const items = inner ? (Array.from(inner.children) as HTMLElement[]) : []
    let timeline: ReturnType<typeof gsap.timeline> | null = null

    gsap.killTweensOf([panel, head, ...items].filter(Boolean) as HTMLElement[])
    scheduleTone()

    if (open) {
      timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
      timeline.to(panel, { width: full, opacity: 1, duration: 0.62 * speed, ease: 'expo.out' }, 0)
      if (head) timeline.to(head, { x: -14, duration: 0.62 * speed, ease: 'expo.out' }, 0)
      if (items.length) {
        timeline.fromTo(
          items,
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.42 * speed, stagger: 0.06 * speed, ease: 'power2.out' },
          0.1 * speed
        )
      }
    } else {
      timeline = gsap.timeline({ defaults: { ease: 'power2.in' } })
      if (items.length) {
        timeline.to(items, { opacity: 0, x: -6, duration: 0.2 * speed, stagger: 0.035 * speed }, 0)
      }
      timeline.to(panel, { width: 0, opacity: 0, duration: 0.44 * speed, ease: 'expo.in' }, 0.06)
      if (head) timeline.to(head, { x: 0, duration: 0.52 * speed, ease: 'power3.out' }, 0.06)
    }

    /* 展开后整块变宽，若右侧越界就把播放器往回拉一点，保证控制条完整可见 */
    let pullTimer = 0
    if (open) {
      pullTimer = window.setTimeout(() => {
        const root = rootRef.current
        if (!root) return
        const rect = root.getBoundingClientRect()
        const overflow = rect.right + MARGIN - (window.innerWidth - MARGIN)
        if (overflow > 0) setOffset((current) => ({ ...current, x: current.x - overflow }))
      }, 680)
    }

    return () => {
      if (pullTimer) window.clearTimeout(pullTimer)
      timeline?.kill()
    }
  }, [open, scheduleTone])

  /* 换曲时标题做一次进场位移，像一页唱片说明被翻过去 */
  useEffect(() => {
    const title = titleRef.current
    if (!title || prefersReducedMotion()) return
    gsap.fromTo(
      title,
      { opacity: 0, x: 10 },
      { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out', overwrite: true }
    )
  }, [trackIndex])

  /* 视口变小时把控件拉回屏幕内；跨过断点时面板宽度由 CSS 变量换了，同步一下 GSAP 写的宽度 */
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
      if (open) {
        const panel = panelRef.current
        const inner = innerRef.current
        if (panel && inner) gsap.set(panel, { width: inner.offsetWidth })
      }
      scheduleTone()
    }

    window.addEventListener('resize', keepInside)
    return () => window.removeEventListener('resize', keepInside)
  }, [open, scheduleTone])

  /* 进入页面加载完成后自动播放 ------------------------------------------- */

  useEffect(() => {
    if (!ui.introDone || autoStarted.current) return
    /* introDone 就是首页标题动画起笔的时刻：同步开声，不加任何延迟 */
    autoStarted.current = true
    if (userPaused.current) return
    const engine = getEngine()
    engine.setVolume(volumeRef.current)
    engine.setTrack(0)
    engine.play()
    setPlaying(true)
  }, [ui.introDone, getEngine])

  /* 自动播放可能被浏览器拦下：轮询上下文状态，没声时在唱片上方提示一次点击即可 */
  useEffect(() => {
    if (!playing) return
    setAudible(Boolean(engineRef.current?.audible))
    const id = window.setInterval(() => setAudible(Boolean(engineRef.current?.audible)), 900)
    return () => window.clearInterval(id)
  }, [playing])

  /* 进度与自动切歌 -------------------------------------------------------- */

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const engine = engineRef.current
      if (!engine || scrubbing.current) return
      const next = engine.position()
      if (total > 0 && next >= total - 0.12) {
        shiftTrack(1)
        return
      }
      paint(next)
    }, 200)
    return () => window.clearInterval(id)
  }, [playing, trackIndex, total, paint])

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
    /* 控制条收起时频谱不可见，没必要每帧采样与写样式 */
    if (!open) return
    if (prefersReducedMotion()) return

    let frame = 0
    let last = 0
    const values = new Float32Array(bars.length)

    const draw = (now: number) => {
      /* 频谱柱状图 30fps 已经足够顺滑，主线程开销减半 */
      if (now - last < 1000 / 30 - 2) {
        frame = window.requestAnimationFrame(draw)
        return
      }
      last = now
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
  }, [playing, open])

  /* 点页面其它地方就把控制条合上 */
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current
      if (!root) return
      if (root.contains(event.target as Node)) return
      setOpen(false)
      closeVolume()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, closeVolume])

  useEffect(
    () => () => {
      engineRef.current?.dispose()
      engineRef.current = null
      if (toneFrame.current) window.cancelAnimationFrame(toneFrame.current)
      if (volTimer.current) window.clearTimeout(volTimer.current)
    },
    []
  )

  /* 交互 ---------------------------------------------------------------- */

  function pulseSpark() {
    const spark = sparkRef.current
    if (!spark || prefersReducedMotion()) return
    gsap.fromTo(
      spark,
      { opacity: 0.85, scale: 0.6 },
      { opacity: 0, scale: 2, duration: 0.65, ease: 'power2.out', overwrite: true }
    )
  }

  function togglePlay() {
    pulseSpark()
    const engine = getEngine()
    if (playing) {
      /* 自动播放被浏览器拦下时第一次点击只负责唤醒声音，不当作暂停 */
      if (!engine.audible) {
        engine.kick()
        return
      }
      userPaused.current = true
      engine.pause()
      setPlaying(false)
      return
    }
    userPaused.current = false
    engine.setVolume(volumeRef.current)
    engine.setTrack(trackIndex)
    engine.play()
    setPlaying(true)
  }

  function shiftTrack(direction: number) {
    const next = (trackIndex + direction + vinylTracks.length) % vinylTracks.length
    setTrackIndex(next)
    paint(0)
    getEngine().setTrack(next)
  }

  function changeVolume(value: number) {
    volumeRef.current = value
    setVolume(value)
    getEngine().setVolume(value)
  }

  function seekTo(value: number) {
    paint(value)
    getEngine().seek(value)
  }

  /* 拖拽：以「唱片本体」为夹紧基准，所以控制条展开后也能在整页范围内移动；
     松手后再检查整块（唱片 + 控制条）有没有出屏，需要时用过渡把它拉回来。 */
  function onDiscDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    const root = rootRef.current
    if (!root) return
    const head = headRef.current?.getBoundingClientRect()
    const bounds = head ?? root.getBoundingClientRect()

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      head: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onDiscMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag.active || !drag.head) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved) {
      if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
      drag.moved = true
    }

    const head = drag.head
    setOffset({
      x: clamp(drag.baseX + dx, MARGIN - head.left, window.innerWidth - MARGIN - head.right),
      y: clamp(drag.baseY + dy, MARGIN - head.top, window.innerHeight - MARGIN - head.bottom)
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

  function settle() {
    window.setTimeout(() => {
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      let dx = 0
      let dy = 0
      if (rect.right + MARGIN > window.innerWidth) dx = window.innerWidth - MARGIN - rect.right
      else if (rect.left < MARGIN) dx = MARGIN - rect.left
      if (rect.bottom + MARGIN > window.innerHeight) dy = window.innerHeight - MARGIN - rect.bottom
      else if (rect.top < MARGIN) dy = MARGIN - rect.top
      if (dx || dy) setOffset((current) => ({ x: current.x + dx, y: current.y + dy }))
      scheduleTone()
    }, 90)
  }

  function onDiscUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag.active) return
    const tapped = !drag.moved
    const moved = drag.moved
    endDrag(event)
    if (tapped) {
      /* 手指抬起本身就是一次手势：顺手把被拦下的声音唤醒 */
      getEngine().kick()
      setOpen((value) => !value)
    } else if (moved) settle()
  }

  const hint = !open && playing && !audible
    ? 'Tap for sound'
    : playing
      ? 'Now playing'
      : open
        ? 'Drag me'
        : 'Tap to open'
  const muted = volume <= 0.02
  const volShown = volOpen || volHover

  return (
    <div
      ref={rootRef}
      className={`vinyl-player${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}${
        volShown ? ' is-vol-open' : ''
      }`}
      data-tone={tone}
      data-playing={playing ? 'true' : 'false'}
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
      role="group"
      aria-label={t('黑胶音乐播放器', 'Vinyl music player')}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement
        if (volShown && !target.closest('.vinyl-player__vol')) closeVolume()
      }}
      /* 菜单打开时整块让出焦点与点击，和 #main 一样退到后面 */
      inert={ui.menuOpen || undefined}
    >
      <div ref={headRef} className="vinyl-player__head">
        <button
          className="vinyl-player__disc"
          type="button"
          aria-expanded={open}
          aria-label={open ? '收起播放器' : '展开播放器，按住可拖动位置'}
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
            {track.cover ? (
              <span className="vinyl-player__label vinyl-player__label--art">
                <img src={track.cover} alt="" draggable={false} />
              </span>
            ) : (
              <span className="vinyl-player__label">
                <span className="vinyl-player__label-no">
                  {String(trackIndex + 1).padStart(2, '0')}
                </span>
                <span className="vinyl-player__label-rule" />
                <span className="vinyl-player__label-side">LY</span>
              </span>
            )}
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

      <div ref={panelRef} className="vinyl-player__panel" inert={!open}>
        <div ref={innerRef} className="vinyl-player__panel-inner">
          <div className="vinyl-player__meta mono">
            <span>{track.side}</span>
            <span ref={timeRef} className="vinyl-player__time" />
          </div>

          <div ref={titleRef} className="vinyl-player__title">
            <span className="vinyl-player__title-en">{track.title}</span>
            <span className="vinyl-player__title-cn">{track.cn}</span>
          </div>

          <label className="vinyl-player__progress">
            <span className="sr-only">{t('播放进度', 'Playback progress')}</span>
            <input
              ref={rangeRef}
              type="range"
              min={0}
              max={total || 1}
              step={0.1}
              defaultValue={0}
              onChange={(event) => seekTo(Number(event.target.value))}
              onPointerDown={() => {
                scrubbing.current = true
              }}
              onPointerUp={() => {
                scrubbing.current = false
              }}
              onPointerCancel={() => {
                scrubbing.current = false
              }}
            />
          </label>

          <div className="vinyl-player__controls">
            <button
              className="vinyl-player__btn"
              type="button"
              aria-label={t('上一首', 'Previous track')}
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
              onClick={togglePlay}
            >
              <span ref={sparkRef} className="vinyl-player__spark" aria-hidden="true" />
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
              aria-label={t('下一首', 'Next track')}
              onClick={() => shiftTrack(1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 5v14" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M5 5l9 7-9 7z" fill="currentColor" />
              </svg>
            </button>

            <span ref={meterRef} className="vinyl-player__meter" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }, (_, index) => (
                <span key={index} />
              ))}
            </span>

            <div
              className="vinyl-player__vol"
              /* 悬停即展开；移到左侧滑槽也算「在音量区域」，离开 0.5s 后才收回 */
              onPointerEnter={(event) => {
                if (event.pointerType === 'touch') return
                showVolume()
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'touch') return
                hideVolumeSoon()
              }}
            >
              <button
                className="vinyl-player__vol-btn"
                type="button"
                aria-label={muted ? '取消静音并展开音量' : '音量'}
                aria-expanded={volShown}
                onClick={(event) => {
                  /* 鼠标点喇叭不要留下焦点：否则 :focus-within 会把滑槽一直钉住 */
                  if (event.detail > 0) event.currentTarget.blur()
                  setVolOpen((value) => !value)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9h3.2L12 5v14l-4.8-4H4z" fill="currentColor" />
                  {muted ? (
                    <path
                      d="M15.5 9.2l4 5.6M19.5 9.2l-4 5.6"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <path
                        d="M14.6 8.8a4.6 4.6 0 0 1 0 6.4"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                        strokeLinecap="round"
                      />
                      <path
                        d="M17.4 6.2a8.2 8.2 0 0 1 0 11.6"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </svg>
              </button>
              <span className="vinyl-player__vol-flyout">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  style={{ '--vp-vol': `${Math.round(volume * 100)}%` } as CSSProperties}
                  aria-label={t('音量', 'Volume')}
                  onChange={(event) => changeVolume(Number(event.target.value))}
                  /* 鼠标拖完音量放开焦点，滑槽收起后不会因为 :focus-within 留一条假影 */
                  onPointerUp={(event) => {
                    if (event.pointerType !== 'touch') event.currentTarget.blur()
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
