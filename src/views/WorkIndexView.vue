<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from '../lib/gsap'
import { works } from '../data/works'
import { site } from '../data/site'
import SiteFooter from '../components/SiteFooter.vue'

const filters = [
  { key: 'all', label: 'All', cn: '全部' },
  { key: 'commerce', label: 'Commerce', cn: '电商' },
  { key: 'data', label: 'Data', cn: '数据' },
  { key: 'platform', label: 'Platform', cn: '平台' },
  { key: 'experiment', label: 'Experiment', cn: '实验' }
]

const active = ref('all')
const hovered = ref(null)
const preview = ref(null)
const canPreview = ref(false)

const filtered = computed(() => {
  if (active.value === 'all') return works
  return works.filter((work) => work.filters?.includes(active.value))
})

const count = computed(() => String(filtered.value.length).padStart(2, '0'))
const total = String(works.length).padStart(2, '0')

let xTo = null
let yTo = null

function setupPreview() {
  if (!preview.value) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  canPreview.value = true
  xTo = gsap.quickTo(preview.value, 'x', { duration: 0.5, ease: 'power3.out' })
  yTo = gsap.quickTo(preview.value, 'y', { duration: 0.5, ease: 'power3.out' })
}

function positionAt(event) {
  if (!canPreview.value || !preview.value) return

  const rect = preview.value.getBoundingClientRect()
  const width = rect.width || 290
  const height = rect.height || 400
  const gap = 34
  const margin = 24

  let x = event.clientX + gap
  if (x + width > window.innerWidth - margin) {
    x = event.clientX - width - gap
  }
  x = Math.max(margin, Math.min(window.innerWidth - width - margin, x))

  const y = Math.max(
    margin,
    Math.min(window.innerHeight - height - margin, event.clientY - height * 0.55)
  )

  xTo?.(x)
  yTo?.(y)
}

function showPreview(work, event) {
  if (!canPreview.value || !preview.value) return
  hovered.value = work
  positionAt(event)
  gsap.to(preview.value, {
    opacity: 1,
    scale: 1,
    rotate: 0,
    duration: 0.45,
    ease: 'power3.out',
    overwrite: 'auto'
  })
}

function movePreview(event) {
  if (!hovered.value) return
  positionAt(event)
}

