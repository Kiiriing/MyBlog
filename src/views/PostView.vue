<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAdjacentPost, getPost } from '../data/posts'
import ArtworkFrame from '../components/ArtworkFrame.vue'
import SiteFooter from '../components/SiteFooter.vue'

const route = useRoute()
const article = ref(null)
const progress = ref(0)

const post = computed(() => getPost(route.params.slug))
const adjacent = computed(() => getAdjacentPost(route.params.slug))
const titleParts = computed(() =>
  String(post.value?.title || '')
    .split(/(?<=[：:、，,。—])/)
    .filter(Boolean)
)

let ticking = false
let frame = 0

function updateProgress() {
  ticking = false
  if (!article.value) return

  const start = article.value.offsetTop - window.innerHeight * 0.35
  const distance = Math.max(1, article.value.offsetHeight - window.innerHeight * 0.45)
  const value = (window.scrollY - start) / distance

  progress.value = Math.min(1, Math.max(0, value))
}

function onScroll() {
  if (ticking) return
  ticking = true
  frame = requestAnimationFrame(updateProgress)
}

onMounted(() => {
  document.title = post.value
    ? `${post.value.title} — 陆屿 LU YU`
    : '未找到这篇手记 — 陆屿 LU YU'
  updateProgress()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div v-if="post" class="post-page theme-paper">
    <div class="post-progress" aria-hidden="true">
      <span :style="{ transform: `scaleX(${progress})` }"></span>
    </div>

    <header class="post-head">
      <div class="shell">
        <div class="post-head__top">
          <RouterLink to="/journal" class="post-back mono" data-cursor="Back">
            <span aria-hidden="true">←</span>
            <span>Journal / 手记</span>
          </RouterLink>
          <span class="mono post-head__no">{{ post.index }} / 05</span>
        </div>

        <div class="post-head__meta">
          <span class="post-head__cat mono">{{ post.category }}</span>
          <span class="mono">{{ post.date }}</span>
          <span class="mono">{{ post.reading }} read</span>
        </div>

        <h1 class="post-head__title">
          <span v-for="(part, index) in titleParts" :key="index" class="post-head__title-part">
            {{ part }}
          </span>
        </h1>
        <p class="post-head__en">{{ post.en }}</p>
        <p class="post-head__excerpt">{{ post.excerpt }}</p>

        <div class="post-head__tags">
          <span v-for="tag in post.tags" :key="tag" class="post-head__tag mono">
            {{ tag }}
          </span>
        </div>
      </div>
    </header>

    <div class="post-cover shell">
      <ArtworkFrame
        :src="post.art"
        :alt="`${post.title} — 文章配图`"
        ratio="16 / 9"
        :parallax="8"
        eager
      >
        <div class="post-cover__meta mono">
          <span>LU YU / Journal</span>
          <span>{{ post.date }}</span>
        </div>
      </ArtworkFrame>
      <p class="post-cover__caption mono">
        Fig. {{ post.index }} — {{ post.en }}, {{ post.date.slice(0, 4) }}
      </p>
    </div>

    <div class="post-layout shell">
      <aside class="post-aside">
        <div class="post-aside__inner">
          <span class="post-aside__label mono">Filed under</span>
          <ul class="post-aside__tags">
            <li v-for="tag in post.tags" :key="tag">#{{ tag }}</li>
          </ul>
          <div class="post-aside__rule"></div>
          <div class="post-aside__meta mono">
            <span>Words — 我</span>
            <span>Images — 我</span>
            <span>Beijing, CN</span>
          </div>
        </div>
      </aside>

      <article ref="article" class="post-body">
        <template v-for="(block, index) in post.blocks" :key="index">
          <p v-if="block.type === 'p'" class="post-body__p">{{ block.text }}</p>

          <h2 v-else-if="block.type === 'h2'" class="post-body__h2">
            <span>{{ block.text }}</span>
          </h2>

          <blockquote v-else-if="block.type === 'quote'" class="post-body__quote">
            <p>{{ block.text }}</p>
            <cite v-if="block.cite" class="mono">{{ block.cite }}</cite>
          </blockquote>

          <ul v-else-if="block.type === 'list'" class="post-body__list">
            <li v-for="item in block.items" :key="item">{{ item }}</li>
          </ul>

          <figure v-else-if="block.type === 'image'" class="post-body__figure">
            <div class="post-body__figure-frame">
              <img
                :src="block.src"
                :alt="block.caption"
                loading="lazy"
                decoding="async"
                :style="{ objectPosition: block.position || '50% 50%' }"
              />
            </div>
            <figcaption class="mono">{{ block.caption }}</figcaption>
          </figure>

          <pre v-else-if="block.type === 'code'" class="post-body__code"><code>{{ block.text }}</code></pre>
        </template>
      </article>
    </div>

    <nav class="post-adjacent shell" aria-label="文章导航">
      <RouterLink
        v-if="adjacent.prev"
        :to="`/journal/${adjacent.prev.slug}`"
        class="post-adjacent__item"
        data-cursor="Read"
      >
        <span class="mono">Newer / 更新一篇</span>
        <span class="post-adjacent__title">{{ adjacent.prev.title }}</span>
        <span class="post-adjacent__en">{{ adjacent.prev.en }}</span>
      </RouterLink>
      <span v-else class="post-adjacent__empty"></span>

      <RouterLink
        v-if="adjacent.next"
        :to="`/journal/${adjacent.next.slug}`"
        class="post-adjacent__item post-adjacent__item--right"
        data-cursor="Read"
      >
        <span class="mono">Older / 更早一篇</span>
        <span class="post-adjacent__title">{{ adjacent.next.title }}</span>
        <span class="post-adjacent__en">{{ adjacent.next.en }}</span>
      </RouterLink>
    </nav>

    <div class="post-return shell">
      <RouterLink to="/journal" class="post-return__link" data-cursor="Index">
        <span>Back to all entries</span>
        <span aria-hidden="true">↖</span>
      </RouterLink>
    </div>

    <SiteFooter />
  </div>

  <div v-else class="post-missing theme-paper">
    <div class="shell post-missing__inner">
      <span class="eyebrow">404 / Journal</span>
      <h1 class="post-missing__title">This note<br /><em>got lost.</em></h1>
      <p>这篇手记可能被移动了，或者还没有写完。</p>
      <RouterLink to="/journal" class="post-missing__link" data-cursor="Back">
        返回手记索引 ↗
      </RouterLink>
    </div>
    <SiteFooter />
  </div>
</template>

<style scoped>
.post-page {
  position: relative;
  padding-top: calc(var(--nav-h) + clamp(24px, 4vw, 54px));
  background: var(--paper);
  color: var(--fg);
}

.post-progress {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 940;
  height: 2px;
  background: rgba(17, 16, 14, 0.08);
  pointer-events: none;
}

.post-progress span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--accent);
  transform-origin: left center;
  will-change: transform;
}

