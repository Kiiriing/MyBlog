<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ScrollTrigger } from './lib/gsap'
import {
  destroySmoothScroll,
  getLenis,
  initSmoothScroll,
  lockScroll
} from './composables/useSmoothScroll'
import { finishBoot, setMenuOpen, ui } from './stores/ui'
import Preloader from './components/Preloader.vue'
import CustomCursor from './components/CustomCursor.vue'
import GrainOverlay from './components/GrainOverlay.vue'
import SiteHeader from './components/SiteHeader.vue'
import MenuOverlay from './components/MenuOverlay.vue'
import ScrollProgress from './components/ScrollProgress.vue'
import RouteWipe from './components/RouteWipe.vue'

const route = useRoute()

const showPreloader = ref(true)
const isHome = computed(() => route.name === 'home')
const pageReady = ref(true)
const scrolled = ref(false)
const wipe = ref(null)

const wipeNames = {
  home: 'Index',
  'work-index': 'Work',
  work: 'Case',
  journal: 'Journal',
  post: 'Entry',
  'not-found': '404'
}

let refreshTimer = null
let pendingReset = false

function onIntro() {
  ui.introDone = true
}

function onPreloaderDone() {
  finishBoot()
  showPreloader.value = false
  scheduleRefresh(240)
}

async function resetScroll() {
  await nextTick()
  const lenis = getLenis()

  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true })
  } else {
    window.scrollTo(0, 0)
  }

  scheduleRefresh(520)
}

function scheduleRefresh(delay = 420) {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), delay)
}

function onAfterLeave() {
  if (!pendingReset) return
  pendingReset = false
  resetScroll()
  window.setTimeout(() => {
    pageReady.value = true
  }, 90)
}

function onKeydown(event) {
  if (event.key !== 'Escape' || !ui.menuOpen) return
  setMenuOpen(false)
}

function onScroll() {
  scrolled.value = window.scrollY > 28
}

watch(
  () => route.path,
  () => {
    pendingReset = true
    pageReady.value = false
    if (ui.menuOpen) setMenuOpen(false)

    if (ui.introDone) {
      wipe.value?.play(wipeNames[route.name] || 'Index', route.fullPath)
    }
  }
)

onMounted(() => {
  initSmoothScroll()
  lockScroll()
  onScroll()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
  destroySmoothScroll()
})
</script>

<template>
  <div class="app">
    <a class="skip-link" href="#main">跳至主要内容</a>

    <Preloader
      v-if="showPreloader"
      @intro="onIntro"
      @done="onPreloaderDone"
    />

    <CustomCursor />
    <GrainOverlay />
    <RouteWipe ref="wipe" />
    <div class="top-shade" :class="{ 'is-on': scrolled }" aria-hidden="true"></div>
    <SiteHeader />
    <MenuOverlay />

    <ScrollProgress v-if="isHome && ui.introDone && pageReady" />

    <main
      id="main"
      class="site-main"
      :inert="ui.menuOpen || undefined"
      :aria-hidden="ui.menuOpen || undefined"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in" @after-leave="onAfterLeave">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  min-height: 100vh;
  background: var(--bg);
}

.site-main {
  position: relative;
}

.top-shade {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 790;
  height: calc(var(--nav-h) + 18px);
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--bg-deep) 94%, transparent) 0%,
    color-mix(in srgb, var(--bg-deep) 74%, transparent) 58%,
    transparent 100%
  );
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
}

.top-shade.is-on {
  opacity: 1;
}

.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1200;
  padding: 10px 16px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  transform: translateY(-160%);
  transition: transform 0.35s var(--ease-out);
}

.skip-link:focus-visible {
  outline-offset: 2px;
  transform: translateY(0);
}
</style>
