<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap, ScrollTrigger } from '../lib/gsap'
import {
  getLenis,
  prefersReducedMotion,
  scrollTo,
  scrollToSection
} from '../composables/useSmoothScroll'
import { works } from '../data/works'
import ArtworkFrame from './ArtworkFrame.vue'

const section = ref(null)
const track = ref(null)
const viewport = ref(null)
const progress = ref(0)

let trackTween = null
let maxX = 0
let resizeTimer = null
let dragging = false
let didDrag = false
let startX = 0
let startScroll = 0

const currentIndex = computed(() => {
  const total = works.length
  if (progress.value >= 0.995) return total
  const index = Math.floor(progress.value * total) + 1
  return Math.min(total, Math.max(1, index))
})

const currentWork = computed(() => works[currentIndex.value - 1])
const counter = computed(() => String(currentIndex.value).padStart(2, '0'))
const totalCount = String(works.length).padStart(2, '0')
const canPrev = computed(() => progress.value > 0.015)
const canNext = computed(() => progress.value < 0.985)

function measure() {
  if (!section.value || !track.value || !viewport.value) return
  const vh = window.innerHeight
  maxX = Math.max(0, track.value.scrollWidth - viewport.value.clientWidth)
  section.value.style.height = `${vh + maxX}px`
}

function createScrollMotion() {
  trackTween?.scrollTrigger?.kill()
  trackTween?.kill()

  if (!track.value) return

  gsap.set(track.value, { x: 0 })
  progress.value = 0

  trackTween = gsap.to(track.value, {
    x: () => -maxX,
    ease: 'none',
    scrollTrigger: {
      trigger: section.value,
      start: 'top top',
      end: () => `+=${maxX}`,
      scrub: prefersReducedMotion() ? true : 0.55,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progress.value = self.progress
      }
    }
  })
}

async function setup() {
  await nextTick()
  measure()
  createScrollMotion()
  ScrollTrigger.refresh()
}

function onResize() {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    setup()
  }, 180)
}

function goToCard(index) {
  if (!track.value) return
  const cards = Array.from(track.value.querySelectorAll('.work-card'))
  const target = cards[Math.min(cards.length - 1, Math.max(0, index - 1))]
  if (!target) return

  const pad = parseFloat(window.getComputedStyle(track.value).paddingLeft || '0')
  const offset = Math.min(maxX, Math.max(0, target.offsetLeft - pad))
  scrollTo(section.value.offsetTop + offset, { duration: 1.1 })
}

function step(direction) {
  const next = currentIndex.value + direction
  if (next < 1 || next > works.length) return
  goToCard(next)
}

function onPointerDown(event) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return
  dragging = true
  didDrag = false
  startX = event.clientX
  startScroll = window.scrollY
  viewport.value?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event) {
  if (!dragging) return
  const delta = event.clientX - startX
  if (!didDrag && Math.abs(delta) < 5) return
  didDrag = true
  event.preventDefault()

  const min = section.value.offsetTop
  const max = section.value.offsetTop + maxX
  const target = Math.min(max, Math.max(min, startScroll - delta * 1.65))
  const lenis = getLenis()

  if (lenis) lenis.scrollTo(target, { immediate: true, force: true })
  else window.scrollTo(0, target)
}

function onPointerUp(event) {
  if (!dragging) return
  dragging = false
  viewport.value?.releasePointerCapture?.(event.pointerId)
  window.setTimeout(() => {
    didDrag = false
  }, 20)
}

function onClickCapture(event) {
  if (!didDrag) return
  event.preventDefault()
  event.stopPropagation()
  didDrag = false
}

function onCardMove(event) {
  if (window.matchMedia('(hover: none)').matches || dragging) return
  const visual = event.currentTarget.querySelector('.work-card__visual')
  if (!visual) return
  const rect = visual.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5

  gsap.to(visual, {
    rotationY: x * 6,
    rotationX: y * -5,
    transformPerspective: 900,
    duration: 0.65,
    ease: 'power3.out'
  })
}

