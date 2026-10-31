<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion, scrollToSection } from '../composables/useSmoothScroll'
import { site } from '../data/site'
import ArtworkFrame from './ArtworkFrame.vue'

const visual = ref(null)
const glow = ref(null)
const statsEl = ref(null)

const capabilities = [
  { no: '01', en: 'Full-stack Engineering', cn: '全栈开发' },
  { no: '02', en: 'Front-end Architecture', cn: '前端架构' },
  { no: '03', en: 'API & Data', cn: '接口与数据' },
  { no: '04', en: 'Performance', cn: '性能优化' },
  { no: '05', en: 'Interaction & Motion', cn: '交互与动效' }
]

const stats = [
  { value: 8, label: 'Years building', suffix: '' },
  { value: 46, label: 'Products shipped', suffix: '' },
  { value: 99, label: 'Lighthouse median', suffix: '' }
]

let rotateX
let rotateY
let glowX
let glowY
let statTrigger
let statTweens = []

function initTilt() {
  if (window.matchMedia('(hover: none)').matches) return
  const tilt = visual.value.querySelector('.about__tilt')
  if (!tilt) return

  rotateX = gsap.quickTo(tilt, 'rotationX', { duration: 0.6, ease: 'power3.out' })
  rotateY = gsap.quickTo(tilt, 'rotationY', { duration: 0.6, ease: 'power3.out' })
  glowX = gsap.quickTo(glow.value, 'x', { duration: 0.7, ease: 'power3.out' })
  glowY = gsap.quickTo(glow.value, 'y', { duration: 0.7, ease: 'power3.out' })
}

function onVisualMove(event) {
  if (!rotateX) return
  const el = visual.value
  const rect = el.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width - 0.5
  const y = (event.clientY - rect.top) / rect.height - 0.5

  rotateY(x * 7)
  rotateX(y * -6)
  glowX(x * rect.width * 0.55)
  glowY(y * rect.height * 0.55)
}

function onVisualLeave() {
  if (!rotateX) return
  rotateX(0)
  rotateY(0)
  glowX(0)
  glowY(0)
}

onMounted(() => {
  initTilt()

  if (prefersReducedMotion()) return

  const numbers = Array.from(statsEl.value?.querySelectorAll('[data-stat]') || [])

  statTrigger = ScrollTrigger.create({
    trigger: statsEl.value,
    start: 'top 86%',
    once: true,
    onEnter: () => {
      stats.forEach((stat, index) => {
        const el = numbers[index]
        if (!el) return
        const counter = { value: 0 }
        const tween = gsap.to(counter, {
          value: stat.value,
          duration: 1.7,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(counter.value)).padStart(2, '0')
          }
        })
        statTweens.push(tween)
      })
    }
  })
})

onBeforeUnmount(() => {
  statTrigger?.kill()
  statTweens.forEach((tween) => tween.kill())
})
</script>

