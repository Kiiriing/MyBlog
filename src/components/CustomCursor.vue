<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { gsap } from '../lib/gsap'

const dot = ref(null)
const follower = ref(null)
const visible = ref(false)

const state = reactive({
  active: false,
  label: '',
  down: false
})

const selectors = 'a, button, [data-cursor], input, textarea, select, [role="button"]'
let dotX
let dotY
let ringX
let ringY
let removeListeners = null

function isFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function showAt(x, y) {
  if (!visible.value) {
    visible.value = true
    // The native cursor is only hidden once the custom one is actually visible,
    // so a failed mount or a not-yet-moved pointer never leaves the page cursorless.
    document.documentElement.classList.add('has-custom-cursor')
    gsap.set([dot.value, follower.value], { x, y })
    dotX?.(x)
    dotY?.(y)
    ringX?.(x)
    ringY?.(y)
    return
  }

  dotX?.(x)
  dotY?.(y)
  ringX?.(x)
  ringY?.(y)
}

function hide() {
  if (!visible.value) return
  visible.value = false
  document.documentElement.classList.remove('has-custom-cursor')
  state.active = false
  state.label = ''
  state.down = false
}

function onPointerMove(event) {
  if (event.pointerType === 'touch') return
  showAt(event.clientX, event.clientY)
}

function onPointerOver(event) {
  const target = event.target.closest?.(selectors)
  state.active = Boolean(target)
  state.label = target?.dataset?.cursor || ''
}

function onPointerDown(event) {
  if (event.pointerType === 'touch') return
  showAt(event.clientX, event.clientY)
  state.down = true
}

function onPointerUp() {
  state.down = false
}

function onPointerLeave(event) {
  if (event.relatedTarget) return
  hide()
}

function onVisibilityChange() {
  if (document.hidden) hide()
}

onMounted(() => {
  if (!isFinePointer()) return

  dotX = gsap.quickTo(dot.value, 'x', { duration: 0.08, ease: 'power3' })
  dotY = gsap.quickTo(dot.value, 'y', { duration: 0.08, ease: 'power3' })
  ringX = gsap.quickTo(follower.value, 'x', { duration: 0.38, ease: 'power3' })
  ringY = gsap.quickTo(follower.value, 'y', { duration: 0.38, ease: 'power3' })

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerover', onPointerOver, { passive: true })
  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('pointerup', onPointerUp, { passive: true })
  document.documentElement.addEventListener('mouseleave', onPointerLeave)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('blur', hide)

  removeListeners = () => {
    window.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerover', onPointerOver)
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('pointerup', onPointerUp)
    document.documentElement.removeEventListener('mouseleave', onPointerLeave)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', hide)
  }
})

onBeforeUnmount(() => {
  removeListeners?.()
  document.documentElement.classList.remove('has-custom-cursor')
})
</script>

<template>
  <div
    ref="follower"
    class="cursor"
    :class="{
      'is-active': state.active,
      'is-labelled': Boolean(state.label),
      'is-down': state.down,
      'is-visible': visible
    }"
    aria-hidden="true"
  >
    <span class="cursor__ring"></span>
    <span class="cursor__label">{{ state.label }}</span>
  </div>
  <div
    ref="dot"
    class="cursor-dot"
    :class="{ 'is-visible': visible }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.cursor,
.cursor-dot {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1100;
  opacity: 0;
  pointer-events: none;
  mix-blend-mode: difference;
  will-change: transform;
  transition: opacity 0.2s ease;
}

.cursor.is-visible,
.cursor-dot.is-visible {
  opacity: 1;
}

.cursor-dot {
  width: 7px;
  height: 7px;
  margin-top: -3.5px;
  margin-left: -3.5px;
  border-radius: 50%;
  background: #fff;
}

.cursor {
  width: 0;
  height: 0;
}

.cursor__ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition:
    width 0.4s var(--ease-out),
    height 0.4s var(--ease-out),
    background-color 0.4s var(--ease-out),
    border-color 0.4s var(--ease-out),
    opacity 0.3s ease;
}

.cursor.is-active .cursor__ring {
  width: 64px;
  height: 64px;
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.08);
}

.cursor.is-labelled .cursor__ring {
  width: 82px;
  height: 82px;
  border-color: transparent;
  background: #fff;
}

.cursor.is-down .cursor__ring {
  width: 30px;
  height: 30px;
}

.cursor.is-labelled.is-down .cursor__ring {
  width: 64px;
  height: 64px;
}

.cursor__label {
  position: absolute;
  top: 30px;
  left: 34px;
  color: #0a0a0b;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(4px) rotate(-4deg);
  transition:
    opacity 0.28s ease,
    transform 0.4s var(--ease-out);
}

.cursor.is-labelled .cursor__label {
  opacity: 1;
  transform: translateY(0) rotate(-4deg);
}

@media (hover: none), (pointer: coarse) {
  .cursor,
  .cursor-dot {
    display: none;
  }
}
</style>
