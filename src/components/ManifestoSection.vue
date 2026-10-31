<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'

const statement = [
  { text: '我相信' },
  { text: '好的网页不是' },
  { text: '把所有东西都加上去，' },
  { text: '而是' },
  { text: '在复杂度里' },
  { text: '找到' },
  { text: '最清晰的那条路径。', accent: true },
  { text: '我从前端、' },
  { text: 'API 与数据库之间工作，' },
  { text: '关心一次加载、' },
  { text: '一个边界条件、' },
  { text: '和每一处' },
  { text: '不该让用户等待的地方。' },
  { text: '它们让复杂系统' },
  { text: '重新变得简单、可信。', accent: true }
]

const statementText = statement.map((word) => word.text).join('')
const textEl = ref(null)
const section = ref(null)
const ghost = ref(null)

let trigger = null
let ghostTween = null

onMounted(() => {
  const words = Array.from(textEl.value?.querySelectorAll('.manifesto__word') || [])
  if (!words.length) return

  if (prefersReducedMotion()) {
    words.forEach((word) => {
      word.style.opacity = 1
    })
    return
  }

  words.forEach((word) => {
    word.style.opacity = 0.14
  })

  trigger = ScrollTrigger.create({
    trigger: textEl.value,
    start: 'top 82%',
    end: 'bottom 42%',
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress
      words.forEach((word, index) => {
        const local = (progress * (words.length + 7) - index) / 6
        word.style.opacity = String(Math.min(1, Math.max(0.14, local)))
      })
    }
  })

  ghostTween = gsap.to(ghost.value, {
    yPercent: -22,
    ease: 'none',
    scrollTrigger: {
      trigger: section.value,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  })
})

onBeforeUnmount(() => {
  trigger?.kill()
  ghostTween?.scrollTrigger?.kill()
  ghostTween?.kill()
})
</script>

<template>
  <section
    id="manifesto"
    ref="section"
    class="manifesto theme-paper"
    data-section="02"
    data-label="Manifesto"
  >
    <div ref="ghost" class="manifesto__ghost serif-italic" aria-hidden="true">manifesto</div>

    <div class="shell">
      <div class="manifesto__grid">
        <aside class="manifesto__aside">
          <span class="eyebrow">02 / Manifesto · 自述</span>

          <div class="manifesto__aside-bottom">
            <span class="manifesto__seal" aria-hidden="true">✦</span>
            <p class="manifesto__aside-note mono">
              On systems, speed<br />
              and the space between.
            </p>
            <span class="manifesto__aside-cn">陆屿 / 2026</span>
          </div>
        </aside>

        <div class="manifesto__main">
          <h2 ref="textEl" class="manifesto__statement" :aria-label="statementText">
            <span
              v-for="(word, index) in statement"
              :key="index"
              class="manifesto__word"
              :class="{ 'is-accent': word.accent }"
              aria-hidden="true"
            >
              {{ word.text }}
            </span>
          </h2>

          <div class="manifesto__foot" v-reveal="{ delay: 80 }">
            <p class="manifesto__translation">
              A good website is not about adding everything. It is about
              finding the clearest path through complexity. I work between
              the interface, the API and the database — caring about one load,
              one edge case, and every place a user should never have to wait.
            </p>
            <div class="manifesto__signoff">
              <span class="mono">A note to self</span>
              <span class="manifesto__line"></span>
              <span class="mono">Hangzhou · 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.manifesto {
  position: relative;
  overflow: hidden;
  padding-block: clamp(100px, 14vw, 200px);
  background: var(--bg);
  color: var(--fg);
}

.manifesto__ghost {
  position: absolute;
  top: 6%;
  right: -2%;
  font-size: clamp(6rem, 19vw, 24rem);
  line-height: 0.8;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(17, 16, 14, 0.09);
  pointer-events: none;
}

.manifesto__grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(180px, 0.32fr) minmax(0, 1fr);
  gap: clamp(40px, 8vw, 140px);
  align-items: start;
}

.manifesto__aside {
  position: sticky;
  top: calc(var(--nav-h) + 36px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 300px;
  padding-top: 6px;
}

.manifesto__aside-bottom {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  padding-top: 36px;
  border-top: 1px solid var(--line);
}

.manifesto__seal {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--accent);
  font-size: 16px;
  transition: transform 0.8s var(--ease-out), background-color 0.5s ease;
}

.manifesto__aside:hover .manifesto__seal {
  background: var(--fg);
  color: var(--bg);
  transform: rotate(90deg);
}

.manifesto__aside-note {
  color: var(--fg-dim);
  font-size: 9px;
  line-height: 1.8;
  letter-spacing: 0.1em;
  text-transform: none;
}

.manifesto__aside-cn {
  color: var(--fg-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.manifesto__main {
  max-width: 1160px;
}

.manifesto__statement {
  font-family: var(--font-serif);
  font-size: clamp(2.3rem, 4.7vw, 5rem);
  font-weight: 400;
  line-height: 1.42;
  letter-spacing: -0.005em;
  text-wrap: pretty;
}

.manifesto__word {
  display: inline-block;
  margin-right: 0.16em;
  color: var(--fg);
  transition: color 0.3s ease;
}

.manifesto__word.is-accent {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.14em;
}

.manifesto__foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(24px, 6vw, 100px);
  align-items: end;
  max-width: 760px;
  margin-top: clamp(60px, 9vw, 120px);
  padding-top: 22px;
  border-top: 1px solid var(--line);
}

.manifesto__translation {
  max-width: 42ch;
  color: var(--fg-dim);
  font-family: var(--font-serif);
  font-size: 19px;
  font-style: italic;
  line-height: 1.5;
}

.manifesto__signoff {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--fg-faint);
  font-size: 8px;
  white-space: nowrap;
}

.manifesto__line {
  display: block;
  width: 28px;
  height: 1px;
  background: var(--line-strong);
}

@media (max-width: 900px) {
  .manifesto__grid {
    grid-template-columns: 1fr;
    gap: 52px;
  }

  .manifesto__aside {
    position: static;
    min-height: 0;
    gap: 28px;
  }

  .manifesto__aside-bottom {
    display: none;
  }

  .manifesto__statement {
    font-size: clamp(2.1rem, 6.4vw, 3.6rem);
    line-height: 1.5;
  }

  .manifesto__foot {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .manifesto__translation {
    font-size: 17px;
  }

  .manifesto__ghost {
    top: 2%;
    right: -8%;
    font-size: 34vw;
  }
}
</style>