function hidePreview() {
  if (!preview.value) return
  hovered.value = null
  gsap.to(preview.value, {
    opacity: 0,
    scale: 0.92,
    rotate: -3,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

watch(active, hidePreview)

onMounted(() => {
  document.title = 'Work — Full-stack Projects · 陆屿 LU YU'
  setupPreview()
})

onBeforeUnmount(() => {
  gsap.killTweensOf(preview.value)
  xTo = null
  yTo = null
})
</script>

<template>
  <div class="work-index">
    <header class="work-index__hero">
      <div class="work-index__ambient" aria-hidden="true"></div>
      <span class="work-index__ghost" aria-hidden="true">PROJECTS</span>

      <div class="shell work-index__hero-inner">
        <div class="work-index__hero-top mono">
          <span>Work index / 项目索引</span>
          <span>{{ total }} projects — 2023 / 2026</span>
        </div>

        <div class="work-index__hero-main">
          <div class="work-index__intro">
            <h1 class="work-index__title">
              <span>All</span>
              <em>projects.</em>
            </h1>
            <p class="work-index__cn">从界面到数据库，五个真正上过线的产品。</p>
          </div>

          <aside class="work-index__aside">
            <p class="work-index__lede">
              这里收录 2023 年以来的五个全栈项目：电商、实时数据、
              出版平台与开源实验。每一个都从一行需求开始，
              最后跑到真实用户的浏览器里。
            </p>

            <span class="work-index__stamp" aria-hidden="true">
              <svg viewBox="0 0 160 160">
                <defs>
                  <path
                    id="work-stamp-circle"
                    d="M80,80 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0"
                  />
                </defs>
                <text>
                  <textPath href="#work-stamp-circle">
                    FULL-STACK WORK · 2023—2026 · FIVE PROJECTS ·
                  </textPath>
                </text>
                <text class="work-index__stamp-core" x="80" y="87" text-anchor="middle">✦</text>
              </svg>
            </span>
          </aside>
        </div>

        <div class="work-index__hero-meta mono">
          <span>Based in Beijing</span>
          <span>Commerce / Data / Platform / Experiment</span>
          <span>Scroll to browse ↓</span>
        </div>
      </div>
    </header>

    <div class="shell work-index__filters">
      <div class="work-index__filter-list" role="group" aria-label="按类别筛选项目">
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          class="work-index__filter"
          :class="{ 'is-active': active === filter.key }"
          :aria-pressed="active === filter.key"
          @click="active = filter.key"
        >
          <span class="work-index__filter-en mono">{{ filter.label }}</span>
          <span class="work-index__filter-cn">{{ filter.cn }}</span>
        </button>
      </div>

      <span class="work-index__count mono" aria-live="polite" aria-atomic="true">
        <Transition name="count" mode="out-in">
          <span :key="count" class="work-index__count-current">{{ count }}</span>
        </Transition>
        <span class="work-index__count-total"> / {{ total }}</span>
      </span>
    </div>

    <div class="shell work-index__list">
      <TransitionGroup
        name="work-row"
        tag="div"
        class="work-rows"
        @mouseleave="hidePreview"
      >
        <RouterLink
          v-for="work in filtered"
          :key="work.slug"
          :to="`/work/${work.slug}`"
          class="work-row"
          :style="{ '--row-accent': work.accent }"
          data-cursor="Open"
          @mouseenter="showPreview(work, $event)"
          @mousemove="movePreview"
        >
          <span class="work-row__no">{{ work.index }}</span>

          <span class="work-row__thumb" aria-hidden="true">
            <img :src="work.art" alt="" draggable="false" />
          </span>

          <span class="work-row__main">
            <span class="work-row__title">{{ work.title }}</span>
            <span class="work-row__cn">{{ work.cn }}</span>
          </span>

          <span class="work-row__cat mono">{{ work.category }}</span>
          <span class="work-row__year mono">{{ work.year }}</span>

          <span class="work-row__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 19L19 5M9 5h10v10" stroke="currentColor" stroke-width="1" />
            </svg>
          </span>
        </RouterLink>
      </TransitionGroup>

      <p v-if="!filtered.length" class="work-index__empty mono">
        这一类暂时没有项目，换一个筛选看看。
      </p>

      <div class="work-index__end">
        <span class="mono">End of index — {{ total }} projects</span>
        <a :href="`mailto:${site.email}`" class="work-index__end-link mono" data-cursor="Write">
          Start a project ↗
        </a>
      </div>
    </div>

    <SiteFooter />

    <Teleport to="body">
      <div ref="preview" class="work-preview" aria-hidden="true">
        <div class="work-preview__frame">
          <Transition name="preview-fade" mode="out-in">
            <img
              v-if="hovered"
              :key="hovered.slug"
              :src="hovered.art"
              alt=""
              draggable="false"
            />
          </Transition>
          <span class="work-preview__badge mono">Case study</span>
          <span class="work-preview__no mono">
            {{ hovered?.index || '—' }} / {{ total }}
          </span>
        </div>

        <div class="work-preview__meta">
          <strong>{{ hovered?.title || 'Selected work' }}</strong>
          <span class="mono">{{ hovered?.year }} — {{ hovered?.cn }}</span>
        </div>
        <span class="work-preview__stack mono">
          {{ hovered?.stack?.slice(0, 3).join(' · ') || 'Full-stack' }}
        </span>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.work-index {
  position: relative;
  background: var(--bg-deep);
  color: var(--fg);
}

/* Hero ------------------------------------------------------------------- */

.work-index__hero {
  position: relative;
  overflow: hidden;
  padding-top: calc(var(--nav-h) + clamp(38px, 7vh, 84px));
  padding-bottom: clamp(34px, 5vw, 72px);
  border-bottom: 1px solid var(--line);
}

.work-index__ambient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 34% 46% at 12% 20%, rgba(255, 90, 47, 0.14), transparent 70%),
    radial-gradient(ellipse 30% 40% at 88% 78%, rgba(122, 103, 255, 0.1), transparent 70%);
  pointer-events: none;
}

.work-index__ghost {
  position: absolute;
  right: -2vw;
  bottom: -0.14em;
  z-index: 0;
  color: transparent;
  font-family: var(--font-sans);
  font-size: clamp(7rem, 19vw, 21rem);
  font-weight: 600;
  line-height: 0.72;
  letter-spacing: -0.07em;
  -webkit-text-stroke: 1px rgba(242, 237, 228, 0.12);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.work-index__hero-inner {
  position: relative;
  z-index: 1;
}

.work-index__hero-top {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.work-index__hero-main {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(250px, 0.55fr);
  gap: clamp(40px, 7vw, 120px);
  align-items: end;
  margin-top: clamp(34px, 6vh, 72px);
}

.work-index__title {
  display: flex;
  flex-direction: column;
  font-family: var(--font-serif);
  font-size: clamp(4.2rem, 10vw, 10.5rem);
  font-weight: 400;
  line-height: 0.8;
  letter-spacing: -0.05em;
}

.work-index__title em {
  padding-left: clamp(38px, 7vw, 130px);
  color: var(--accent);
  font-style: italic;
}

.work-index__cn {
  margin-top: clamp(20px, 3vw, 34px);
  color: var(--fg-dim);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.work-index__aside {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: clamp(22px, 3vw, 36px);
  padding-bottom: 10px;
}

.work-index__lede {
  max-width: 34ch;
  color: var(--fg-dim);
  font-size: 12px;
  line-height: 1.9;
}

.work-index__stamp {
  display: block;
  width: clamp(100px, 8.6vw, 128px);
  color: var(--fg-dim);
  animation: work-stamp-spin 30s linear infinite;
}

.work-index__stamp svg {
  width: 100%;
  height: auto;
}

.work-index__stamp text {
  fill: currentColor;
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.24em;
}

.work-index__stamp .work-index__stamp-core {
  fill: var(--accent);
  font-size: 22px;
  letter-spacing: 0;
}

@keyframes work-stamp-spin {
  to {
    transform: rotate(360deg);
  }
}

.work-index__hero-meta {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 20px;
  margin-top: clamp(40px, 6vh, 80px);
  padding-top: 16px;
  border-top: 1px solid var(--line);
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.14em;
}

/* Filters ---------------------------------------------------------------- */

.work-index__filters {
  position: sticky;
  top: var(--nav-h);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-block: 13px;
  border-bottom: 1px solid var(--line);
  background: rgba(5, 5, 6, 0.88);
  backdrop-filter: blur(16px);
}

.work-index__filter-list {
  display: flex;
  align-items: center;
  gap: 6px;
}

.work-index__filter {
  display: flex;
  flex-shrink: 0;
  align-items: baseline;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--fg-dim);
  white-space: nowrap;
  transition:
    color 0.35s ease,
    background-color 0.35s ease,
    border-color 0.35s ease;
}

.work-index__filter-en {
  font-size: 8px;
  letter-spacing: 0.1em;
}

.work-index__filter-cn {
  font-size: 10px;
  letter-spacing: 0.08em;
}

.work-index__filter:hover {
  border-color: var(--line-strong);
  color: var(--fg);
}

.work-index__filter:focus-visible {
  outline: 1px solid var(--fg);
  outline-offset: 2px;
}

.work-index__filter.is-active {
  border-color: var(--paper);
  background: var(--paper);
  color: var(--ink);
}

.work-index__filter.is-active .work-index__filter-en {
  color: var(--ink-dim);
}

.work-index__count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: baseline;
  gap: 4px;
  color: var(--fg-faint);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.14em;
}

.work-index__count-current {
  display: inline-block;
  min-width: 2ch;
  color: var(--fg-dim);
}

.count-enter-active,
.count-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.28s var(--ease-out);
}

.count-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.count-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* Rows ------------------------------------------------------------------- */

.work-index__list {
  padding-top: clamp(18px, 3vw, 34px);
  padding-bottom: clamp(60px, 9vw, 120px);
}

.work-rows {
  border-bottom: 1px solid var(--line);
}

.work-row {
  position: relative;
  display: grid;
  grid-template-columns: clamp(64px, 7vw, 108px) minmax(0, 1fr) minmax(150px, 220px) 68px 40px;
  gap: clamp(12px, 2.4vw, 36px);
  align-items: center;
  overflow: hidden;
  padding: clamp(22px, 3vw, 38px) clamp(10px, 1.4vw, 22px);
  border-top: 1px solid var(--line);
  color: var(--fg);
  isolation: isolate;
  transition: color 0.35s ease;
}

.work-row::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--paper);
  clip-path: inset(50% 0 50% 0);
  content: '';
  transition: clip-path 0.62s var(--ease-in-out);
}

