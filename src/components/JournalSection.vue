<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { posts } from '../data/posts'
import JournalList from './JournalList.vue'

const latest = computed(() => posts.slice(0, 4))
</script>

<template>
  <section
    id="journal"
    class="journal-section theme-paper"
    data-section="05"
    data-label="Journal"
  >
    <div class="journal-section__grid" aria-hidden="true"></div>

    <div class="shell journal-section__inner">
      <header class="journal-section__head">
        <span class="eyebrow">05 / Journal · 手记</span>
        <RouterLink
          to="/journal"
          class="journal-section__all mono"
          data-cursor="Read"
        >
          <span>All entries / {{ String(posts.length).padStart(2, '0') }}</span>
          <span class="journal-section__all-icon" aria-hidden="true">↗</span>
        </RouterLink>
      </header>

      <div class="journal-section__intro">
        <h2 class="journal-section__title">
          <span>Notes on</span>
          <em>building.</em>
        </h2>

        <div class="journal-section__lede">
          <p>
            关于工程、产品与设计的零散记录。它们不是结论，
            更像是一些被留下来的决策过程——写给同样在意细节的人。
          </p>
          <div class="journal-section__meta mono">
            <span>Essays &amp; build notes</span>
            <span>2026 — ongoing</span>
          </div>
        </div>
      </div>

      <div v-reveal="{ delay: 60 }" class="journal-section__list">
        <JournalList :posts="latest" />
      </div>

      <footer class="journal-section__foot">
        <span class="mono">04 / {{ String(posts.length).padStart(2, '0') }} — latest entries</span>
        <RouterLink to="/journal" class="journal-section__more" data-cursor="Read">
          <span>Continue reading</span>
          <span class="journal-section__more-line" aria-hidden="true"></span>
        </RouterLink>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.journal-section {
  position: relative;
  overflow: hidden;
  padding-block: clamp(90px, 12vw, 176px);
  background: var(--paper);
  color: var(--fg);
  transition: background-color 0.6s ease, color 0.6s ease;
}

.journal-section::after {
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: var(--line);
  content: '';
}

.journal-section__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(17, 16, 14, 0.055) 1px, transparent 1px);
  background-size: 25vw 100%;
  pointer-events: none;
}

.journal-section__inner {
  position: relative;
  z-index: 1;
}

.journal-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: clamp(34px, 5vw, 66px);
  border-bottom: 1px solid var(--line);
}

.journal-section__all {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 9px;
  letter-spacing: 0.12em;
  transition: color 0.35s ease;
}

.journal-section__all-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  font-size: 13px;
  transition:
    background-color 0.35s ease,
    color 0.35s ease,
    transform 0.5s var(--ease-out);
}

.journal-section__all:hover {
  color: var(--accent);
}

.journal-section__all:hover .journal-section__all-icon {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff6ec;
  transform: rotate(45deg);
}

.journal-section__intro {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: clamp(28px, 7vw, 120px);
  align-items: end;
  padding-block: clamp(34px, 5vw, 72px);
}

.journal-section__title {
  display: flex;
  flex-direction: column;
  margin-left: -0.04em;
  font-family: var(--font-serif);
  font-size: clamp(3.2rem, 8vw, 8.4rem);
  font-weight: 400;
  line-height: 0.82;
  letter-spacing: -0.045em;
}

.journal-section__title em {
  padding-left: clamp(30px, 8vw, 130px);
  color: var(--accent);
  font-style: italic;
}

.journal-section__lede {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-bottom: clamp(4px, 1vw, 14px);
}

.journal-section__lede p {
  max-width: 34ch;
  color: var(--fg-dim);
  font-size: clamp(13px, 1.05vw, 15px);
  line-height: 1.9;
}

.journal-section__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.journal-section__list {
  position: relative;
}

.journal-section__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: clamp(24px, 3vw, 40px);
}

.journal-section__foot .mono {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.journal-section__more {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-family: var(--font-serif);
  font-size: clamp(1.15rem, 1.5vw, 1.5rem);
  font-style: italic;
  letter-spacing: -0.02em;
  transition: color 0.35s ease;
}

.journal-section__more:hover {
  color: var(--accent);
}

.journal-section__more-line {
  position: relative;
  display: block;
  width: 44px;
  height: 1px;
  overflow: hidden;
  background: var(--line-strong);
}

.journal-section__more-line::after {
  position: absolute;
  inset: 0;
  background: var(--accent);
  content: '';
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.5s var(--ease-out);
}

.journal-section__more:hover .journal-section__more-line::after {
  transform: scaleX(1);
}

@media (max-width: 900px) {
  .journal-section__intro {
    grid-template-columns: 1fr;
    gap: 30px;
    align-items: start;
  }

  .journal-section__lede {
    max-width: 46ch;
  }
}

@media (max-width: 640px) {
  .journal-section {
    padding-block: 78px;
  }

  .journal-section__head {
    padding-bottom: 26px;
  }

  .journal-section__all span:first-child {
    font-size: 8px;
  }

  .journal-section__title {
    font-size: clamp(3rem, 16vw, 5rem);
  }

  .journal-section__title em {
    padding-left: 20px;
  }

  .journal-section__foot {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .journal-section__more {
    font-size: 1.2rem;
  }
}
</style>