function onCardLeave(event) {
  const visual = event.currentTarget.querySelector('.work-card__visual')
  if (!visual) return
  gsap.to(visual, {
    rotationY: 0,
    rotationX: 0,
    duration: 0.9,
    ease: 'power3.out'
  })
}

onMounted(async () => {
  await setup()
  try {
    await document.fonts?.ready
  } catch {
    // fonts are optional
  }
  setup()
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  window.clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  trackTween?.scrollTrigger?.kill()
  trackTween?.kill()
})
</script>

<template>
  <section
    id="work"
    ref="section"
    class="works"
    data-section="04"
    data-label="Work"
    :style="{ '--work-count': works.length }"
  >
    <div class="works__sticky">
      <header class="works__head shell">
        <div class="works__head-left">
          <span class="eyebrow">04 / Selected Work</span>
          <h2 class="works__title">
            <span>Selected</span>
            <em>work.</em>
          </h2>
        </div>

        <div class="works__head-right">
          <p class="works__intro">
            从 3D 电商到实时数据平台，五个已经上线的全栈项目。
            界面、接口、数据库与部署，都是同一条链路。
          </p>

          <div class="works__controls">
            <div class="works__counter mono">
              <span>{{ counter }}</span>
              <span class="works__counter-total">/ 0{{ works.length }}</span>
            </div>
            <RouterLink to="/work" class="works__all mono" data-cursor="Index">
              <span>All projects</span>
              <span class="works__all-arrow" aria-hidden="true">↗</span>
            </RouterLink>
            <div class="works__arrows">
              <button
                class="works__arrow"
                type="button"
                aria-label="上一个项目"
                :disabled="!canPrev"
                @click="step(-1)"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.1" />
                </svg>
              </button>
              <button
                class="works__arrow"
                type="button"
                aria-label="下一个项目"
                :disabled="!canNext"
                @click="step(1)"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        ref="viewport"
        class="works__viewport"
        data-cursor="Drag"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @click.capture="onClickCapture"
      >
        <div ref="track" class="works__track">
          <article
            v-for="(work, index) in works"
            :key="work.slug"
            class="work-card"
            v-reveal="{ delay: index * 60 }"
          >
            <RouterLink
              :to="`/work/${work.slug}`"
              class="work-card__link"
              :aria-label="`查看项目 ${work.title}`"
              data-cursor="View"
              @pointermove="onCardMove"
              @pointerleave="onCardLeave"
            >
              <div class="work-card__visual">
                <ArtworkFrame
                  :src="work.art"
                  :alt="`${work.title} 项目视觉`"
                  ratio="4 / 5"
                  :parallax="4"
                />
                <div class="work-card__top mono">
                  <span>#{{ work.index }} / {{ totalCount }}</span>
                  <span>{{ work.year }}</span>
                </div>
                <span class="work-card__view">
                  <span class="mono">View project</span>
                  <span class="work-card__view-icon" aria-hidden="true">↗</span>
                </span>
              </div>

              <div class="work-card__meta">
                <div class="work-card__names">
                  <h3 class="work-card__title">{{ work.title }}</h3>
                  <span class="work-card__cn">{{ work.cn }}</span>
                </div>
                <div class="work-card__tags">
                  <span class="work-card__category mono">{{ work.category }}</span>
                  <span class="work-card__stack mono">
                    {{ work.stack?.slice(0, 3).join(' · ') }}
                  </span>
                </div>
              </div>
            </RouterLink>
          </article>

          <article class="work-card work-card--end" v-reveal="{ delay: works.length * 60 }">
            <div class="work-end">
              <span class="mono work-end__no">{{ works.length }} → {{ works.length + 1 }}</span>
              <h3 class="work-end__title">
                Have a project
                <em>in mind?</em>
              </h3>
              <p class="work-end__copy">
                2026 年秋季还有一些档期。无论是从零开始的产品，
                还是需要有人把前后端一起推进的项目，都可以聊聊。
              </p>
              <button
                class="work-end__cta"
                type="button"
                data-cursor="Talk"
                @click="scrollToSection('contact')"
              >
                <span>Start a conversation</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        </div>
      </div>

      <footer class="works__foot shell">
        <div class="works__progress" aria-hidden="true">
          <span :style="{ transform: `scaleX(${progress})` }"></span>
        </div>
        <div class="works__foot-meta">
          <span class="mono works__hint">Scroll / drag to explore</span>
          <span class="mono works__now">Now viewing — {{ currentWork.title }}</span>
          <span class="mono works__foot-year">© 2023—2026</span>
        </div>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.works {
  position: relative;
  background: var(--bg-deep);
  color: var(--fg);
}