.work-row::after {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 3px;
  height: 100%;
  background: var(--row-accent, var(--accent));
  content: '';
  transform: scaleY(0);
  transform-origin: top center;
  transition: transform 0.55s var(--ease-out);
}

.work-row:hover::before {
  clip-path: inset(0 0 0 0);
}

.work-row:hover::after {
  transform: scaleY(1);
}

.work-row:hover,
.work-row:focus-visible {
  color: var(--ink);
}

.work-row:focus-visible {
  outline: none;
}

.work-row:focus-visible::before {
  clip-path: inset(0 0 0 0);
}

.work-row:focus-visible::after {
  transform: scaleY(1);
}

.work-row__no {
  color: transparent;
  font-family: var(--font-sans);
  font-size: clamp(1.4rem, 2.4vw, 2.2rem);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.04em;
  -webkit-text-stroke: 1px var(--fg-faint);
  transition:
    color 0.35s ease,
    -webkit-text-stroke-color 0.35s ease;
}

.work-row:hover .work-row__no,
.work-row:focus-visible .work-row__no {
  color: var(--row-accent, var(--accent));
  -webkit-text-stroke-color: transparent;
}

.work-row__thumb {
  display: none;
}

.work-row__main {
  display: flex;
  align-items: baseline;
  gap: clamp(10px, 1.6vw, 22px);
  min-width: 0;
}

