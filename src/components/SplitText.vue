<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap, ScrollTrigger, SplitText as GSAPSplitText } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'

/**
 * Vue 版 React Bits <SplitText />
 * 原组件依赖 React / @gsap/react / shadcn / Tailwind，这里改成 Vue 3 + 项目内置 GSAP。
 */
const props = defineProps({
  text: { type: String, required: true },
  className: { type: String, default: '' },
  delay: { type: Number, default: 50 },
  duration: { type: Number, default: 1.25 },
  ease: { type: String, default: '' },
  splitType: { type: String, default: 'chars' },
  from: { type: Object, default: null },
  to: { type: Object, default: null },
  threshold: { type: Number, default: 0.1 },
  rootMargin: { type: String, default: '-100px' },
  textAlign: { type: String, default: 'center' },
  tag: { type: String, default: 'p' },
  staggerFrom: { type: String, default: 'start' },
  mask: { type: Boolean, default: false },
  effect: { type: String, default: 'rise' },
  trigger: { type: String, default: 'view' },
  loop: { type: Boolean, default: false },
  loopDelay: { type: Number, default: 1.5 },
  hoverEffect: { type: String, default: 'none' },
  color: { type: String, default: '' },
  accentColor: { type: String, default: '' }
})

const emit = defineEmits(['complete'])

const DEFAULT_FROM = { opacity: 0, y: 40 }
const DEFAULT_TO = { opacity: 1, y: 0 }
const STIFFNESS = 180
const DAMPING = 19
const KICK = 0.024

const root = ref(null)
const ready = ref(false)
const fontsLoaded = ref(fontsAreLoaded())

let teardown = null
let completedText = null

function fontsAreLoaded() {
  return typeof document !== 'undefined' && (!document.fonts || document.fonts.status === 'loaded')
}

function waveEase(t) {
  return 1 - Math.cos(t * Math.PI * 1.5) * Math.pow(1 - t, 1.2)
}

function getEffect(effect, em) {
  switch (effect) {
    case 'fade':
      return { from: { opacity: 0 }, to: { opacity: 1 }, ease: 'power2.inOut' }
    case 'blur':
      return {
        from: { opacity: 0, filter: `blur(${Math.round(em * 1.4) / 10}px)` },
        to: { opacity: 1, filter: 'blur(0px)' },
        ease: 'power2.out'
      }
    case 'flip': {
      const setup = { transformPerspective: em * 6, transformOrigin: '50% 100%' }
      return {
        from: { ...setup, opacity: 0, rotationX: -90 },
        to: { ...setup, opacity: 1, rotationX: 0 },
        ease: 'power3.out'
      }
    }
    case 'pop':
      return {
        from: { opacity: 0, scale: 0 },
        to: { opacity: 1, scale: 1 },
        ease: 'back.out(1.6)'
      }
    case 'skew':
      return {
        from: { transformOrigin: '50% 100%', opacity: 0, x: -em * 0.4, skewX: -24 },
        to: { transformOrigin: '50% 100%', opacity: 1, x: 0, skewX: 0 },
        ease: 'expo.out'
      }
    case 'wave':
      return {
        from: { opacity: 0, y: em * 0.45 },
        to: { opacity: 1, y: 0 },
        ease: waveEase
      }
    default:
      return { from: { ...DEFAULT_FROM }, to: { ...DEFAULT_TO }, ease: 'power3.out' }
  }
}

function finish() {
  const text = props.text
  if (completedText === text) return
  completedText = text
  emit('complete')
}

function cleanup() {
  if (!teardown) return
  teardown()
  teardown = null
}

