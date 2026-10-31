<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { gsap } from '../lib/gsap'

const props = defineProps({
  posts: { type: Array, default: () => [] }
})

const preview = ref(null)
const active = ref(null)
const canPreview = ref(false)

let xTo = null
let yTo = null

function setupPreview() {
  if (!preview.value) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  canPreview.value = true
  xTo = gsap.quickTo(preview.value, 'x', { duration: 0.55, ease: 'power3.out' })
  yTo = gsap.quickTo(preview.value, 'y', { duration: 0.55, ease: 'power3.out' })
}

function positionAt(event) {
  if (!canPreview.value || !preview.value) return
  const rect = preview.value.getBoundingClientRect()
  const width = rect.width || 232
  const height = rect.height || 310
  const x = Math.min(window.innerWidth - width - 24, Math.max(24, event.clientX + 28))
  const y = Math.max(
    24,
    Math.min(window.innerHeight - height - 24, event.clientY - height / 2)
  )
  xTo?.(x)
  yTo?.(y)
}

function showPreview(post, event) {
  if (!canPreview.value || !preview.value) return
  active.value = post
  positionAt(event)
  gsap.to(preview.value, {
    opacity: 1,
    scale: 1,
    duration: 0.42,
    ease: 'power3.out',
    overwrite: 'auto'
  })
}

function movePreview(event) {
  if (!active.value) return
  positionAt(event)
}

function hidePreview() {
  if (!preview.value) return
  active.value = null
  gsap.to(preview.value, {
    opacity: 0,
    scale: 0.94,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

onMounted(setupPreview)

onBeforeUnmount(() => {
  gsap.killTweensOf(preview.value)
  xTo = null
  yTo = null
})
</script>

<template>
  <TransitionGroup
    name="journal"
    tag="div"
    class="journal-list"
    @mouseleave="hidePreview"
  >
    <RouterLink
      v-for="post in props.posts"
      :key="post.slug"
      :to="`/journal/${post.slug}`"
      class="journal-row"
      data-cursor="Read"
      @mouseenter="showPreview(post, $event)"
      @mousemove="movePreview"
    >
      <span class="journal-row__index mono">{{ post.index }}</span>

      <span class="journal-row__main">
        <span class="journal-row__title">{{ post.title }}</span>
        <span class="journal-row__en">{{ post.en }}</span>
      </span>

      <span class="journal-row__cat mono">{{ post.category }}</span>
      <span class="journal-row__date mono">{{ post.date }}</span>

      <span class="journal-row__arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 19L19 5M9 5h10v10" stroke="currentColor" stroke-width="1" />
        </svg>
      </span>
    </RouterLink>
  </TransitionGroup>

  <Teleport to="body">
    <div ref="preview" class="journal-preview" aria-hidden="true">
      <div class="journal-preview__frame">
        <Transition name="journal-preview-img" mode="out-in">
          <img
            v-if="active"
            :key="active.slug"
            :src="active.art"
            :alt="active.title"
            draggable="false"
          />
        </Transition>
        <span class="journal-preview__tag mono">{{ active?.category || 'Journal' }}</span>
      </div>
      <div class="journal-preview__foot mono">
        <span>{{ active ? active.index : '—' }}</span>
        <span>{{ active?.reading || 'Read' }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.journal-list {
  position: relative;
  border-top: 1px solid var(--line);
}

.journal-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 108px 108px 34px;
  gap: clamp(12px, 2vw, 26px);
  align-items: center;
  padding: clamp(19px, 2.7vw, 34px) 0;
  border-bottom: 1px solid var(--line);
  color: var(--fg);
  transition:
    padding 0.55s var(--ease-out),
    color 0.4s ease;
}

.journal-row:hover {
  padding-left: clamp(6px, 1vw, 14px);
}

.journal-row__index {
  color: var(--fg-faint);
  font-size: 9px;
  letter-spacing: 0.1em;
  transition: color 0.4s ease;
}

.journal-row:hover .journal-row__index {
  color: var(--accent);
}

.journal-row__main {
  display: flex;
  align-items: baseline;
  gap: clamp(12px, 2vw, 30px);
  min-width: 0;
}

.journal-row__title {
  font-family: var(--font-serif);
  font-size: clamp(1.55rem, 2.6vw, 2.9rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.02em;
  transition:
    color 0.4s ease,
    transform 0.6s var(--ease-out);
}

.journal-row:hover .journal-row__title {
  color: var(--accent);
  transform: translateX(4px);
}

.journal-row__en {
  overflow: hidden;
  color: var(--fg-dim);
  font-family: var(--font-serif);
  font-size: clamp(0.86rem, 1vw, 1.02rem);
  font-style: italic;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.4s ease;
}

.journal-row:hover .journal-row__en {
  color: var(--fg);
}

.journal-row__cat,
.journal-row__date {
  color: var(--fg-dim);
  font-size: 8px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.journal-row__date {
  text-align: right;
}

.journal-row__arrow {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  opacity: 0.35;
  transform: translate(-4px, 4px);
  transition:
    opacity 0.4s ease,
    transform 0.55s var(--ease-out),
    border-color 0.4s ease;
}

.journal-row__arrow svg {
  width: 14px;
  height: 14px;
}

.journal-row:hover .journal-row__arrow {
  border-color: var(--line-strong);
  opacity: 1;
  transform: none;
}

.journal-enter-active,
.journal-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.55s var(--ease-out);
}

.journal-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.journal-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.journal-move {
  transition: transform 0.55s var(--ease-out);
}

/* Floating preview ------------------------------------------------------- */

.journal-preview {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 700;
  width: clamp(190px, 16vw, 246px);
  pointer-events: none;
  opacity: 0;
  transform: scale(0.94);
  will-change: transform, opacity;
}

.journal-preview__frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  background: var(--card);
  box-shadow: 0 34px 80px rgba(0, 0, 0, 0.32);
}

.journal-preview__frame img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.journal-preview__tag {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 5px 9px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  font-size: 7px;
  letter-spacing: 0.12em;
  backdrop-filter: blur(8px);
}

.journal-preview__foot {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  color: var(--fg-dim);
  font-size: 7px;
}

.journal-preview-img-enter-active,
.journal-preview-img-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.45s var(--ease-out);
}

.journal-preview-img-enter-from {
  opacity: 0;
  transform: scale(1.06);
}

.journal-preview-img-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media (max-width: 900px) {
  .journal-row {
    grid-template-columns: 38px minmax(0, 1fr) 84px 30px;
  }

  .journal-row__cat {
    display: none;
  }

  .journal-row__date {
    text-align: right;
  }
}

@media (max-width: 640px) {
  .journal-row {
    grid-template-columns: 28px minmax(0, 1fr) 26px;
    gap: 10px;
    padding: 18px 0;
  }

  .journal-row__main {
    flex-direction: column;
    gap: 4px;
  }

  .journal-row__title {
    font-size: 1.5rem;
  }

  .journal-row__en {
    font-size: 0.82rem;
  }

  .journal-row__date {
    display: none;
  }

  .journal-row__arrow {
    opacity: 0.45;
    transform: none;
  }

  .journal-preview {
    display: none;
  }
}
</style>
