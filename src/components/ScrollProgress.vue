<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const progress = ref(0)
const activeLabel = ref('Index')
const activeIndex = ref('01')
const total = ref(6)

const atEnd = computed(
  () => activeIndex.value === String(total.value).padStart(2, '0')
)

let sections = []
let ticking = false
let frame = 0

function collectSections() {
  sections = Array.from(document.querySelectorAll('[data-section]')).map((el) => ({
    el,
    label: el.dataset.label || '',
    index: el.dataset.section || ''
  }))
  if (sections.length) {
    total.value = sections.length
    activeIndex.value = sections[0].index || '01'
    activeLabel.value = sections[0].label || 'Index'
  }
}

function update() {
  ticking = false
  const doc = document.documentElement
  const max = Math.max(1, doc.scrollHeight - window.innerHeight)
  progress.value = Math.min(1, Math.max(0, window.scrollY / max))

  if (!sections.length) collectSections()

  const marker = window.scrollY + window.innerHeight * 0.42
  let current = sections[0]

  sections.forEach((section) => {
    if (section.el.offsetTop <= marker) current = section
  })

  if (current) {
    activeLabel.value = current.label
    activeIndex.value = current.index
  }
}

function requestUpdate() {
  if (ticking) return
  ticking = true
  frame = requestAnimationFrame(update)
}

function onResize() {
  collectSections()
  requestUpdate()
}

onMounted(async () => {
  await nextTick()
  collectSections()
  update()
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', requestUpdate)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <aside class="scroll-rail" :class="{ 'is-at-end': atEnd }" aria-hidden="true">
    <div class="scroll-rail__count">
      <span>{{ activeIndex }}</span>
      <span class="scroll-rail__slash">/ {{ String(total).padStart(2, '0') }}</span>
    </div>
    <div class="scroll-rail__track">
      <span class="scroll-rail__fill" :style="{ transform: `scaleY(${progress})` }"></span>
    </div>
    <div class="scroll-rail__label">{{ activeLabel }}</div>
  </aside>
</template>

<style scoped>
.scroll-rail {
  position: fixed;
  top: 50%;
  right: clamp(16px, 2.4vw, 36px);
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #fff;
  mix-blend-mode: difference;
  transform: translateY(-50%);
  pointer-events: none;
  transition:
    opacity 0.5s ease,
    transform 0.65s var(--ease-out);
}

.scroll-rail.is-at-end {
  opacity: 0;
  transform: translateY(-50%) translateX(16px);
}

.scroll-rail__count {
  display: flex;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}

.scroll-rail__slash {
  opacity: 0.4;
}

.scroll-rail__track {
  position: relative;
  width: 1px;
  height: clamp(70px, 10vh, 110px);
  background: rgba(255, 255, 255, 0.22);
  overflow: hidden;
}

.scroll-rail__fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: currentColor;
  transform-origin: top center;
  will-change: transform;
}

.scroll-rail__label {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  opacity: 0.55;
}

@media (max-width: 900px) {
  .scroll-rail {
    display: none;
  }
}
</style>
