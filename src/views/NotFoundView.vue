<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { toggleMenu } from '../stores/ui'
import SiteFooter from '../components/SiteFooter.vue'

onMounted(() => {
  document.title = 'Lost signal — 陆屿 LU YU'
})
</script>

<template>
  <div class="notfound">
    <div class="notfound__ambient" aria-hidden="true"></div>

    <div class="shell notfound__inner">
      <div class="notfound__top">
        <span class="eyebrow">404 / Lost signal</span>
        <span class="mono">Beijing, CN — {{ new Date().getFullYear() }}</span>
      </div>

      <div class="notfound__main">
        <div class="notfound__code" aria-hidden="true">404</div>

        <div class="notfound__copy">
          <h1 class="notfound__title">
            This page<br />
            <em>drifted away.</em>
          </h1>
          <p class="notfound__text">
            你要找的页面可能被移动、删除，或者从来没有真正存在过。
            不如回到信号开始的地方，再试一次。
          </p>

          <div class="notfound__actions">
            <RouterLink to="/" class="notfound__btn" data-cursor="Index">
              <span>返回首页</span>
              <span aria-hidden="true">↖</span>
            </RouterLink>
            <RouterLink to="/journal" class="notfound__btn" data-cursor="Read">
              <span>阅读手记</span>
              <span aria-hidden="true">↗</span>
            </RouterLink>
            <button
              type="button"
              class="notfound__btn notfound__btn--ghost"
              data-cursor="Menu"
              @click="toggleMenu"
            >
              <span>打开菜单</span>
              <span aria-hidden="true">≡</span>
            </button>
          </div>
        </div>
      </div>

      <div class="notfound__foot">
        <span class="mono">Error 404 — Page not found</span>
        <span class="mono">But the signal continues.</span>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>

<style scoped>
.notfound {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding-top: calc(var(--nav-h) + clamp(28px, 5vw, 60px));
  background: var(--bg-deep);
  color: var(--fg);
}

.notfound__ambient {
  position: absolute;
  top: -10vw;
  right: -6vw;
  width: 55vw;
  height: 55vw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 90, 47, 0.18), transparent 62%);
  filter: blur(80px);
  pointer-events: none;
}

.notfound__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: calc(100svh - var(--nav-h) - 80px);
  padding-bottom: clamp(50px, 8vw, 110px);
}

.notfound__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: clamp(30px, 4vw, 54px);
  border-bottom: 1px solid var(--line);
  color: var(--fg-faint);
}

.notfound__top .mono {
  font-size: 8px;
  letter-spacing: 0.1em;
}

.notfound__main {
  position: relative;
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.64fr);
  gap: clamp(28px, 5vw, 90px);
  align-items: center;
  padding-block: clamp(40px, 7vw, 100px);
}

.notfound__code {
  color: transparent;
  font-family: var(--font-serif);
  font-size: clamp(9rem, 27vw, 30rem);
  font-style: italic;
  line-height: 0.68;
  letter-spacing: -0.07em;
  -webkit-text-stroke: 1px rgba(242, 237, 228, 0.26);
  user-select: none;
}

.notfound__copy {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.notfound__title {
  font-family: var(--font-serif);
  font-size: clamp(2.4rem, 4.6vw, 5rem);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.04em;
}

.notfound__title em {
  color: var(--accent);
  font-style: italic;
}

.notfound__text {
  max-width: 38ch;
  color: var(--fg-dim);
  font-size: clamp(13px, 1.05vw, 15px);
  line-height: 1.9;
}

.notfound__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 8px;
}

.notfound__btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  transition:
    background-color 0.35s ease,
    border-color 0.35s ease,
    color 0.35s ease;
}

.notfound__btn:hover {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--bg-deep);
}

.notfound__btn--ghost {
  border-color: transparent;
  color: var(--fg-dim);
}

.notfound__btn--ghost:hover {
  border-color: var(--line-strong);
  background: transparent;
  color: var(--fg);
}

.notfound__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  color: var(--fg-faint);
}

.notfound__foot .mono {
  font-size: 8px;
  letter-spacing: 0.1em;
}

@media (max-width: 900px) {
  .notfound__main {
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: start;
  }

  .notfound__code {
    font-size: clamp(9rem, 36vw, 18rem);
  }
}

@media (max-width: 640px) {
  .notfound__top .mono {
    display: none;
  }

  .notfound__title {
    font-size: clamp(2.3rem, 11vw, 3.4rem);
  }

  .notfound__foot {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