.works__sticky {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100svh;
  min-height: 660px;
  padding-top: calc(var(--nav-h) + clamp(8px, 2vh, 24px));
  padding-bottom: clamp(14px, 2.4vh, 28px);
  overflow: hidden;
}

.works__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(24px, 4vw, 80px);
  padding-bottom: clamp(20px, 3.4vh, 42px);
}

.works__head-left {
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.8vh, 20px);
}

.works__title {
  display: flex;
  flex-direction: column;
  font-family: var(--font-serif);
  font-size: clamp(2.8rem, 4.8vw, 5.4rem);
  font-weight: 400;
  line-height: 0.82;
  letter-spacing: -0.045em;
}

.works__title em {
  padding-left: clamp(30px, 4vw, 70px);
  color: var(--paper);
  font-style: italic;
}

.works__head-right {
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 22px);
  width: min(36ch, 32vw);
  max-width: 400px;
  padding-bottom: 4px;
}

.works__intro {
  color: var(--fg-dim);
  font-size: 12px;
  line-height: 1.8;
}

.works__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.works__counter {
  display: flex;
  gap: 5px;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.works__counter-total {
  color: var(--fg-faint);
}

.works__all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  color: var(--fg-dim);
  font-size: 8px;
  letter-spacing: 0.1em;
  transition: color 0.35s ease;
}

.works__all-arrow {
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1;
  transition: transform 0.45s var(--ease-out);
}

.works__all:hover {
  color: var(--acid);
}

.works__all:hover .works__all-arrow {
  transform: translate(2px, -2px);
}

.works__arrows {
  display: flex;
  gap: 8px;
}

.works__arrow {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--fg);
  transition:
    background-color 0.35s ease,
    color 0.35s ease,
    opacity 0.35s ease;
}

.works__arrow svg {
  width: 16px;
  height: 16px;
}

.works__arrow:hover:not(:disabled) {
  background: var(--fg);
  color: var(--bg);
}

.works__arrow:disabled {
  opacity: 0.25;
  pointer-events: none;
}

.works__viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
}

.works__viewport:active {
  cursor: grabbing;
}

.works__track {
  display: flex;
  align-items: center;
  gap: clamp(18px, 2.6vw, 44px);
  width: max-content;
  height: 100%;
  padding-inline: var(--gutter);
  will-change: transform;
}

.work-card {
  flex: 0 0 auto;
  width: clamp(266px, 25vw, 400px);
  height: min(100%, 640px);
}

.work-card__link {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  justify-content: center;
}

.work-card__visual {
  position: relative;
  transform-style: preserve-3d;
  will-change: transform;
}

.work-card__visual :deep(.artwork) {
  aspect-ratio: 4 / 5;
}

.work-card__top {
  position: absolute;
  top: 13px;
  right: 14px;
  left: 14px;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.85);
  mix-blend-mode: difference;
  font-size: 8px;
  letter-spacing: 0.12em;
  pointer-events: none;
}

.work-card__view {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.4s ease,
    transform 0.6s var(--ease-out);
  mix-blend-mode: difference;
  pointer-events: none;
}

.work-card__view .mono {
  font-size: 8px;
}

.work-card__view-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 50%;
  font-size: 15px;
}

.work-card:hover .work-card__view {
  opacity: 1;
  transform: none;
}

.work-card__meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-top: 2px;
}

.work-card__names {
  display: flex;
  align-items: baseline;
  gap: 9px;
}