<template>
  <section id="about" class="about" data-section="03" data-label="About">
    <div class="about__ambient" aria-hidden="true"></div>

    <div class="shell">
      <div class="about__head">
        <span class="eyebrow">03 / About · 关于</span>
        <div class="about__head-note mono">
          <span>Beijing, CN</span>
          <span>Working everywhere</span>
        </div>
      </div>

      <div class="about__grid">
        <div class="about__visual-col">
          <div
            ref="visual"
            class="about__visual"
            @pointermove="onVisualMove"
            @pointerleave="onVisualLeave"
          >
            <div ref="glow" class="about__glow" aria-hidden="true"></div>
            <div class="about__tilt">
              <ArtworkFrame
                src="/art/portrait.svg"
                alt="陆屿的抽象自画像，焦糖色的人像轮廓与橘色光晕"
                ratio="4 / 5"
                :parallax="5"
              >
                <span class="about__caption mono">Fig. 01 — At the desk, 2026</span>
              </ArtworkFrame>
            </div>

            <button
              class="about__badge"
              type="button"
              aria-label="联系陆屿"
              data-cursor="Hello"
              @click="scrollToSection('contact')"
            >
              <svg viewBox="0 0 140 140" aria-hidden="true">
                <defs>
                  <path
                    id="about-circle"
                    d="M70,70 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0"
                  />
                </defs>
                <text>
                  <textPath href="#about-circle">
                    OPEN FOR FULL-STACK WORK · 2026 · OPEN FOR FULL-STACK WORK ·
                  </textPath>
                </text>
              </svg>
              <span class="about__badge-star">✦</span>
            </button>
          </div>

          <div class="about__visual-meta mono">
            <span>Interface / systems / speed</span>
            <span>01 — 01</span>
          </div>
        </div>

        <div class="about__content">
          <h2 class="about__title">
            <span class="about__title-line" v-reveal>from interface</span>
            <span class="about__title-line about__title-line--italic" v-reveal="{ delay: 90 }">
              to infrastructure.
            </span>
          </h2>

          <p class="about__cn" v-reveal="{ delay: 160 }">从界面，到基础设施。</p>

          <div class="about__copy">
            <p v-reveal>
              我是全栈网页开发者，2020 年开始写前端，后来把后端、数据库
              与部署也一并揽下；现在在北京，独立完成从原型到上线的完整产品。
            </p>
            <p v-reveal="{ delay: 70 }">
              关注前端架构、接口设计与性能。喜欢把复杂度留在系统里，
              把简单留给用户：让首屏更轻，让边界条件有答案，
              让每一次点击都有明确的下一步。
            </p>
          </div>

          <div class="about__capabilities" v-reveal>
            <div class="about__cap-header mono">
              <span>Capabilities</span>
              <span>05</span>
            </div>
            <ul>
              <li v-for="cap in capabilities" :key="cap.no" class="about__cap">
                <span class="about__cap-no">{{ cap.no }}</span>
                <span class="about__cap-en">{{ cap.en }}</span>
                <span class="about__cap-cn">{{ cap.cn }}</span>
                <span class="about__cap-plus" aria-hidden="true">+</span>
              </li>
            </ul>
          </div>

          <div ref="statsEl" class="about__stats" v-reveal>
            <div v-for="stat in stats" :key="stat.label" class="about__stat">
              <strong data-stat>{{ String(stat.value).padStart(2, '0') }}</strong>
              <span class="mono">{{ stat.label }}</span>
            </div>
          </div>

          <div class="about__availability" v-reveal>
            <span class="dot"></span>
            <p>Currently taking on full-stack projects and engineering roles for late 2026.</p>
            <a :href="`mailto:${site.email}`" class="about__mail link-underline" data-cursor="Write">
              Start a conversation ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about {
  position: relative;
  overflow: hidden;
  padding-block: clamp(100px, 13vw, 190px);
  background: var(--bg-deep);
  color: var(--fg);
}

.about__ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 35% 40% at 18% 30%, rgba(255, 90, 47, 0.11), transparent 70%),
    radial-gradient(ellipse 34% 36% at 90% 72%, rgba(122, 103, 255, 0.09), transparent 70%);
}

.about__head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: clamp(44px, 6vw, 84px);
}

.about__head-note {
  display: flex;
  gap: clamp(20px, 3vw, 48px);
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.about__grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(300px, 0.88fr) minmax(0, 1.12fr);
  gap: clamp(50px, 8vw, 150px);
  align-items: start;
}

.about__visual-col {
  position: sticky;
  top: calc(var(--nav-h) + 42px);
}

.about__visual {
  position: relative;
  max-width: 540px;
  perspective: 1200px;
  isolation: isolate;
}

.about__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: 75%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(255, 90, 47, 0.24);
  filter: blur(80px);
  translate: -50% -50%;
  pointer-events: none;
}

.about__tilt {
  position: relative;
  z-index: 1;
  transform-style: preserve-3d;
  will-change: transform;
}

.about__visual :deep(.artwork) {
  box-shadow: 0 44px 110px rgba(0, 0, 0, 0.42);
}

.about__caption {
  position: absolute;
  right: 16px;
  bottom: 15px;
  z-index: 3;
  color: rgba(242, 237, 228, 0.7);
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: none;
}

.about__badge {
  position: absolute;
  right: -34px;
  bottom: -38px;
  z-index: 4;
  display: grid;
  width: clamp(96px, 10vw, 126px);
  height: clamp(96px, 10vw, 126px);
  place-items: center;
  border-radius: 50%;
  background: var(--paper);
  color: var(--ink);
  transition:
    background-color 0.5s ease,
    transform 0.7s var(--ease-out);
}

.about__badge:hover {
  background: var(--acid);
  transform: scale(1.06);
}

.about__badge svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: badge-spin 24s linear infinite;
}