.post-head__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: clamp(26px, 4vw, 46px);
  border-bottom: 1px solid var(--line);
}

.post-back {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--fg-dim);
  font-size: 9px;
  letter-spacing: 0.1em;
  transition: color 0.35s ease;
}

.post-back:hover {
  color: var(--accent);
}

.post-head__no {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.post-head__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  padding-top: clamp(28px, 4vw, 48px);
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.post-head__cat {
  color: var(--accent);
}

.post-head__title {
  max-width: 22ch;
  margin-top: clamp(20px, 3vw, 36px);
  font-family: var(--font-serif);
  font-size: clamp(2.6rem, 6.8vw, 7rem);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.045em;
}

.post-head__title-part {
  white-space: nowrap;
}

.post-head__en {
  margin-top: 10px;
  color: var(--fg-dim);
  font-family: var(--font-serif);
  font-size: clamp(1.1rem, 1.8vw, 1.7rem);
  font-style: italic;
  letter-spacing: -0.02em;
}

.post-head__excerpt {
  max-width: 56ch;
  margin-top: clamp(24px, 3.4vw, 44px);
  color: var(--fg-dim);
  font-size: clamp(14px, 1.2vw, 17px);
  line-height: 1.9;
}

.post-head__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: clamp(20px, 3vw, 34px);
}

.post-head__tag {
  padding: 6px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--fg-dim);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.post-cover {
  margin-top: clamp(36px, 6vw, 80px);
}

.post-cover__meta {
  position: absolute;
  right: 16px;
  bottom: 14px;
  left: 16px;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.9);
  font-size: 8px;
  letter-spacing: 0.1em;
  mix-blend-mode: difference;
  pointer-events: none;
}

.post-cover__caption {
  margin-top: 10px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: none;
}

.post-layout {
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 760px) minmax(20px, 1fr);
  gap: clamp(28px, 5vw, 90px);
  align-items: start;
  padding-block: clamp(52px, 8vw, 110px);
}

.post-aside {
  align-self: stretch;
}

.post-aside__inner {
  position: sticky;
  top: calc(var(--nav-h) + 32px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
}

.post-aside__label {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.post-aside__tags {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: var(--fg-dim);
  font-size: 12px;
  list-style: none;
}

.post-aside__rule {
  width: 34px;
  height: 1px;
  margin-block: 10px;
  background: var(--line-strong);
}

.post-aside__meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--fg-faint);
  font-size: 7px;
  letter-spacing: 0.1em;
}

.post-body {
  min-width: 0;
}

.post-body__p {
  margin-bottom: 1.65em;
  color: var(--fg);
  font-size: clamp(15px, 1.22vw, 17px);
  line-height: 2.05;
  letter-spacing: 0.005em;
}

.post-body__p:first-of-type {
  font-size: clamp(17px, 1.45vw, 20px);
  line-height: 1.95;
}

