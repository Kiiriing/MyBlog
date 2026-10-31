<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from '../lib/gsap'

const props = defineProps({
  to: { type: [String, Object], default: null },
  href: { type: String, default: '' },
  label: { type: String, default: 'View' },
  direction: { type: String, default: 'right' },
  size: { type: Number, default: 64 },
  cursor: { type: String, default: '' },
  tone: { type: String, default: 'light' }
})

const wrap = ref(null)

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'button'
})

const rotation = computed(
  () =>
    ({
      right: 0,
      down: 90,
      left: 180,
      up: -90
    })[props.direction] ?? 0
)

let tween = null

function onMove(event) {
  if (window.matchMedia('(hover: none)').matches) return
  const el = wrap.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2

  tween?.kill()
  tween = gsap.to(el, {
    x: x * 0.32,
    y: y * 0.32,
    duration: 0.55,
    ease: 'power3.out'
  })
}

function onLeave() {
  tween?.kill()
  tween = gsap.to(wrap.value, {
    x: 0,
    y: 0,
    duration: 0.9,
    ease: 'elastic.out(1, 0.35)'
  })
}

onBeforeUnmount(() => tween?.kill())
</script>

<template>
  <div
    ref="wrap"
    class="circle-button-wrap"
    :style="{ '--size': `${size}px` }"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <component
      :is="tag"
      class="circle-button"
      :class="`circle-button--${tone}`"
      :to="to || undefined"
      :href="href || undefined"
      :type="tag === 'button' ? 'button' : undefined"
      :aria-label="label"
      :data-cursor="cursor || undefined"
    >
      <span
        class="circle-button__arrow"
        :style="{ '--rotation': `${rotation}deg` }"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </span>
      <span class="circle-button__sr">{{ label }}</span>
    </component>
  </div>
</template>

<style scoped>
.circle-button-wrap {
  display: inline-block;
  will-change: transform;
}

.circle-button {
  position: relative;
  display: grid;
  width: var(--size);
  height: var(--size);
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--fg);
  transition:
    color 0.45s var(--ease-out),
    border-color 0.45s var(--ease-out);
}

.circle-button::before {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--fg);
  content: '';
  transform: scale(0);
  transform-origin: center;
  transition: transform 0.55s var(--ease-out);
}

.circle-button:hover {
  border-color: var(--fg);
  color: var(--bg);
}

.circle-button:hover::before {
  transform: scale(1);
}

.circle-button__arrow {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  transform: rotate(var(--rotation, 0deg));
  transition: transform 0.5s var(--ease-out);
}

.circle-button__arrow svg {
  width: 23px;
  height: 23px;
}

.circle-button:hover .circle-button__arrow {
  transform: rotate(var(--rotation, 0deg)) translateX(3px);
}

.circle-button--dark {
  border-color: var(--line);
}

.circle-button__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
