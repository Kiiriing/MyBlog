<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap, SplitText } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { ui } from '../stores/ui'
import { site } from '../data/site'

const title = ref(null)
const hero = ref(null)
const ready = ref(false)

let splits = []
let readyTimeline
let scrollTween
let hasPlayed = false

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
      <span class="hero__top-note mono">Index / 01 — Full-stack</span>
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

      <aside class="hero__panel hero-fade" aria-hidden="true"></aside>
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

/* Hero panel frame -------------------------------------------------------- */

.hero__panel {
  position: relative;
  justify-self: end;
  width: 100%;
  max-width: 560px;
  height: clamp(330px, 46vh, 460px);
  max-height: 100%;
  border: 1px solid rgba(242, 237, 228, 0.14);
  overflow: hidden;
  background:
    radial-gradient(ellipse 100% 76% at 66% 30%, rgba(255, 90, 47, 0.1), transparent 72%),
    linear-gradient(180deg, #0a0a0c 0%, #060607 100%);
}

.hero__panel::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(242, 237, 228, 0.05) 0%,
    transparent 38%,
    rgba(122, 103, 255, 0.06) 100%
  );
  content: '';
  pointer-events: none;
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
    display: none;
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
