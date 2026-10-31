<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { gsap, SplitText } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { ui } from '../stores/ui'
import { site } from '../data/site'

const title = ref(null)
const hero = ref(null)
const ready = ref(false)

const fieldEl = ref(null)
const canvasEl = ref(null)

const hud = reactive({ x: '0.500', y: '0.500', energy: '0.00', ripples: '00' })
const touched = ref(false)
const fieldZoom = ref('1.00')
const stereo = ref(false)

let stereoTimer = null

const fieldStatus = computed(() => {
  const energy = Number(hud.energy)
  if (energy > 0.55) return 'Field saturated'
  if (energy > 0.18) return 'Disturbance detected'
  return 'Nothing here is static'
})

let splits = []
let readyTimeline
let scrollTween
let hasPlayed = false
let fieldState = null
let fieldTicker = null
let fieldObserver = null

/* Intro ------------------------------------------------------------------ */

function splitTitle() {
  const lines = title.value?.querySelectorAll('.hero__line-inner')
  if (!lines?.length) return
  splits = Array.from(lines).map((line) =>
    new SplitText(line, {
      type: 'chars',
      charsClass: 'hero-char'
    })
  )
}

function playIntro() {
  if (hasPlayed || !ui.introDone) return
  hasPlayed = true
  ready.value = true

  if (prefersReducedMotion()) {
    gsap.set('.hero__title', { opacity: 1 })
    gsap.set('.hero__kicker', { opacity: 1, y: 0 })
    gsap.set('.hero-fade', { opacity: 1, y: 0 })
    return
  }

  const chars = splits.flatMap((split) => split.chars)

  gsap.set('.hero__title', { opacity: 1 })
  gsap.set('.hero-fade', { opacity: 0, y: 24 })

  readyTimeline = gsap.timeline({ delay: 0.08 })
  readyTimeline.to(chars, {
    yPercent: 0,
    opacity: 1,
    rotate: 0,
    duration: 1.35,
    ease: 'expo.out',
    stagger: {
      each: 0.028,
      from: 'start'
    }
  })
  readyTimeline.to(
    '.hero__kicker',
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
    '-=1'
  )
  readyTimeline.to(
    '.hero-fade',
    {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.12
    },
    '-=0.8'
  )
}

/* Scroll ----------------------------------------------------------------- */

function createScrollMotion() {
  if (prefersReducedMotion()) return

  scrollTween = gsap.timeline({
    scrollTrigger: {
      trigger: hero.value,
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  })

  scrollTween
    .to('.hero__lead', { yPercent: -5, ease: 'none' }, 0)
    .to('.hero__panel', { yPercent: -9, ease: 'none' }, 0)

  gsap.to('.hero__bottom', {
    yPercent: -14,
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: hero.value,
      start: 'top top',
      end: '65% top',
      scrub: true
    }
  })
}

/* Interactive field ------------------------------------------------------ */

const ACCENT = '255, 90, 47'

function resizeField() {
  const s = fieldState
  const canvas = canvasEl.value
  const wrap = fieldEl.value
  if (!s || !canvas || !wrap) return

  const rect = wrap.getBoundingClientRect()
  s.w = Math.max(1, rect.width)
  s.h = Math.max(1, rect.height)
  s.dpr = Math.min(2, window.devicePixelRatio || 1)

  canvas.width = Math.round(s.w * s.dpr)
  canvas.height = Math.round(s.h * s.dpr)
  s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)

  s.gap = Math.max(15, Math.min(30, s.w / 26))
  s.cols = Math.ceil(s.w / s.gap) + 1
  s.rows = Math.ceil(s.h / s.gap) + 1

  drawField(s, 0)
}