function setup() {
  cleanup()
  const el = root.value
  const text = props.text
  if (!el || !text) return

  if (!fontsAreLoaded()) {
    document.fonts.ready.then(() => {
      fontsLoaded.value = true
      nextTick(setup)
    })
    return
  }

  el.getBoundingClientRect()

  if (prefersReducedMotion()) {
    ready.value = true
    finish()
    return
  }

  const startPct = (1 - props.threshold) * 100
  const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(props.rootMargin)
  const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0
  const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px'
  const sign =
    marginValue === 0
      ? ''
      : marginValue < 0
        ? `-=${Math.abs(marginValue)}${marginUnit}`
        : `+=${marginValue}${marginUnit}`
  const start = `top ${startPct}%${sign}`
  const unit = props.splitType.includes('chars')
    ? 'chars'
    : props.splitType.includes('words')
      ? 'words'
      : 'lines'

  const em = parseFloat(getComputedStyle(el).fontSize) || 16
  const custom = props.from !== null || props.to !== null
  const look = getEffect(props.effect, em)
  const fromVars = custom ? { ...(props.from || DEFAULT_FROM) } : look.from
  const toVars = custom ? { ...(props.to || DEFAULT_TO) } : look.to
  const easing = props.ease || (custom ? 'power3.out' : look.ease)
  const settle = custom ? 'willChange' : 'transform,filter,willChange'
  const exit = Math.max(0.35, props.duration * 0.55)

  let pieces = []
  let movers = []
  let order = gsap.utils.distribute({ each: props.delay / 1000, from: props.staggerFrom })
  let revealed = completedText === text
  let intro = null
  let busy = null
  let queued = null
  let raf = 0
  let last = 0
  let centers = null
  const lift = em * 0.2
  const springs = []
  const kicks = []
  const pointer = { x: 0, y: 0, inside: false }

  const reveal = (initial, vars) => {
    const accent = props.accentColor
    const tl = gsap.timeline(vars)
    tl.fromTo(
      pieces,
      { ...fromVars, willChange: 'transform, opacity' },
      {
        ...toVars,
        duration: props.duration,
        ease: easing,
        stagger: order,
        immediateRender: initial
      },
      0
    )
    if (accent) {
      tl.fromTo(
        pieces,
        { color: accent },
        {
          color: getComputedStyle(el).color,
          duration: props.duration * 0.7,
          ease: 'power1.inOut',
          stagger: order,
          immediateRender: initial
        },
        props.duration * 0.3
      )
    }
    tl.set(pieces, { clearProps: accent ? `${settle},color` : settle })
    return tl
  }

  const conceal = () => {
    const accent = props.accentColor
    const tl = gsap.timeline()
    tl.fromTo(
      pieces,
      { ...toVars, willChange: 'transform, opacity' },
      { ...fromVars, duration: exit, ease: 'power2.in', stagger: order, immediateRender: false },
      0
    )
    if (accent) tl.to(pieces, { color: accent, duration: exit, ease: 'power1.in', stagger: order }, 0)
    return tl
  }

  const cycle = () => {
    if (busy || !revealed || !pieces.length) return
    queued?.kill()
    queued = null
    busy = gsap
      .timeline({
        onComplete: () => {
          busy = null
          queue()
        }
      })
      .add(conceal(), 0)
      .add(reveal(false), exit)
  }

  const queue = () => {
    queued?.kill()
    queued = props.loop ? gsap.delayedCall(props.loopDelay, cycle) : null
  }

  const measure = () => {
    const box = el.getBoundingClientRect()
    centers = movers.map((node, i) => {
      const rect = node.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2 - box.left,
        y: rect.top + rect.height / 2 - box.top - (springs[i]?.y || 0)
      }
    })
  }

  const tick = (now) => {
    raf = 0
    const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000))
    last = now
    const spots = props.hoverEffect === 'lift' && pointer.inside && revealed ? centers : null
    const radius = em * 1.15
    let moving = false
    for (let k = kicks.length - 1; k >= 0; k--) {
      if (now < kicks[k].at) continue
      const spring = springs[kicks[k].index]
      if (spring) spring.v -= kicks[k].velocity
      kicks.splice(k, 1)
    }
    movers.forEach((node, i) => {
      const spring = springs[i] || (springs[i] = { y: 0, v: 0 })
      const spot = spots?.[i]
      let target = 0
      if (spot) {
        const dx = (spot.x - pointer.x) / radius
        const dy = (spot.y - pointer.y) / (radius * 1.4)
        target = -lift * Math.exp(-(dx * dx + dy * dy) * 0.5)
      }
      spring.v += (STIFFNESS * (target - spring.y) - DAMPING * spring.v) * dt
      spring.y += spring.v * dt
      if (Math.abs(target - spring.y) < 0.02 && Math.abs(spring.v) < 0.05) {
        spring.y = target
        spring.v = 0
      } else {
        moving = true
      }
      node.style.translate = Math.abs(spring.y) > 0.01 ? `0 ${spring.y.toFixed(2)}px` : ''
    })
    if (moving || kicks.length) raf = requestAnimationFrame(tick)
  }

  const wake = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const locate = (event) => {
    const box = el.getBoundingClientRect()
    pointer.x = event.clientX - box.left
    pointer.y = event.clientY - box.top
  }

  const onEnter = (event) => {
    locate(event)
    pointer.inside = true
    if (!revealed) return
    if (props.trigger === 'hover') cycle()
    if (props.hoverEffect === 'none') return
    measure()
    if (props.hoverEffect === 'wave') {
      const now = performance.now()
      const speed = em * 9
      const velocity = (em * 0.16) / KICK
      centers.forEach((center, index) => {
        kicks.push({ index, velocity, at: now + (Math.abs(center.x - pointer.x) / speed) * 1000 })
      })
    }
    wake()
  }

  const onMove = (event) => {
    locate(event)
    pointer.inside = true
    if (!revealed || props.hoverEffect !== 'lift') return
    if (!centers) measure()
    wake()
  }

  const onLeave = () => {
    pointer.inside = false
    wake()
  }

  const onClick = () => {
    if (props.trigger === 'click') cycle()
  }

  const splitInstance = new GSAPSplitText(el, {
    type: props.splitType,
    smartWrap: true,
    autoSplit: props.splitType === 'lines',
    mask: props.mask ? unit : undefined,
    linesClass: 'split-line',
    wordsClass: 'split-word',
    charsClass: 'split-char',
    reduceWhiteSpace: false,
    onSplit: (self) => {
      pieces = [self[unit], self.chars, self.words, self.lines].find((list) => list.length) || []
      movers = props.mask && self.masks?.length === pieces.length ? self.masks : pieces
      order = gsap.utils.distribute({ each: props.delay / 1000, from: props.staggerFrom })
      centers = null
      springs.length = 0
      kicks.length = 0
      if (busy && busy !== intro) {
        busy.kill()
        busy = null
      }
      if (revealed) return undefined
      intro = reveal(true, {
        scrollTrigger:
          props.trigger === 'load'
            ? undefined
            : { trigger: el, start, once: true, fastScrollEnd: true, anticipatePin: 0.4 },
        onComplete: () => {
          revealed = true
          intro = null
          busy = null
          finish()
          queue()
        }
      })
      busy = intro
      return intro
    },
    onRevert: () => {
      movers = []
      pieces = []
      centers = null
    }
  })

  ready.value = true
  if (revealed) queue()

  el.addEventListener('pointerenter', onEnter)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('click', onClick)

  teardown = () => {
    cancelAnimationFrame(raf)
    queued?.kill()
    busy?.kill()
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    el.removeEventListener('click', onClick)
    movers.forEach((node) => {
      node.style.translate = ''
    })
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.trigger === el) trigger.kill()
    })
    splitInstance.revert()
  }
}

