<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  ratio: { type: String, default: '4 / 5' },
  parallax: { type: Number, default: 7 },
  eager: { type: Boolean, default: false },
  imageClass: { type: String, default: '' }
})

const frame = ref(null)
const image = ref(null)
let tween = null

onMounted(() => {
  if (prefersReducedMotion()) return

  tween = gsap.fromTo(
    image.value,
    { yPercent: -props.parallax },
    {
      yPercent: props.parallax,
      ease: 'none',
      scrollTrigger: {
        trigger: frame.value,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    }
  )
})

onBeforeUnmount(() => {
  tween?.scrollTrigger?.kill()
  tween?.kill()
})
</script>

<template>
  <figure ref="frame" class="artwork" :style="{ aspectRatio: ratio }">
    <div class="artwork__media">
      <img
        ref="image"
        :src="src"
        :alt="alt"
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
        draggable="false"
        :class="imageClass"
      />
    </div>
    <div class="artwork__toast" aria-hidden="true"></div>
    <slot />
  </figure>
</template>

<style scoped>
.artwork {
  position: relative;
  width: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--card);
  transform: translateZ(0);
}

.artwork::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.12);
  content: '';
  pointer-events: none;
}

.artwork__media {
  position: absolute;
  inset: 0;
  transition: transform 1.15s var(--ease-out);
}

.artwork:hover .artwork__media {
  transform: scale(1.025);
}

.artwork img {
  position: absolute;
  top: -9%;
  left: 0;
  width: 100%;
  height: 118%;
  object-fit: cover;
  will-change: transform;
}

.artwork__toast {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, 0.22));
  pointer-events: none;
}
</style>