.post-body__p:first-of-type::first-letter {
  float: left;
  margin: 0.07em 0.12em 0 0;
  color: var(--accent);
  font-family: var(--font-serif);
  font-size: 3.6em;
  line-height: 0.74;
}

.post-body__h2 {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 2.6em 0 1.2em;
  font-family: var(--font-serif);
  font-size: clamp(1.65rem, 2.3vw, 2.35rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.025em;
}

.post-body__h2::before {
  width: 26px;
  height: 1px;
  background: var(--accent);
  content: '';
}

.post-body__quote {
  margin: 2.4em 0;
  padding: 0.2em 0 0.2em clamp(20px, 3vw, 40px);
  border-left: 1px solid var(--accent);
}

.post-body__quote p {
  color: var(--fg);
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 2.2vw, 2.2rem);
  font-style: italic;
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.post-body__quote cite {
  display: block;
  margin-top: 16px;
  color: var(--fg-faint);
  font-size: 8px;
  font-style: normal;
  letter-spacing: 0.1em;
  text-transform: none;
}

.post-body__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0 0 2em;
  padding-left: 0;
  list-style: none;
}

.post-body__list li {
  position: relative;
  padding-left: 28px;
  color: var(--fg-dim);
  font-size: clamp(14px, 1.1vw, 16px);
  line-height: 1.85;
}

.post-body__list li::before {
  position: absolute;
  top: 0.78em;
  left: 0;
  width: 12px;
  height: 1px;
  background: var(--accent);
  content: '';
}

.post-body__figure {
  margin: 2.8em 0;
}

.post-body__figure-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--card);
}

.post-body__figure-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 1.2s var(--ease-out);
}

.post-body__figure:hover img {
  transform: scale(1.025);
}

.post-body__figure figcaption {
  padding-top: 10px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: none;
}

.post-body__code {
  margin: 2.4em 0;
  padding: clamp(20px, 3vw, 34px);
  overflow-x: auto;
  background: var(--ink);
  color: #efe8db;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.9;
  letter-spacing: 0.01em;
  white-space: pre-wrap;
}

.post-adjacent {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(20px, 4vw, 60px);
  padding-block: clamp(28px, 4vw, 48px);
  border-top: 1px solid var(--line);
}

.post-adjacent__item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: color 0.35s ease;
}

.post-adjacent__item--right {
  text-align: right;
  align-items: flex-end;
}

.post-adjacent__item .mono {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.post-adjacent__title {
  font-family: var(--font-serif);
  font-size: clamp(1.4rem, 2.3vw, 2.3rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
  transition: color 0.35s ease;
}

.post-adjacent__item:hover .post-adjacent__title {
  color: var(--accent);
}

.post-adjacent__en {
  color: var(--fg-dim);
  font-family: var(--font-serif);
  font-size: 0.95rem;
  font-style: italic;
}

.post-return {
  display: flex;
  justify-content: center;
  padding-block: clamp(32px, 5vw, 64px);
}

.post-return__link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 13px 24px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition:
    background-color 0.35s ease,
    border-color 0.35s ease,
    color 0.35s ease;
}

.post-return__link:hover {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--paper);
}

.post-missing {
  min-height: 100vh;
  padding-top: calc(var(--nav-h) + 60px);
  background: var(--paper);
  color: var(--fg);
}

.post-missing__inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
  padding-block: clamp(60px, 12vw, 150px);
}

.post-missing__title {
  font-family: var(--font-serif);
  font-size: clamp(3.6rem, 10vw, 10rem);
  font-weight: 400;
  line-height: 0.84;
  letter-spacing: -0.05em;
}

.post-missing__title em {
  color: var(--accent);
  font-style: italic;
}

.post-missing__inner > p {
  color: var(--fg-dim);
}

.post-missing__link {
  display: inline-flex;
  padding: 13px 22px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  transition:
    background-color 0.35s ease,
    color 0.35s ease;
}

.post-missing__link:hover {
  background: var(--fg);
  color: var(--paper);
}

@media (max-width: 1024px) {
  .post-layout {
    grid-template-columns: minmax(0, 760px);
  }

  .post-aside {
    display: none;
  }
}

@media (max-width: 640px) {
  .post-page {
    padding-top: calc(var(--nav-h) + 20px);
  }

  .post-head__title {
    font-size: clamp(2.2rem, 10.6vw, 4rem);
  }

  .post-head__excerpt {
    font-size: 14px;
  }

  .post-cover :deep(.artwork) {
    aspect-ratio: 4 / 3 !important;
  }

  .post-layout {
    padding-block: 40px 60px;
  }

  .post-body__p:first-of-type::first-letter {
    font-size: 3.2em;
  }

  .post-body__figure-frame {
    aspect-ratio: 1 / 1;
  }

  .post-adjacent {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .post-adjacent__item--right {
    align-items: flex-start;
    text-align: left;
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }
}
</style>
