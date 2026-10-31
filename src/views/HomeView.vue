<script setup>
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ScrollTrigger } from '../lib/gsap'
import { scrollToSection } from '../composables/useSmoothScroll'
import { ui } from '../stores/ui'
import HeroSection from '../components/HeroSection.vue'
import MarqueeBand from '../components/MarqueeBand.vue'
import ManifestoSection from '../components/ManifestoSection.vue'
import AboutSection from '../components/AboutSection.vue'
import WorksSection from '../components/WorksSection.vue'
import JournalSection from '../components/JournalSection.vue'
import SiteFooter from '../components/SiteFooter.vue'

const route = useRoute()

let hashTimer = null

function jumpToHash(hash) {
  const id = String(hash || '').replace(/^#/, '')
  if (!id) return

  if (hashTimer) window.clearTimeout(hashTimer)
  hashTimer = window.setTimeout(async () => {
    await nextTick()
    ScrollTrigger.refresh()
    scrollToSection(id)
  }, 620)
}

onMounted(() => {
  document.title = '陆屿 LU YU — Full-stack Web Developer'
  if (route.hash && !ui.booting) jumpToHash(route.hash)
})

watch(
  () => ui.booting,
  (booting) => {
    if (!booting && route.hash) jumpToHash(route.hash)
  }
)

watch(
  () => route.hash,
  (hash) => {
    if (hash) jumpToHash(hash)
  }
)

onBeforeUnmount(() => {
  if (hashTimer) window.clearTimeout(hashTimer)
})
</script>

<template>
  <div class="home">
    <HeroSection />
    <MarqueeBand />
    <ManifestoSection />
    <AboutSection />
    <WorksSection />
    <JournalSection />
    <SiteFooter />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  background: var(--bg-deep);
}
</style>
