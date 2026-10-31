<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'

const emit = defineEmits(['intro', 'done'])

const root = ref(null)
const progress = ref(0)

const count = computed(() => String(progress.value).padStart(3, '0'))
const status = computed(() => {
  if (progress.value < 36) return 'Compiling the interface'
  if (progress.value < 74) return 'Wiring the backend'
  if (progress.value < 99) return 'Shipping the details'
  return 'Welcome'
})

let timeline = null
let fallbackTimer = null

onMounted(() => {
  if (prefersReducedMotion()) {
    progress.value = 100
    emit('intro')
    fallbackTimer = window.setTimeout(() => emit('done'), 250)
    return
  }

  const counter = { value: 0 }

  timeline = gsap.timeline()
  timeline.from('.preloader__mask > span', {
    yPercent: 130,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.07
  })
  timeline.to(
    counter,
    {
      value: 100,
      duration: 1.35,
      ease: 'power2.inOut',
      onUpdate: () => {
        progress.value = Math.round(counter.value)
      }
    },
    '<0.1'
  )
  timeline.to(
    '.preloader__copy',
    {
      yPercent: -8,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    },
    '+=0.05'
  )
  timeline.to(
    root.value,
    {
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.85,
      ease: 'expo.inOut',
      onStart: () => emit('intro')
    },
    '-=0.05'
  )
  timeline.call(() => emit('done'))
})

onBeforeUnmount(() => {
  timeline?.kill()
  if (fallbackTimer) window.clearTimeout(fallbackTimer)
})
</script>

<template>
  <div ref="root" class="preloader" aria-hidden="true">
    <div class="preloader__inner">
      <div class="preloader__top">
        <span class="mono">LU YU® / Portfolio 2026</span>
        <span class="mono">Beijing, CN</span>
      </div>

      <div class="preloader__copy">
        <div class="preloader__brand">
          <span class="preloader__mask"><span class="serif-italic">LU</span></span>
          <span class="preloader__mask preloader__mask--offset"><span class="serif-italic">YU</span></span>
        </div>
        <div class="preloader__sub">
          <span class="preloader__cn">陆 屿</span>
          <span class="mono">from interface to infrastructure</span>
        </div>
      </div>

      <div class="preloader__bottom">
        <span class="preloader__status">{{ status }}</span>
        <span class="preloader__count">{{ count }}<i>/100</i></span>
      </div>

      <div class="preloader__bar">
        <span :style="{ transform: `scaleX(${progress / 100})` }"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preloader {
  position: fixed;
  inset: 0;
  z-index: 1000;
  overflow: hidden;
  background: var(--bg-deep);
  clip-path: inset(0 0 0 0);
}

.preloader::after {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
  content: '';
  opacity: 0.08;
  pointer-events: none;
}

.preloader__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: clamp(24px, 3vw, 48px) var(--gutter);
}

.preloader__top {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  color: var(--fg-dim);
}

.preloader__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 26px;
  margin-block: auto;
}

.preloader__brand {
  display: flex;
  gap: 0.18em;
  color: var(--fg);
  font-family: var(--font-serif);
  font-size: clamp(7rem, 20vw, 22rem);
  font-style: italic;
  line-height: 0.74;
  letter-spacing: -0.06em;
}

.preloader__mask {
  display: block;
  overflow: hidden;
  /* line-height is tighter than the glyph box and the italic overhang is wider
     than the text advance width, so padding keeps the full glyph inside the
     reveal mask; the equal negative margins leave layout unchanged. */
  margin: -0.16em -0.16em 0;
  padding: 0.16em 0.16em 0.08em;
}

.preloader__mask > span {
  display: block;
}

.preloader__mask--offset {
  padding-top: 0.38em;
}

.preloader__sub {
  display: flex;
  align-items: center;
  gap: clamp(18px, 4vw, 64px);
  padding-left: 0.4em;
  color: var(--fg-dim);
}

.preloader__cn {
  font-family: var(--font-serif);
  font-size: 15px;
  letter-spacing: 0.35em;
}

.preloader__bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.preloader__status {
  color: var(--fg-dim);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.preloader__count {
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: clamp(2.2rem, 4vw, 4rem);
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.preloader__count i {
  margin-left: 8px;
  color: var(--fg-faint);
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.1em;
}

.preloader__bar {
  position: relative;
  width: 100%;
  height: 1px;
  background: var(--line);
}

.preloader__bar span {
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform-origin: left center;
}

@media (max-width: 760px) {
  .preloader__brand {
    font-size: clamp(6rem, 34vw, 12rem);
  }

  .preloader__sub {
    flex-direction: column;
    gap: 10px;
    padding-left: 0;
  }

  .preloader__top span:last-child {
    display: none;
  }
}
</style>