.about__badge:hover svg {
  animation-duration: 10s;
}

.about__badge svg text {
  fill: currentColor;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.3em;
}

.about__badge-star {
  font-size: 22px;
}

@keyframes badge-spin {
  to {
    transform: rotate(360deg);
  }
}

.about__visual-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 22px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.about__content {
  padding-top: clamp(8px, 3vw, 54px);
}

.about__title {
  display: flex;
  flex-direction: column;
  font-family: var(--font-serif);
  font-size: clamp(3rem, 5.8vw, 6.4rem);
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: -0.04em;
}

.about__title-line {
  display: block;
}

.about__title-line--italic {
  padding-left: clamp(0px, 3vw, 52px);
  font-style: italic;
  color: var(--paper);
}

.about__cn {
  margin-top: clamp(22px, 3vw, 36px);
  color: var(--fg-dim);
  font-family: var(--font-serif);
  font-size: clamp(14px, 1.2vw, 17px);
  letter-spacing: 0.18em;
}

.about__copy {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 50ch;
  margin-top: clamp(30px, 4vw, 48px);
  color: var(--fg-dim);
  font-size: 14px;
  line-height: 1.9;
}

.about__capabilities {
  margin-top: clamp(42px, 5vw, 64px);
}

.about__cap-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.16em;
}

.about__cap {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto 30px;
  gap: 12px;
  align-items: baseline;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  color: var(--fg-dim);
  transition:
    color 0.35s ease,
    padding-left 0.5s var(--ease-out);
}

.about__cap:last-child {
  border-bottom: 1px solid var(--line);
}

.about__cap:hover {
  padding-left: 10px;
  color: var(--fg);
}

.about__cap-no {
  font-family: var(--font-mono);
  font-size: 9px;
  opacity: 0.5;
}

.about__cap-en {
  font-family: var(--font-serif);
  font-size: clamp(1.2rem, 1.65vw, 1.65rem);
  font-style: italic;
  letter-spacing: 0;
  transition: color 0.35s ease;
}

.about__cap:hover .about__cap-en {
  color: var(--accent);
}

.about__cap-cn {
  font-size: 10px;
  letter-spacing: 0.12em;
  opacity: 0.55;
}

.about__cap-plus {
  font-family: var(--font-mono);
  font-size: 13px;
  text-align: right;
  opacity: 0;
  transform: rotate(90deg) scale(0.6);
  transition:
    opacity 0.3s ease,
    transform 0.45s var(--ease-out);
}

.about__cap:hover .about__cap-plus {
  opacity: 0.7;
  transform: rotate(0deg) scale(1);
}

.about__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: clamp(44px, 5vw, 68px);
  padding-top: 22px;
  border-top: 1px solid var(--line);
}

.about__stat strong {
  display: block;
  font-family: var(--font-serif);
  font-size: clamp(2.4rem, 3.8vw, 4.2rem);
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.about__stat span {
  display: block;
  margin-top: 10px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.about__availability {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: clamp(36px, 4vw, 52px);
  padding-top: 18px;
  border-top: 1px solid var(--line);
  color: var(--fg-dim);
  font-size: 11px;
}

.about__availability .dot {
  background: var(--acid);
}

.about__availability p {
  flex: 1;
  min-width: 200px;
}

.about__mail {
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .about__grid {
    grid-template-columns: 1fr;
    gap: 64px;
  }

  .about__visual-col {
    position: static;
    max-width: 560px;
  }

  .about__badge {
    right: 12px;
    bottom: -30px;
  }

  .about__content {
    padding-top: 0;
  }
}

@media (max-width: 760px) {
  .about__head-note {
    display: none;
  }

  .about__visual-col {
    max-width: none;
  }

  .about__badge {
    width: 94px;
    height: 94px;
    right: 10px;
    bottom: -26px;
  }

  .about__title {
    font-size: clamp(2.8rem, 12vw, 4.6rem);
  }

  .about__copy {
    font-size: 13px;
  }

  .about__cap {
    grid-template-columns: 28px minmax(0, 1fr) auto;
  }

  .about__cap-plus {
    display: none;
  }

  .about__cap-cn {
    display: none;
  }

  .about__stats {
    gap: 12px;
  }

  .about__stat strong {
    font-size: clamp(2rem, 9vw, 3rem);
  }

  .about__stat span {
    font-size: 7px;
    line-height: 1.5;
  }
}
</style>