function drawField(s, energy) {
  const { ctx, w, h, gap } = s
  if (!w || !h) return

  ctx.clearRect(0, 0, w, h)

  const px = s.smooth.x * w
  const py = s.smooth.y * h
  const radius = Math.min(w, h) * 0.55
  const glow = ctx.createRadialGradient(px, py, 0, px, py, radius)
  glow.addColorStop(0, `rgba(${ACCENT}, ${0.12 + energy * 0.12})`)
  glow.addColorStop(0.55, `rgba(${ACCENT}, 0.035)`)
  glow.addColorStop(1, `rgba(${ACCENT}, 0)`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  // Build the displaced lattice once, then reuse it for the mesh and dots.
  const pts = []
  for (let row = 0; row < s.rows; row++) {
    for (let col = 0; col < s.cols; col++) {
      const x = col * gap
      const y = row * gap

      const dx = x - px
      const dy = y - py
      const dist = Math.hypot(dx, dy) || 1
      const influence = Math.max(0, 1 - dist / radius)
      const push = influence * influence * (14 + energy * 52)

      let ox = (dx / dist) * push
      let oy = (dy / dist) * push
      let boost = influence * 0.9

      for (const ripple of s.ripples) {
        const rd = Math.hypot(x - ripple.x, y - ripple.y) || 1
        const band = Math.exp(-((rd - ripple.age * 340) ** 2) / (2 * 46 * 46))
        const decay = Math.max(0, 1 - ripple.age / 3.1)
        const amp = band * decay * (32 * ripple.amp)
        if (amp > 0.05) {
          ox += ((x - ripple.x) / rd) * amp
          oy += ((y - ripple.y) / rd) * amp
          boost = Math.max(boost, band * decay * 1.7)
        }
      }

      pts.push(x + ox, y + oy, boost)
    }
  }

  // Warped mesh
  ctx.strokeStyle = 'rgba(242, 237, 228, 0.055)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let row = 0; row < s.rows; row++) {
    for (let col = 0; col < s.cols; col++) {
      const i = (row * s.cols + col) * 3
      if (col === 0) ctx.moveTo(pts[i], pts[i + 1])
      else ctx.lineTo(pts[i], pts[i + 1])
    }
  }
  for (let col = 0; col < s.cols; col++) {
    for (let row = 0; row < s.rows; row++) {
      const i = (row * s.cols + col) * 3
      if (row === 0) ctx.moveTo(pts[i], pts[i + 1])
      else ctx.lineTo(pts[i], pts[i + 1])
    }
  }
  ctx.stroke()

  // Resting nodes
  ctx.fillStyle = 'rgba(242, 237, 228, 0.22)'
  ctx.beginPath()
  for (let i = 0; i < pts.length; i += 3) {
    if (pts[i + 2] > 0.32) continue
    ctx.moveTo(pts[i] + 1.15, pts[i + 1])
    ctx.arc(pts[i], pts[i + 1], 1.15, 0, Math.PI * 2)
  }
  ctx.fill()

  // Excited nodes
  for (let i = 0; i < pts.length; i += 3) {
    const boost = pts[i + 2]
    if (boost <= 0.32) continue
    const size = 1.2 + Math.min(1, boost) * 1.9
    ctx.beginPath()
    ctx.fillStyle = `rgba(${ACCENT}, ${0.34 + Math.min(0.6, boost * 0.5)})`
    ctx.arc(pts[i], pts[i + 1], size, 0, Math.PI * 2)
    ctx.fill()
  }

  // Signal trace along the pointer's vertical axis
  const amp = 6 + energy * 16
  ctx.strokeStyle = `rgba(${ACCENT}, ${0.26 + energy * 0.24})`
  ctx.lineWidth = 1
  for (let line = 0; line < 2; line++) {
    ctx.beginPath()
    for (let x = 0; x <= w; x += 4) {
      const dist = Math.abs(x - px)
      const envelope = Math.exp(-(dist * dist) / (2 * (w * 0.32) ** 2))
      const y = py + Math.sin(x * 0.028 + s.clock * 2.2 + line * 1.6) * amp * envelope
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Pointer reticle
  const ring = 9 + energy * 14
  ctx.strokeStyle = `rgba(${ACCENT}, ${0.42 + energy * 0.36})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(px, py, ring, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(px - ring - 6, py)
  ctx.lineTo(px - ring - 14, py)
  ctx.moveTo(px + ring + 6, py)
  ctx.lineTo(px + ring + 14, py)
  ctx.moveTo(px, py - ring - 6)
  ctx.lineTo(px, py - ring - 14)
  ctx.moveTo(px, py + ring + 6)
  ctx.lineTo(px, py + ring + 14)
  ctx.stroke()
}

function syncHud(s, energy) {
  hud.x = s.smooth.x.toFixed(3)
  hud.y = s.smooth.y.toFixed(3)
  hud.energy = energy.toFixed(2)
  hud.ripples = String(s.ripples.length).padStart(2, '0')
  fieldZoom.value = `${(1 + energy * 0.06).toFixed(2)}x`
}

function tickField(time) {
  const s = fieldState
  if (!s) return

  const dt = s.last ? Math.min(0.066, time - s.last) : 0.016
  s.last = time
  s.clock += dt

  if (!s.active) {
    // Idle: a slow ghost pointer keeps the field breathing on its own.
    s.idle += dt
    const t = s.clock * 0.42
    s.target.x = 0.5 + Math.cos(t) * 0.33
    s.target.y = 0.5 + Math.sin(t * 1.55) * 0.27
    if (s.idle > 3 && s.ripples.length === 0 && Math.random() < 0.004) {
      s.ripples.push({ x: s.w * (0.3 + Math.random() * 0.4), y: s.h * (0.3 + Math.random() * 0.4), age: 0, amp: 0.7 })
    }
  }

  const ease = Math.min(1, dt * 8)
  s.smooth.x += (s.target.x - s.smooth.x) * ease
  s.smooth.y += (s.target.y - s.smooth.y) * ease

  for (const ripple of s.ripples) ripple.age += dt
  s.ripples = s.ripples.filter((ripple) => ripple.age < 3.1)

  s.energy *= Math.pow(0.82, dt * 3.4)
  if (s.ripples.length && s.energy < 0.12) s.energy = 0.12

  drawField(s, s.energy)
  if (time - s.hudAt > 0.1) {
    s.hudAt = time
    syncHud(s, s.energy)
  }
}

function initField() {
  const canvas = canvasEl.value
  if (!canvas) return

  const s = {
    ctx: canvas.getContext('2d'),
    w: 0,
    h: 0,
    dpr: 1,
    gap: 22,
    cols: 1,
    rows: 1,
    target: { x: 0.5, y: 0.5 },
    smooth: { x: 0.5, y: 0.5 },
    active: false,
    idle: 0,
    energy: 0.1,
    ripples: [],
    clock: 0,
    last: 0,
    hudAt: 0
  }

  fieldState = s
  syncHud(s, s.energy)
  resizeField()

  if (prefersReducedMotion()) {
    s.energy = 0.06
    drawField(s, s.energy)
  } else {
    fieldTicker = (time) => tickField(time)
    gsap.ticker.add(fieldTicker)
  }

  fieldObserver = new ResizeObserver(() => resizeField())
  fieldObserver.observe(fieldEl.value)
}

function onFieldMove(event) {
  const s = fieldState
  if (!s || !fieldEl.value) return

  const rect = fieldEl.value.getBoundingClientRect()
  s.target.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  s.target.y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  s.active = true
  s.idle = 0
  if (!touched.value) touched.value = true
}

function onFieldLeave() {
  const s = fieldState
  if (!s) return
  s.active = false
  s.idle = 0
}

function addRipple(x, y, amp = 1) {
  const s = fieldState
  if (!s) return
  s.ripples.push({ x: x * s.w, y: y * s.h, age: 0, amp })
  s.ripples = s.ripples.slice(-5)
  s.energy = Math.min(1.1, s.energy + 0.5)
  if (!touched.value) touched.value = true
}

function onFieldDown(event) {
  const s = fieldState
  if (!s || !fieldEl.value) return
  const rect = fieldEl.value.getBoundingClientRect()
  const nx = (event.clientX - rect.left) / rect.width
  const ny = (event.clientY - rect.top) / rect.height
  addRipple(Math.min(1, Math.max(0, nx)), Math.min(1, Math.max(0, ny)), 1.15)

  // Brief chromatic split on impact, then settle back.
  stereo.value = true
  if (stereoTimer) window.clearTimeout(stereoTimer)
  stereoTimer = window.setTimeout(() => {
    stereo.value = false
  }, 700)
}

function sendPulse() {
  addRipple(0.5, 0.5, 1.3)
}

/* Lifecycle -------------------------------------------------------------- */

onMounted(async () => {
  if (!prefersReducedMotion()) {
    splitTitle()
    gsap.set('.hero__title', { opacity: 0 })
    const chars = splits.flatMap((split) => split.chars)
    gsap.set(chars, { yPercent: 125, opacity: 0, rotate: 5 })
  }
  await nextTick()
  if (ui.introDone) playIntro()
  createScrollMotion()
  initField()
})

watch(
  () => ui.introDone,
  (done) => {
    if (done) playIntro()
  }
)

onBeforeUnmount(() => {
  readyTimeline?.kill()
  scrollTween?.scrollTrigger?.kill()
  scrollTween?.kill()
  splits.forEach((split) => split.revert())

  if (fieldTicker) gsap.ticker.remove(fieldTicker)
  if (stereoTimer) window.clearTimeout(stereoTimer)
  fieldObserver?.disconnect()
  fieldTicker = null
  fieldObserver = null
  fieldState = null
})
</script>

<template>
  <section
    id="index"
    ref="hero"
    class="hero"
    :class="{ 'is-ready': ready }"
    data-section="01"
    data-label="Index"
  >
    <div class="hero__ambient" aria-hidden="true"></div>
    <div class="hero__grid" aria-hidden="true"></div>
    <div class="hero__lines" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </div>

    <div class="hero__top shell">
      <div class="hero__edition">
        <span class="mono">Portfolio / Vol. 06</span>
        <span class="mono">2020 — 2026</span>
      </div>
      <span class="hero__top-note mono">Index / 01 — Selected work</span>
    </div>

    <div class="hero__body shell">
      <div class="hero__lead">
        <p class="hero__kicker">Full-stack Web Developer</p>

        <h1 ref="title" class="hero__title">
          <span class="hero__line">
            <span class="hero__line-inner hero__line-inner--one">Full-stack</span>
          </span>
          <span class="hero__line hero__line--two">
            <span class="hero__line-inner hero__line-inner--two">in production.</span>
          </span>
        </h1>

        <div class="hero__sub">
          <p class="hero__cn hero-fade">{{ site.intro }}</p>
          <p class="hero__desc hero-fade">
            全栈网页开发者。从界面、动效到 API 与数据库，一个人把产品
            从原型推进到上线；在意性能、边界条件，也在意那些
            不该让用户等待的瞬间。
          </p>
          <p class="hero__stack hero-fade mono">
            <span v-for="(tech, index) in site.stack" :key="tech">
              {{ tech }}<span v-if="index < site.stack.length - 1" class="hero__stack-sep"> / </span>
            </span>
          </p>
        </div>
      </div>

      <aside
        class="hero__panel hero-fade"
        data-cursor="Disturb"
        aria-labelledby="hero-field-label"
        @pointermove="onFieldMove"
        @pointerleave="onFieldLeave"
        @pointerdown="onFieldDown"
      >
        <div ref="fieldEl" class="hero__field">
          <canvas ref="canvasEl" class="hero__field-canvas" aria-hidden="true"></canvas>
          <div class="hero__field-scan" aria-hidden="true"></div>
        </div>

        <div class="hero__panel-head mono">
          <span id="hero-field-label">Interactive field · 交互场</span>
          <span>Live / cursor driven</span>
        </div>

        <div class="hero__hud mono" aria-hidden="true">
          <span>X {{ hud.x }}</span>
          <span>Y {{ hud.y }}</span>
          <span>E {{ hud.energy }}</span>
          <span>R {{ hud.ripples }}</span>
          <span class="hero__hud-stereo" :class="{ 'is-on': stereo }">
            STEREO {{ stereo ? 'ON' : '—' }}
          </span>
          <span>ZOOM {{ fieldZoom }}</span>
        </div>

        <div class="hero__field-hint" :class="{ 'is-hidden': touched }">
          <p class="hero__field-hint-cn">触碰这个场 —— 每一次移动、拖拽、点击，都会留下波纹。</p>
          <p class="hero__field-hint-en mono">Move · drag · click · disturb</p>
        </div>

        <div class="hero__panel-foot">
          <span class="mono hero__panel-status">
            <span class="dot"></span>
            <span class="hero__panel-status-text">{{ fieldStatus }}</span>
          </span>
          <button
            class="mono hero__panel-action"
            type="button"
            data-cursor="Pulse"
            @pointerdown.stop
            @click="sendPulse"
          >
            <span>Send a pulse</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>
    </div>

    <div class="hero__bottom shell">
      <div class="hero__scroll-hint hero-fade">
        <span class="hero__scroll-line"></span>
        <span class="mono">Scroll to explore</span>
      </div>

      <div class="hero__bottom-meta hero-fade">
        <span class="mono">Beijing, CN</span>
        <span class="mono">{{ site.coords }}</span>
      </div>

      <button
        class="scroll-badge hero-fade"
        type="button"
        aria-label="向下滚动至自述"
        data-cursor="Scroll"
        @click="scrollToSection('manifesto')"
      >
        <svg class="scroll-badge__ring" viewBox="0 0 140 140" aria-hidden="true">
          <defs>
            <path
              id="scroll-circle"
              d="M70,70 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0"
            />
          </defs>
          <text>
            <textPath href="#scroll-circle">
              SCROLL TO EXPLORE · SCROLL TO EXPLORE ·
            </textPath>
          </text>
        </svg>
        <span class="scroll-badge__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 4v16M6 14l6 6 6-6" stroke="currentColor" stroke-width="1.1" />
          </svg>
        </span>
      </button>
    </div>

    <div class="hero__edge hero-fade" aria-hidden="true">
      <span class="mono">Building for the open web</span>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  padding-top: calc(var(--nav-h) + clamp(16px, 2.6vh, 34px));
  padding-bottom: clamp(18px, 2.8vh, 36px);
  overflow: clip;
  background: var(--bg-deep);
  isolation: isolate;
}

.hero__ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 48% 56% at 78% 34%, rgba(255, 90, 47, 0.16), transparent 68%),
    radial-gradient(ellipse 42% 48% at 16% 86%, rgba(122, 103, 255, 0.13), transparent 70%),
    linear-gradient(160deg, #08080a 0%, #050506 56%, #0a0807 100%);
  pointer-events: none;
}

.hero__grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    linear-gradient(to right, rgba(242, 237, 228, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(242, 237, 228, 0.04) 1px, transparent 1px);
  background-size: clamp(64px, 7vw, 110px) clamp(64px, 7vw, 110px);
  -webkit-mask-image: radial-gradient(ellipse 86% 82% at 58% 44%, #000 18%, transparent 78%);
  mask-image: radial-gradient(ellipse 86% 82% at 58% 44%, #000 18%, transparent 78%);
  pointer-events: none;
}

.hero__lines {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0 var(--gutter);
  pointer-events: none;
}

.hero__lines span {
  border-left: 1px solid rgba(242, 237, 228, 0.05);
}

.hero__lines span:last-child {
  border-right: 1px solid rgba(242, 237, 228, 0.05);
}

.hero__top,
.hero__bottom,
.hero__body {
  position: relative;
  z-index: 2;
}

.hero__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  color: var(--fg-dim);
}

.hero__edition {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 9px;
}

.hero__top-note {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero__body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1.18fr) minmax(330px, 0.72fr);
  gap: clamp(30px, 4.5vw, 80px);
  align-items: center;
  padding-block: clamp(16px, 2.6vh, 34px);
}

.hero__lead {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(12px, 1.8vh, 20px);
  min-width: 0;
}

.hero__kicker {
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(16px);
}

.hero__title {
  position: relative;
  z-index: 2;
  margin-left: -0.045em;
  color: var(--paper);
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: 0.78;
  letter-spacing: -0.055em;
  opacity: 0;
}

.hero__line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.06em;
}

.hero__line-inner {
  display: block;
  transform-origin: left bottom;
}

.hero__line-inner--one {
  font-size: clamp(3.4rem, min(9.6vw, 14.4vh), 11.5rem);
}

.hero__line--two {
  padding-left: clamp(20px, 7.4vw, 150px);
}

.hero__line-inner--two {
  font-size: clamp(2.6rem, min(7.6vw, 11.2vh), 8.6rem);
  font-style: italic;
}

.hero__title :deep(.hero-char) {
  display: inline-block;
  will-change: transform, opacity;
}

.hero__sub {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.1vh, 14px);
  max-width: 560px;
  margin-top: clamp(2px, 1vh, 12px);
}

.hero__cn {
  color: var(--paper);
  font-family: var(--font-serif);
  font-size: clamp(15px, 1.25vw, 21px);
  letter-spacing: 0.22em;
}

.hero__desc {
  max-width: 46ch;
  color: rgba(242, 237, 228, 0.78);
  font-size: 13px;
  line-height: 1.85;
}

.hero__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  color: rgba(242, 237, 228, 0.58);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.hero__stack-sep {
  color: var(--line-strong);
}

.hero-fade {
  opacity: 0;
  transform: translateY(24px);
}

/* Interactive field ------------------------------------------------------- */

.hero__panel {
  position: relative;
  justify-self: end;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  max-width: 560px;
  height: clamp(330px, 46vh, 460px);
  max-height: 100%;
  padding: clamp(16px, 1.8vw, 26px);
  border: 1px solid rgba(242, 237, 228, 0.16);
  overflow: hidden;
  background: #08080a;
  cursor: crosshair;
  touch-action: pan-y;
  user-select: none;
}

.hero__panel::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(6, 6, 8, 0.72) 0%, transparent 32%),
    linear-gradient(0deg, rgba(6, 6, 8, 0.8) 0%, transparent 34%);
  content: '';
  pointer-events: none;
}

.hero__field {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero__field-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.hero__field-scan {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 34%;
  background: linear-gradient(90deg, transparent, rgba(255, 90, 47, 0.08), transparent);
  animation: field-scan 9s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  pointer-events: none;
}

@keyframes field-scan {
  0% {
    transform: translateX(-60%);
    opacity: 0;
  }
  12% {
    opacity: 0.8;
  }
  70% {
    opacity: 0.5;
  }
  100% {
    transform: translateX(320%);
    opacity: 0;
  }
}

.hero__panel-head,
.hero__hud,
.hero__field-hint,
.hero__panel-foot {
  position: relative;
  z-index: 2;
}

.hero__panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: rgba(242, 237, 228, 0.66);
  font-size: 7.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  pointer-events: none;
}

.hero__hud {
  position: absolute;
  top: calc(clamp(16px, 1.8vw, 26px) + 20px);
  right: clamp(16px, 1.8vw, 26px);
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: rgba(242, 237, 228, 0.42);
  font-size: 7px;
  letter-spacing: 0.1em;
  text-align: right;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.hero__hud-stereo {
  color: rgba(242, 237, 228, 0.24);
  transition: color 0.25s ease;
}

.hero__hud-stereo.is-on {
  color: var(--acid);
}

.hero__field-hint {
  position: absolute;
  right: clamp(16px, 1.8vw, 26px);
  bottom: 62px;
  left: clamp(16px, 1.8vw, 26px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  pointer-events: none;
  transition:
    opacity 0.8s ease,
    transform 0.8s var(--ease-out);
}

.hero__field-hint.is-hidden {
  opacity: 0;
  transform: translateY(8px);
}

.hero__field-hint-cn {
  max-width: 34ch;
  color: rgba(242, 237, 228, 0.82);
  font-size: 11.5px;
  line-height: 1.7;
  letter-spacing: 0.04em;
}

.hero__field-hint-en {
  color: rgba(255, 154, 106, 0.72);
  font-size: 7px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero__panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 11px;
  border-top: 1px solid rgba(242, 237, 228, 0.16);
  color: rgba(242, 237, 228, 0.58);
  font-size: 7.5px;
  letter-spacing: 0.08em;
}

.hero__panel-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.hero__panel-status .dot {
  flex-shrink: 0;
  background: var(--acid);
  box-shadow: 0 0 8px rgba(216, 255, 67, 0.7);
  animation: status-pulse 2.6s ease-in-out infinite;
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.hero__panel-status-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero__panel-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid rgba(242, 237, 228, 0.24);
  color: var(--paper);
  white-space: nowrap;
  transition:
    color 0.35s ease,
    border-color 0.35s ease,
    background-color 0.35s ease;
}

.hero__panel-action:hover {
  border-color: var(--accent);
  background: rgba(255, 90, 47, 0.12);
  color: var(--paper);
}

/* Bottom bar ------------------------------------------------------------- */

.hero__bottom {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: end;
  color: var(--fg-dim);
}

.hero__scroll-hint {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 8px;
}

.hero__scroll-line {
  position: relative;
  display: block;
  width: 48px;
  height: 1px;
  overflow: hidden;
  background: rgba(242, 237, 228, 0.24);
}

.hero__scroll-line::after {
  position: absolute;
  inset: 0;
  background: var(--paper);
  content: '';
  animation: scroll-line 2.4s var(--ease-in-out) infinite;
  transform-origin: left center;
}

@keyframes scroll-line {
  0% {
    transform: scaleX(0);
    transform-origin: left center;
  }
  45% {
    transform: scaleX(1);
    transform-origin: left center;
  }
  55% {
    transform: scaleX(1);
    transform-origin: right center;
  }
  100% {
    transform: scaleX(0);
    transform-origin: right center;
  }
}

.hero__bottom-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  justify-self: center;
  font-size: 8px;
  text-align: center;
}

.scroll-badge {
  position: relative;
  display: grid;
  width: clamp(88px, 8vw, 118px);
  height: clamp(88px, 8vw, 118px);
  place-items: center;
  justify-self: end;
  border-radius: 50%;
  color: var(--paper);
  transition: transform 0.6s var(--ease-out);
}

.scroll-badge:hover {
  transform: scale(1.06);
}

.scroll-badge__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: ring-spin 22s linear infinite;
}

.scroll-badge:hover .scroll-badge__ring {
  animation-duration: 9s;
}

.scroll-badge__ring text {
  fill: currentColor;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.28em;
  opacity: 0.65;
}

.scroll-badge__arrow {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
}

.scroll-badge__arrow svg {
  width: 18px;
  height: 18px;
}

.scroll-badge:hover .scroll-badge__arrow {
  background: var(--paper);
  color: var(--bg-deep);
}

@keyframes ring-spin {
  to {
    transform: rotate(360deg);
  }
}

.hero__edge {
  position: absolute;
  top: 50%;
  right: calc(var(--gutter) + 2px);
  z-index: 2;
  color: var(--fg-faint);
  transform: translateY(-50%) rotate(90deg);
  transform-origin: center;
  pointer-events: none;
}

.hero__edge .mono {
  font-size: 8px;
  letter-spacing: 0.18em;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .hero__edge {
    display: none;
  }
}

@media (min-width: 901px) and (max-height: 640px) {
  .hero {
    padding-top: calc(var(--nav-h) + 10px);
    padding-bottom: 14px;
  }

  .hero__body {
    gap: clamp(24px, 3.5vw, 56px);
    padding-block: 8px;
  }

  .hero__lead {
    gap: 10px;
  }

  .hero__panel {
    height: 300px;
  }

  .scroll-badge {
    width: 88px;
    height: 88px;
  }
}

@media (max-width: 900px) {
  .hero__body {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: clamp(26px, 4vh, 44px);
  }

  .hero__panel {
    justify-self: stretch;
    max-width: none;
    height: clamp(320px, 42vh, 400px);
  }

  .hero__lead {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .hero {
    padding-top: calc(var(--nav-h) + 14px);
    padding-bottom: 18px;
  }

  .hero__top {
    padding-top: 4px;
  }

  .hero__top-note {
    display: none;
  }

  .hero__body {
    gap: 24px;
    padding-block: 14px 20px;
  }

  .hero__lead {
    gap: 14px;
  }

  .hero__line-inner--one {
    font-size: clamp(2.9rem, 14vw, 5.2rem);
  }

  .hero__line--two {
    padding-left: clamp(8px, 7vw, 40px);
  }

  .hero__line-inner--two {
    font-size: clamp(2.1rem, 10.2vw, 4rem);
  }

  .hero__cn {
    font-size: 13px;
    letter-spacing: 0.18em;
  }

  .hero__desc {
    max-width: 36ch;
    font-size: 11.5px;
  }

  .hero__panel {
    height: 300px;
    padding: 16px;
  }

  .hero__panel-head {
    font-size: 7px;
  }

  .hero__hud {
    position: absolute;
    top: 44px;
    right: 16px;
  }

  .hero__field-hint {
    bottom: 58px;
  }

  .hero__field-hint-cn {
    font-size: 10.5px;
  }

  .hero__panel-status {
    max-width: 56%;
  }

  .hero__bottom {
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 14px;
  }

  .hero__bottom-meta {
    display: none;
  }

  .hero__scroll-hint {
    align-self: center;
  }

  .scroll-badge {
    width: 84px;
    height: 84px;
  }
}

@media (max-width: 760px) and (max-height: 820px) {
  .hero {
    padding-bottom: 12px;
  }

  .hero__body {
    padding-block: 10px 12px;
  }

  .hero__panel {
    height: 270px;
  }
}

@media (max-width: 420px) {
  .hero__scroll-line {
    width: 28px;
  }

  .hero__scroll-hint .mono {
    font-size: 7px;
  }
}
</style>