.work-row__title {
  font-family: var(--font-serif);
  font-size: clamp(2.2rem, 4.4vw, 4.4rem);
  font-weight: 400;
  line-height: 0.86;
  letter-spacing: -0.035em;
  transition: transform 0.6s var(--ease-out);
}

.work-row:hover .work-row__title,
.work-row:focus-visible .work-row__title {
  transform: translateX(10px);
}

.work-row__cn {
  color: var(--fg-dim);
  font-size: clamp(10px, 1vw, 13px);
  letter-spacing: 0.14em;
  white-space: nowrap;
  transition: color 0.35s ease;
}

.work-row__cat,
.work-row__year {
  color: var(--fg-faint);
  font-size: 8px;
  line-height: 1.7;
  letter-spacing: 0.1em;
  transition: color 0.35s ease;
}

.work-row__year {
  font-size: 9px;
  text-align: right;
}

.work-row:hover .work-row__cn,
.work-row:hover .work-row__cat,
.work-row:hover .work-row__year,
.work-row:focus-visible .work-row__cn,
.work-row:focus-visible .work-row__cat,
.work-row:focus-visible .work-row__year {
  color: var(--ink-dim);
}

.work-row__arrow {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--fg-dim);
  opacity: 0.6;
  transform: translate(-6px, 6px);
  transition:
    opacity 0.35s ease,
    transform 0.55s var(--ease-out),
    background-color 0.35s ease,
    border-color 0.35s ease,
    color 0.35s ease;
}

.work-row__arrow svg {
  width: 15px;
  height: 15px;
}

.work-row:hover .work-row__arrow,
.work-row:focus-visible .work-row__arrow {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
  opacity: 1;
  transform: none;
}

.work-index__empty {
  padding: 70px 0;
  color: var(--fg-faint);
  font-size: 9px;
  text-align: center;
}

.work-index__end {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: clamp(24px, 4vw, 40px);
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.work-index__end-link {
  color: var(--fg-dim);
  font-size: 8px;
  transition: color 0.35s ease;
}

.work-index__end-link:hover {
  color: var(--accent);
}

/* List transitions -------------------------------------------------------- */

.work-row-enter-active,
.work-row-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.5s var(--ease-out);
}

