<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { categories, posts } from '../data/posts'
import JournalList from '../components/JournalList.vue'
import SiteFooter from '../components/SiteFooter.vue'

const active = ref('全部')

const filtered = computed(() => {
  if (active.value === '全部') return posts
  return posts.filter((post) => post.category === active.value)
})

const total = String(posts.length).padStart(2, '0')

onMounted(() => {
  document.title = '手记 Journal — 陆屿 LU YU'
})
</script>

<template>
  <div class="journal-page theme-paper">
    <div class="journal-page__grid" aria-hidden="true"></div>

    <header class="journal-page__head">
      <div class="shell">
        <div class="journal-page__meta">
          <span class="eyebrow">Journal / 手记</span>
          <span class="mono journal-page__meta-note">
            Essays, build notes &amp; 一些未完成的想法
          </span>
        </div>

        <h1 class="journal-page__title">
          <span>Notes on</span>
          <em>building &amp; shipping.</em>
        </h1>

        <div class="journal-page__intro">
          <p>
            这里收集我在工程、产品与设计之间留下的笔记。
            有些是关于实现的，有些只是某个下午的调试记录。
            它们被写下来，是因为不想让那些判断太快消失。
          </p>
          <div class="journal-page__index mono">
            <span>{{ total }} entries</span>
            <span>2026 — ongoing</span>
            <span>Beijing</span>
          </div>
        </div>
      </div>
    </header>

    <main class="journal-page__body">
      <div class="shell">
        <div class="journal-page__filters">
          <span class="mono journal-page__filter-label">Filter / 筛选</span>
          <div class="journal-page__filter-group" role="group" aria-label="按分类筛选文章">
            <button
              v-for="category in categories"
              :key="category"
              class="journal-page__filter"
              :class="{ 'is-active': active === category }"
              type="button"
              :aria-pressed="active === category"
              @click="active = category"
            >
              <span>{{ category }}</span>
              <span class="journal-page__filter-count">
                {{
                  category === '全部'
                    ? posts.length
                    : posts.filter((post) => post.category === category).length
                }}
              </span>
            </button>
          </div>
          <span class="mono journal-page__result" aria-live="polite">
            {{ String(filtered.length).padStart(2, '0') }} shown
          </span>
        </div>

        <div class="journal-page__list">
          <JournalList :posts="filtered" />
        </div>

        <div class="journal-page__foot">
          <p class="mono">End of index — more notes are being written.</p>
          <RouterLink to="/" class="journal-page__home" data-cursor="Index">
            <span>Back to index</span>
            <span aria-hidden="true">↖</span>
          </RouterLink>
        </div>
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.journal-page {
  position: relative;
  overflow: hidden;
  padding-top: calc(var(--nav-h) + clamp(34px, 6vw, 78px));
  padding-bottom: clamp(70px, 10vw, 140px);
  background: var(--paper);
  color: var(--fg);
}

.journal-page::before {
  position: absolute;
  top: 12vw;
  right: -3vw;
  color: rgba(17, 16, 14, 0.035);
  content: 'JOURNAL';
  font-family: var(--font-serif);
  font-size: clamp(9rem, 25vw, 28rem);
  font-style: italic;
  line-height: 0.7;
  letter-spacing: -0.06em;
  pointer-events: none;
}

.journal-page__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(17, 16, 14, 0.05) 1px, transparent 1px);
  background-size: 25vw 100%;
  pointer-events: none;
}

.journal-page__head,
.journal-page__body {
  position: relative;
  z-index: 1;
}

.journal-page__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: clamp(28px, 4vw, 54px);
  border-bottom: 1px solid var(--line);
}

.journal-page__meta-note {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.journal-page__title {
  display: flex;
  flex-direction: column;
  margin-top: clamp(30px, 5vw, 64px);
  margin-left: -0.045em;
  font-family: var(--font-serif);
  font-size: clamp(3.4rem, 9vw, 9.4rem);
  font-weight: 400;
  line-height: 0.82;
  letter-spacing: -0.05em;
}

.journal-page__title em {
  padding-left: clamp(22px, 8vw, 140px);
  color: var(--accent);
  font-style: italic;
}

.journal-page__intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(28px, 6vw, 100px);
  max-width: 940px;
  margin-top: clamp(26px, 4vw, 52px);
  margin-left: auto;
  padding-bottom: clamp(34px, 5vw, 64px);
}

.journal-page__intro p {
  max-width: 46ch;
  color: var(--fg-dim);
  font-size: clamp(13px, 1.08vw, 15px);
  line-height: 1.95;
}

.journal-page__index {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 0 auto;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.journal-page__filters {
  position: sticky;
  top: var(--nav-h);
  z-index: 20;
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 90px;
  gap: 20px;
  align-items: center;
  padding-block: 16px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}

.journal-page__filter-label,
.journal-page__result {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.journal-page__result {
  text-align: right;
}

.journal-page__filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.journal-page__filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--fg-dim);
  font-family: var(--font-sans);
  font-size: 12px;
  letter-spacing: 0.06em;
  transition:
    border-color 0.35s ease,
    background-color 0.35s ease,
    color 0.35s ease;
}

.journal-page__filter-count {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.04em;
  opacity: 0.55;
}

.journal-page__filter:hover {
  border-color: var(--line-strong);
  color: var(--fg);
}

.journal-page__filter.is-active {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--paper);
}

.journal-page__filter.is-active .journal-page__filter-count {
  opacity: 0.7;
}

.journal-page__list {
  padding-top: clamp(24px, 4vw, 48px);
}

.journal-page__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: clamp(28px, 4vw, 46px);
}

.journal-page__foot .mono {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.journal-page__home {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-serif);
  font-size: clamp(1.15rem, 1.5vw, 1.5rem);
  font-style: italic;
  transition: color 0.35s ease;
}

.journal-page__home:hover {
  color: var(--accent);
}

@media (max-width: 900px) {
  .journal-page__filters {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .journal-page__filter-label {
    display: none;
  }

  .journal-page__result {
    display: none;
  }

  .journal-page__intro {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }

  .journal-page__index {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 18px;
  }
}

@media (max-width: 640px) {
  .journal-page {
    padding-top: calc(var(--nav-h) + 26px);
  }

  .journal-page__meta-note {
    display: none;
  }

  .journal-page__title {
    font-size: clamp(3rem, 15vw, 5rem);
  }

  .journal-page__title em {
    padding-left: 16px;
  }

  .journal-page__filters {
    margin-inline: calc(var(--gutter) * -1);
    padding-inline: var(--gutter);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .journal-page__filter-group {
    flex-wrap: nowrap;
    width: max-content;
  }

  .journal-page__filter {
    padding: 6px 11px;
    font-size: 11px;
    white-space: nowrap;
  }

  .journal-page__foot {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
}
</style>
