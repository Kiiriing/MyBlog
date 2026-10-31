<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'

const root = ref(null)
const labelEl = ref(null)
const metaEl = ref(null)
const label = ref('Index')
const meta = ref('/')

let timeline = null

function play(nextLabel, nextMeta) {
  if (!root.value || prefersReducedMotion()) return

  label.value = nextLabel || 'Index'
  meta.value = nextMeta || '/'

  timeline?.kill()
  timeline = gsap.timeline()
  timeline
    .set(root.value, { clipPath: 'inset(100% 0 0 0)' })
    .set([labelEl.value, metaEl.value], { yPercent: 110, opacity: 0 })
    .to(root.value, {
      clipPath: 'inset(0% 0 0 0)',
      duration: 0.45,
      ease: 'power3.inOut'
    }, 0)
    .to(
      [labelEl.value, metaEl.value],
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.45,
        stagger: 0.05,
        ease: 'power3.out'
      },
      0.25
    )
    .to(
      root.value,
      {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.5,
        ease: 'power3.inOut'
      },
      1.08
    )
    .to(
      [labelEl.value, metaEl.value],
      {
        yPercent: -120,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in'
      },
      1.08
    )
}

defineExpose({ play })

onBeforeUnmount(() => timeline?.kill())
</script>

<template>
  <div ref="root" class="route-wipe" aria-hidden="true">
    <div class="route-wipe__texture"></div>
    <span class="route-wipe__mark" aria-hidden="true">↗</span>

    <div class="shell route-wipe__inner">
      <div class="route-wipe__top mono">
        <span>LU YU — Route transition</span>
        <span>2020 / 2026</span>
      </div>

      <div class="route-wipe__center">
        <span class="route-wipe__eyebrow mono">Now entering</span>
        <span class="route-wipe__line">
          <span ref="labelEl" class="route-wipe__label">{{ label }}</span>
        </span>
        <span class="route-wipe__line route-wipe__line--meta">
          <span ref="metaEl" class="route-wipe__sub mono">{{ meta }}</span>
        </span>
      </div>

      <div class="route-wipe__bottom mono">
        <span>Please wait a moment</span>
        <span>Selected work &amp; notes</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.route-wipe {
  position: fixed;
  inset: 0;
  z-index: 940;
  clip-path: inset(0 0 100% 0);
  background: var(--accent);
  color: var(--ink);
  overflow: hidden;
  pointer-events: none;
}

.route-wipe__texture {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    90deg,
    rgba(17, 16, 14, 0.13) 0 1px,
    transparent 1px 7px
  );
  opacity: 0.5;
  mix-blend-mode: multiply;
}

.route-wipe__mark {
  position: absolute;
  right: -0.06em;
  bottom: -0.3em;
  color: rgba(17, 16, 14, 0.12);
  font-family: var(--font-serif);
  font-size: clamp(16rem, 46vw, 50rem);
  font-style: italic;
  line-height: 0.8;
  pointer-events: none;
  user-select: none;
}

.route-wipe__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding-block: clamp(22px, 4.2vh, 46px);
}

.route-wipe__top,
.route-wipe__bottom {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 8px;
  letter-spacing: 0.16em;
  opacity: 0.7;
}

.route-wipe__center {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.route-wipe__eyebrow {
  margin-bottom: clamp(14px, 2.2vh, 26px);
  font-size: 8px;
  letter-spacing: 0.2em;
  opacity: 0.65;
}

.route-wipe__line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.04em;
}

.route-wipe__label {
  display: block;
  font-family: var(--font-serif);
  font-size: clamp(3.6rem, 11vw, 11rem);
  font-style: italic;
  font-weight: 400;
  line-height: 0.82;
  letter-spacing: -0.05em;
  padding-right: 0.08em;
}

.route-wipe__line--meta {
  margin-top: clamp(10px, 1.8vh, 20px);
}

.route-wipe__sub {
  display: block;
  font-size: 9px;
  letter-spacing: 0.18em;
  opacity: 0.7;
}

@media (max-width: 760px) {
  .route-wipe__top span:last-child,
  .route-wipe__bottom span:last-child {
    display: none;
  }

  .route-wipe__label {
    font-size: clamp(3.4rem, 17vw, 5.6rem);
  }
}
</style>