.work-row-enter-from {
  opacity: 0;
  transform: translateY(18px);
}

.work-row-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.work-row-move {
  transition: transform 0.55s var(--ease-out);
}

/* Floating preview ------------------------------------------------------- */

.work-preview {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 700;
  width: clamp(220px, 19vw, 310px);
  opacity: 0;
  transform: scale(0.92) rotate(-3deg);
  pointer-events: none;
  will-change: transform, opacity;
}

.work-preview__frame {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid rgba(242, 237, 228, 0.24);
  background: var(--card);
  box-shadow: 0 42px 90px rgba(0, 0, 0, 0.46);
}

.work-preview__frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.work-preview__badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 9px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.24);
  color: #fff;
  font-size: 7px;
  letter-spacing: 0.12em;
  backdrop-filter: blur(8px);
}

.work-preview__no {
  position: absolute;
  right: 12px;
  bottom: 12px;
  color: #fff;
  font-size: 7px;
  mix-blend-mode: difference;
}

.work-preview__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
}

.work-preview__meta strong {
  color: var(--fg);
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 400;
  letter-spacing: -0.02em;
}

.work-preview__meta span {
  color: var(--fg-dim);
  font-size: 7px;
}

.work-preview__stack {
  display: block;
  margin-top: 5px;
  color: var(--fg-faint);
  font-size: 7px;
  letter-spacing: 0.1em;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.4s var(--ease-out);
}

.preview-fade-enter-from {
  opacity: 0;
  transform: scale(1.04);
}

.preview-fade-leave-to {
  opacity: 0;
}

/* Responsive -------------------------------------------------------------- */

@media (max-width: 1100px) {
  .work-index__hero-main {
    grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.6fr);
    gap: 44px;
  }

  .work-row {
    grid-template-columns: 66px minmax(0, 1fr) 150px 60px 38px;
  }
}

@media (max-width: 860px) {
  .work-index__hero-main {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .work-index__aside {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .work-index__stamp {
    width: 96px;
    flex-shrink: 0;
  }

  .work-index__ghost {
    font-size: 30vw;
    bottom: 0.02em;
  }

  .work-index__hero-meta {
    grid-template-columns: 1fr auto;
  }

  .work-index__hero-meta span:nth-child(2) {
    display: none;
  }

  .work-index__filters {
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px;
    padding-block: 10px;
  }

  .work-index__filter-list {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .work-index__filter-list::-webkit-scrollbar {
    display: none;
  }

  .work-index__count {
    display: none;
  }

  .work-row {
    grid-template-columns: 34px 56px minmax(0, 1fr) 32px;
    gap: 12px;
    padding: 16px 8px;
  }

  .work-row__thumb {
    display: block;
    width: 56px;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border: 1px solid var(--line);
  }

  .work-row__thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .work-row__no {
    font-size: 1.15rem;
  }

  .work-row__main {
    flex-direction: column;
    gap: 2px;
  }

  .work-row__title {
    font-size: clamp(1.5rem, 6.4vw, 2.2rem);
  }

  .work-row:hover .work-row__title {
    transform: none;
  }

  .work-row__cn {
    font-size: 9px;
  }

  .work-row__cat,
  .work-row__year {
    display: none;
  }

  .work-row__arrow {
    width: 30px;
    height: 30px;
    opacity: 0.5;
    transform: none;
  }

  .work-row__arrow svg {
    width: 13px;
    height: 13px;
  }

  .work-preview {
    display: none;
  }
}

@media (max-width: 600px) {
  .work-index__hero {
    padding-top: calc(var(--nav-h) + 26px);
  }

  .work-index__hero-top {
    flex-direction: column;
    gap: 6px;
  }

  .work-index__title {
    font-size: clamp(3.4rem, 16vw, 5.4rem);
  }

  .work-index__title em {
    padding-left: 26px;
  }

  .work-index__lede {
    font-size: 11px;
  }

  .work-index__stamp {
    width: 78px;
  }

  .work-index__hero-meta {
    margin-top: 34px;
  }

  .work-index__end {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
