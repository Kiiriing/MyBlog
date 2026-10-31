<script setup>
import { useRoute, RouterLink } from 'vue-router'
import { ui, setMenuOpen, toggleMenu } from '../stores/ui'
import { scrollTo } from '../composables/useSmoothScroll'
import { site } from '../data/site'

const route = useRoute()

function onBrandClick(event) {
  if (ui.menuOpen) setMenuOpen(false)
  if (route.name === 'home') {
    event.preventDefault()
    scrollTo(0, { duration: 1.2 })
  }
}
</script>

<template>
  <header class="site-header" :class="{ 'is-visible': ui.introDone, 'is-menu-open': ui.menuOpen }">
    <RouterLink to="/" class="brand" aria-label="LU YU — 返回首页" @click="onBrandClick">
      <span class="brand__name">LU YU<span class="brand__reg">®</span></span>
      <span class="brand__meta">陆屿 / {{ site.role }}</span>
    </RouterLink>

    <div class="header-note">
      <span class="header-note__dot"></span>
      <span>{{ site.availability }}</span>
    </div>

    <button
      class="menu-btn"
      type="button"
      :aria-expanded="ui.menuOpen"
      aria-controls="site-menu"
      :aria-label="ui.menuOpen ? '关闭菜单' : '打开菜单'"
      @click="toggleMenu"
    >
      <span class="menu-btn__label">{{ ui.menuOpen ? 'Close' : 'Menu' }}</span>
      <span class="menu-btn__icon" aria-hidden="true">
        <i></i>
        <i></i>
      </span>
    </button>
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: var(--nav-h);
  padding: 0 var(--gutter);
  color: #fff;
  mix-blend-mode: difference;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(0, -110%, 0);
  transition:
    transform 1.25s var(--ease-out) 0.15s,
    opacity 0.8s ease 0.15s;
}

.site-header.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.site-header > * {
  pointer-events: auto;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  transform-origin: left center;
  transition: transform 0.5s var(--ease-out);
}

.brand:hover {
  transform: scale(1.02);
}

.brand__name {
  font-family: var(--font-serif);
  font-size: 25px;
  font-style: italic;
  line-height: 0.9;
  letter-spacing: -0.02em;
}

.brand__reg {
  display: inline-block;
  margin-left: 2px;
  font-family: var(--font-mono);
  font-size: 8px;
  font-style: normal;
  vertical-align: top;
  transform: translateY(2px);
}

.brand__meta {
  font-family: var(--font-mono);
  font-size: 8px;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.58;
}

.header-note {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transform: translate(-50%, -50%);
  opacity: 0.65;
  white-space: nowrap;
}

.header-note__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2.6s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: inherit;
  text-transform: uppercase;
}

.menu-btn__label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
}

.menu-btn__icon {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 20px;
  height: 20px;
}

.menu-btn__icon i {
  display: block;
  width: 20px;
  height: 1px;
  background: currentColor;
  transition:
    transform 0.45s var(--ease-out),
    width 0.45s var(--ease-out);
}

.menu-btn:hover .menu-btn__icon i:first-child {
  width: 13px;
}

.menu-btn:hover .menu-btn__icon i:last-child {
  width: 20px;
}

.is-menu-open .menu-btn__icon i:first-child {
  transform: translateY(3px) rotate(45deg);
}

.is-menu-open .menu-btn__icon i:last-child {
  transform: translateY(-3px) rotate(-45deg);
}

@media (max-width: 980px) {
  .header-note {
    display: none;
  }
}

@media (max-width: 560px) {
  .brand__meta {
    display: none;
  }

  .brand__name {
    font-size: 22px;
  }

  .menu-btn__label {
    display: none;
  }

  .menu-btn__icon {
    width: 24px;
  }

  .menu-btn__icon i {
    width: 24px;
  }
}
</style>
