<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap, SplitText } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { ui } from '../stores/ui'
import { site } from '../data/site'
import { works } from '../data/works'
import DitherVeil from './DitherVeil.vue'

const title = ref(null)
const hero = ref(null)
const ready = ref(false)

const mode = ref('veil')
const activeIndex = ref(0)
const revealed = ref(false)
const pattern = ref('floyd')

const patterns = ['bayer', 'noise', 'floyd', 'lines']
const veilSrc = '/art/hero-veil.svg'

const footStatus = computed(() => {
  if (mode.value === 'index') return works[activeIndex.value]?.status || 'Live in production'
  return revealed.value ? 'Signal revealed' : 'Veil intact'
})

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

/* Veil panel -------------------------------------------------------------- */

function setMode(next) {
  if (next === 'index') activeIndex.value = 0
  mode.value = next
}

function setPattern(next) {
  pattern.value = next
  revealed.value = true
}

function onReveal() {
  if (!revealed.value) revealed.value = true
}

function setActive(index) {
  activeIndex.value = index
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
        :class="{ 'is-index': mode === 'index' }"
        data-cursor="Reveal"
        aria-labelledby="hero-panel-label"
      >
        <div class="hero__veil">
          <DitherVeil
            :src="veilSrc"
            fit="cover"
            :pattern="pattern"
            :pixel-size="2.2"
            :levels="2"
            palette="duotone"
            ink-color="#08080a"
            paper-color="#f2ede4"
            :contrast="1.16"
            :brightness="-0.02"
            :reveal-radius="168"
            :softness="0.55"
            :linger="1.1"
            rim-color="#ff5a2f"
            :rim="0.12"
            :wander="mode === 'veil'"
            :click-burst="mode === 'veil'"
            @reveal="onReveal"
          />
        </div>

        <div class="hero__panel-ui">
          <div class="hero__panel-top">
            <div class="hero__panel-head mono">
              <span id="hero-panel-label">
                {{ mode === 'veil' ? 'Dithered veil · 抖动之幕' : 'Selected work · 精选项目' }}
              </span>
              <div class="hero__panel-tabs">
                <button
                  class="hero__panel-tab"
                  type="button"
                  :class="{ 'is-on': mode === 'veil' }"
                  :aria-pressed="mode === 'veil'"
                  @click="setMode('veil')"
                >
                  Veil
                </button>
                <button
                  class="hero__panel-tab"
                  type="button"
                  :class="{ 'is-on': mode === 'index' }"
                  :aria-pressed="mode === 'index'"
                  @click="setMode('index')"
                >
                  Index
                </button>
              </div>
            </div>

            <p
              v-show="mode === 'veil'"
              class="hero__veil-hint mono"
              :class="{ 'is-hidden': revealed }"
            >
              Move to reveal · click to burst
            </p>
          </div>

          <nav v-show="mode === 'index'" class="hero__index" aria-label="精选项目索引">
            <RouterLink
              v-for="(work, index) in works"
              :key="work.slug"
              :to="`/work/${work.slug}`"
              class="hero__row"
              :class="{ 'is-active': index === activeIndex }"
              :style="{ '--row-accent': work.accent }"
              data-cursor="Open"
              @pointerenter="setActive(index)"
              @focus="setActive(index)"
            >
              <span class="hero__row-no mono">#{{ work.index }}</span>
              <span class="hero__row-title">{{ work.title }}</span>
              <span class="hero__row-cat mono">{{ work.category.split(' / ')[0] }}</span>
              <span class="hero__row-year mono">{{ work.year }}</span>
              <span class="hero__row-arrow" aria-hidden="true">↗</span>
            </RouterLink>
          </nav>

          <div class="hero__panel-bottom">
            <div v-show="mode === 'veil'" class="hero__hud mono" aria-hidden="true">
              <span>PATTERN {{ pattern.toUpperCase() }}</span>
              <span>CELL 2.2</span>
              <span>LEVELS 02</span>
              <span class="hero__hud-ink">INK 08080A</span>
            </div>

            <div
              v-show="mode === 'veil'"
              class="hero__patterns mono"
              role="group"
              aria-label="抖动图案"
            >
              <span class="hero__patterns-label">Pattern</span>
              <button
                v-for="item in patterns"
                :key="item"
                class="hero__pattern"
                type="button"
                :class="{ 'is-on': pattern === item }"
                :aria-pressed="pattern === item"
                @click="setPattern(item)"
              >
                {{ item }}
              </button>
            </div>

            <div class="hero__panel-foot">
              <span class="mono hero__panel-status">
                <span class="dot"></span>
                <span class="hero__panel-status-text">{{ footStatus }}</span>
              </span>
              <RouterLink to="/work" class="mono hero__panel-all" data-cursor="Index">
                <span>All projects</span>
                <span aria-hidden="true">↗</span>
              </RouterLink>
            </div>
          </div>
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

/* Dithered veil ----------------------------------------------------------- */

.hero__panel {
  --panel-pad: clamp(16px, 1.8vw, 26px);
  position: relative;
  justify-self: end;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  height: clamp(330px, 46vh, 460px);
  max-height: 100%;
  padding: 0 var(--panel-pad);
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
    radial-gradient(ellipse 118% 84% at 50% 42%, transparent 38%, rgba(4, 4, 6, 0.5) 100%),
    linear-gradient(180deg, rgba(6, 6, 8, 0.24) 0%, transparent 18%),
    linear-gradient(0deg, rgba(6, 6, 8, 0.34) 0%, transparent 20%);
  content: '';
  pointer-events: none;
}

.hero__veil {
  position: absolute;
  inset: 0;
  z-index: 0;
  transition:
    opacity 0.7s ease,
    filter 0.7s ease;
}

.hero__panel.is-index .hero__veil {
  opacity: 0.18;
  filter: saturate(0.35) brightness(0.8);
}

.hero__panel-ui {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.hero__panel-top {
  margin: 0 calc(var(--panel-pad) * -1);
  padding: var(--panel-pad) var(--panel-pad) 20px;
  background: linear-gradient(
    180deg,
    rgba(4, 4, 6, 0.96) 0%,
    rgba(4, 4, 6, 0.82) 58%,
    rgba(4, 4, 6, 0) 100%
  );
}

.hero__panel-bottom {
  margin: auto calc(var(--panel-pad) * -1) calc(var(--panel-pad) * -1);
  padding: 26px var(--panel-pad) var(--panel-pad);
  background: linear-gradient(
    0deg,
    rgba(4, 4, 6, 0.96) 0%,
    rgba(4, 4, 6, 0.84) 62%,
    rgba(4, 4, 6, 0) 100%
  );
}

.hero__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(242, 237, 228, 0.66);
  font-size: 7.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero__panel-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.hero__panel-tab {
  color: rgba(242, 237, 228, 0.32);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: color 0.3s ease;
}

.hero__panel-tab::before {
  display: inline-block;
  width: 4px;
  height: 4px;
  margin-right: 5px;
  border-radius: 50%;
  background: currentColor;
  content: '';
  opacity: 0.4;
  transition:
    opacity 0.3s ease,
    box-shadow 0.3s ease;
  vertical-align: 1px;
}

.hero__panel-tab:hover {
  color: rgba(242, 237, 228, 0.78);
}

.hero__panel-tab.is-on {
  color: var(--paper);
}

.hero__panel-tab.is-on::before {
  background: var(--acid);
  box-shadow: 0 0 6px rgba(216, 255, 67, 0.8);
  opacity: 1;
}

.hero__hud {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 9px;
  color: rgba(242, 237, 228, 0.5);
  font-size: 6.8px;
  letter-spacing: 0.1em;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.hero__hud span + span::before {
  margin-right: 6px;
  color: rgba(242, 237, 228, 0.22);
  content: '/';
}

.hero__hud-ink {
  color: rgba(255, 154, 106, 0.8);
}

.hero__veil-hint {
  margin-top: 7px;
  color: rgba(255, 154, 106, 0.7);
  font-size: 7px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  pointer-events: none;
  transition:
    opacity 0.7s ease,
    transform 0.7s var(--ease-out);
}

.hero__veil-hint.is-hidden {
  opacity: 0;
  transform: translateY(-4px);
}

.hero__patterns {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 11px;
  font-size: 7px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero__patterns-label {
  color: rgba(242, 237, 228, 0.3);
}

.hero__pattern {
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
  color: rgba(242, 237, 228, 0.44);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition:
    color 0.3s ease,
    border-color 0.3s ease;
}

.hero__pattern:hover {
  color: var(--paper);
}

.hero__pattern.is-on {
  border-bottom-color: var(--acid);
  color: var(--acid);
}

/* Selected work index (restored inside the panel) ------------------------- */

.hero__index {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  margin-top: clamp(8px, 1.6vh, 18px);
  overflow-y: auto;
  scrollbar-width: none;
  animation: index-in 0.5s var(--ease-out) both;
}

.hero__index::-webkit-scrollbar {
  display: none;
}

@keyframes index-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

.hero__row {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto 32px 14px;
  gap: 10px;
  align-items: center;
  padding: clamp(5px, 0.8vh, 9px) 2px;
  border-top: 1px solid rgba(242, 237, 228, 0.13);
  color: rgba(242, 237, 228, 0.68);
  transition:
    color 0.3s ease,
    background-color 0.35s ease;
}

.hero__row:last-child {
  border-bottom: 1px solid rgba(242, 237, 228, 0.13);
}

.hero__row::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--row-accent);
  content: '';
  transform: scaleY(0);
  transform-origin: top center;
  transition: transform 0.4s var(--ease-out);
}

.hero__row.is-active,
.hero__row:hover {
  color: var(--paper);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 74%);
}

.hero__row.is-active::before,
.hero__row:hover::before {
  transform: scaleY(1);
}

.hero__row-no {
  color: var(--fg-faint);
  font-size: 7.5px;
  letter-spacing: 0.06em;
  transition: color 0.3s ease;
}

.hero__row.is-active .hero__row-no {
  color: var(--row-accent);
}

.hero__row-title {
  overflow: hidden;
  font-family: var(--font-serif);
  font-size: clamp(1rem, 1.35vw, 1.3rem);
  line-height: 1.12;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero__row-cat {
  color: var(--fg-faint);
  font-size: 7px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.hero__row-year {
  color: var(--fg-faint);
  font-size: 7.5px;
  text-align: right;
}

.hero__row-arrow {
  color: var(--paper);
  font-size: 12px;
  opacity: 0;
  transform: translate(-2px, 2px);
  transition:
    opacity 0.3s ease,
    transform 0.4s var(--ease-out);
}

.hero__row.is-active .hero__row-arrow,
.hero__row:hover .hero__row-arrow {
  opacity: 1;
  transform: none;
}

.hero__panel-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--paper);
  white-space: nowrap;
  transition: color 0.35s ease;
}

.hero__panel-all:hover {
  color: var(--acid);
}

.hero__panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 10px;
  padding-top: 10px;
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
    --panel-pad: 16px;
    height: 300px;
  }

  .hero__panel-head {
    font-size: 7px;
  }

  .hero__patterns {
    gap: 9px;
  }

  .hero__index {
    margin-top: 10px;
  }

  .hero__row {
    grid-template-columns: 26px minmax(0, 1fr) auto 12px;
    gap: 8px;
  }

  .hero__row-cat {
    display: none;
  }

  .hero__row-title {
    font-size: 1.02rem;
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