const clip = computed(
  () =>
    props.hoverEffect === 'none' &&
    (props.from !== null || props.to !== null || props.effect === 'rise' || props.effect === 'fade')
)

const rootStyle = computed(() => ({
  textAlign: props.textAlign,
  overflow: clip.value ? 'hidden' : 'visible',
  display: 'inline-block',
  whiteSpace: 'normal',
  wordWrap: 'break-word',
  color: props.color || undefined,
  cursor: props.trigger === 'click' ? 'pointer' : undefined,
  visibility: ready.value ? undefined : 'hidden'
}))

watch(
  () => [
    props.text,
    props.delay,
    props.duration,
    props.ease,
    props.splitType,
    JSON.stringify(props.from),
    JSON.stringify(props.to),
    props.threshold,
    props.rootMargin,
    props.staggerFrom,
    props.mask,
    props.effect,
    props.trigger,
    props.loop,
    props.loopDelay,
    props.hoverEffect,
    props.accentColor,
    fontsLoaded.value
  ],
  () => nextTick(setup),
  { flush: 'post' }
)

onMounted(() => {
  if (fontsAreLoaded()) {
    setup()
    return
  }
  document.fonts.ready.then(() => {
    fontsLoaded.value = true
    nextTick(setup)
  })
})

onBeforeUnmount(cleanup)
</script>

<template>
  <component :is="tag" ref="root" class="split-parent" :class="className" :style="rootStyle">
    {{ text }}
  </component>
</template>

<style scoped>
.split-parent {
  display: inline-block;
  max-width: 100%;
}
</style>