.work-card__title {
  font-family: var(--font-serif);
  font-size: clamp(1.7rem, 2.2vw, 2.4rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.02em;
  transition: color 0.35s ease;
}

.work-card:hover .work-card__title {
  color: var(--accent);
}

.work-card__cn {
  font-family: var(--font-sans);
  font-size: 10px;
  color: var(--fg-dim);
  letter-spacing: 0.12em;
}

.work-card__category {
  color: var(--fg-faint);
  font-size: 7px;
  text-align: right;
  white-space: nowrap;
}

.work-card__tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.work-card__stack {
  color: var(--fg-faint);
  font-size: 6.5px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  opacity: 0.72;
}

.work-card--end {
  width: clamp(280px, 24vw, 360px);
  height: min(100%, 640px);
  display: flex;
}

.work-end {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  padding: clamp(24px, 3vw, 38px);
  border: 1px solid var(--line-strong);
  background:
    radial-gradient(circle at 75% 15%, rgba(216, 255, 67, 0.22), transparent 55%),
    linear-gradient(160deg, #1b1b10, #0d0d0b 60%);
  transition: background-color 0.6s var(--ease-out);
}

.work-end:hover {
  background-color: #121210;
}

.work-end__no {
  color: var(--acid);
  font-size: 8px;
}

.work-end__title {
  font-family: var(--font-serif);
  font-size: clamp(2.4rem, 3.6vw, 4rem);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.03em;
}

.work-end__title em {
  display: block;
  color: var(--acid);
  font-style: italic;
}

.work-end__copy {
  max-width: 26ch;
  color: var(--fg-dim);
  font-size: 12px;
  line-height: 1.75;
}

.work-end__cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-top: 16px;
  border-top: 1px solid var(--line-strong);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.35s ease;
}

.work-end__cta:hover {
  color: var(--acid);
}

.works__foot {
  padding-top: clamp(14px, 2.2vh, 24px);
}

.works__progress {
  width: 100%;
  height: 1px;
  overflow: hidden;
  background: var(--line);
}

.works__progress span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--fg);
  transform-origin: left center;
  will-change: transform;
}

.works__foot-meta {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-top: 10px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.works__now {
  color: var(--fg-dim);
}

@media (max-width: 1100px) {
  .works__head-right {
    width: min(32ch, 36vw);
  }

  .works__intro {
    display: none;
  }

  .work-card {
    width: clamp(260px, 34vw, 360px);
    height: min(100%, 580px);
  }
}

@media (max-width: 760px) {
  .works__sticky {
    min-height: 600px;
    padding-top: calc(var(--nav-h) + 10px);
    padding-bottom: 16px;
  }

  .works__head {
    align-items: flex-end;
    gap: 16px;
  }

  .works__title {
    font-size: clamp(2.5rem, 11vw, 4rem);
  }

  .works__title em {
    padding-left: 24px;
  }

  .works__head-right {
    width: auto;
    padding: 0;
  }

  .works__intro {
    display: none;
  }

  .works__controls {
    gap: 10px;
    padding-top: 0;
    border: 0;
  }

  .works__counter {
    display: none;
  }

  .works__all {
    gap: 4px;
    font-size: 7px;
    letter-spacing: 0.08em;
  }

  .works__all-arrow {
    font-size: 11px;
  }

  .works__arrows {
    gap: 6px;
  }

  .works__arrow {
    width: 32px;
    height: 32px;
  }

  .works__track {
    gap: 14px;
  }

  .work-card {
    width: 72vw;
    max-width: 330px;
    height: min(100%, 540px);
  }

  .work-card__link {
    gap: 10px;
  }

  .work-card__title {
    font-size: 1.7rem;
  }

  .work-card__category {
    display: none;
  }

  .work-card__tags {
    display: none;
  }

  .work-card--end {
    width: 72vw;
    max-width: 330px;
    height: min(100%, 540px);
  }

  .work-end {
    padding: 24px;
  }

  .work-end__copy {
    font-size: 11px;
  }

  .works__now {
    display: none;
  }

  .works__foot-meta {
    font-size: 7px;
  }
}
</style>
