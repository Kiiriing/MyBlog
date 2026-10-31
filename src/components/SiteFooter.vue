<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from '../lib/gsap'
import { scrollTo, prefersReducedMotion } from '../composables/useSmoothScroll'
import { useClock } from '../composables/useClock'
import { site } from '../data/site'
import CircleButton from './CircleButton.vue'

const clock = useClock()
const footer = ref(null)
const glow = ref(null)

const email = ref('')
const error = ref('')
const subscribed = ref(false)
let resetTimer = null

let glowX = null
let glowY = null

const status = computed(() => {
  if (error.value) return error.value
  if (subscribed.value) return '已收到 — 下一封构建手记正在写。'
  return '每月一至两封，关于构建与工程。'
})

function initGlow() {
  if (!footer.value || !glow.value) return
  if (prefersReducedMotion()) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  glowX = gsap.quickTo(glow.value, 'x', { duration: 0.9, ease: 'power3.out' })
  glowY = gsap.quickTo(glow.value, 'y', { duration: 0.9, ease: 'power3.out' })
}

function onPointerMove(event) {
  if (!glowX || !footer.value) return
  const rect = footer.value.getBoundingClientRect()
  glowX((event.clientX - rect.left - rect.width / 2) * 0.42)
  glowY((event.clientY - rect.top - rect.height / 2) * 0.42)
}

function onPointerLeave() {
  glowX?.(0)
  glowY?.(0)
}

function subscribe() {
  if (resetTimer) window.clearTimeout(resetTimer)

  const value = email.value.trim()
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)

  if (!valid) {
    subscribed.value = false
    error.value = '请留下一个有效的邮箱地址。'
    return
  }

  error.value = ''
  subscribed.value = true
  email.value = ''
  resetTimer = window.setTimeout(() => {
    subscribed.value = false
  }, 5600)
}

function backToTop() {
  scrollTo(0, { duration: 1.25 })
}

onMounted(initGlow)

onBeforeUnmount(() => {
  if (resetTimer) window.clearTimeout(resetTimer)
  gsap.killTweensOf(glow.value)
  glowX = null
  glowY = null
})
</script>

<template>
  <footer
    id="contact"
    ref="footer"
    class="site-footer"
    data-section="06"
    data-label="Contact"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div ref="glow" class="site-footer__glow" aria-hidden="true"></div>
    <div class="site-footer__grid-lines" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </div>

    <div class="shell site-footer__inner">
      <header class="site-footer__head">
        <span class="eyebrow">06 / Contact · 联系</span>
        <span class="site-footer__status mono">
          <span class="dot"></span>
          {{ site.availability }}
        </span>
      </header>

      <div class="site-footer__hero">
        <h2 class="site-footer__title">
          <span class="site-footer__line">Let’s make</span>
          <span class="site-footer__line site-footer__line--indent">
            <em>it work, beautifully.</em>
          </span>
        </h2>

        <div class="site-footer__hero-side">
          <p class="site-footer__cn">
            如果你有一个想认真做的产品，或者需要有人把前后端
            一起推进，欢迎写信给我。
          </p>
          <span class="site-footer__reply mono">Usually replies within 48 hours</span>
        </div>
      </div>

      <a
        class="site-footer__email"
        :href="`mailto:${site.email}`"
        data-cursor="Write"
      >
        <span class="site-footer__email-text">{{ site.email }}</span>
        <span class="site-footer__email-arrow" aria-hidden="true">↗</span>
      </a>

      <div class="site-footer__columns">
        <div class="site-footer__col site-footer__col--news">
          <span class="site-footer__label mono">Newsletter / 构建手记</span>
          <form class="site-footer__form" novalidate @submit.prevent="subscribe">
            <label class="sr-only" for="footer-email">邮箱地址</label>
            <div class="field site-footer__field">
              <input
                id="footer-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="your@email.com"
                :aria-invalid="!!error"
                aria-describedby="newsletter-status"
                @input="error = ''"
              />
              <button
                class="site-footer__submit"
                type="submit"
                aria-label="订阅来信"
                data-cursor="Send"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.1" />
                </svg>
              </button>
            </div>
            <p
              id="newsletter-status"
              class="site-footer__form-note mono"
              :class="{ 'is-error': error, 'is-ok': subscribed }"
              aria-live="polite"
            >
              {{ status }}
            </p>
          </form>
        </div>

        <div class="site-footer__col">
          <span class="site-footer__label mono">Elsewhere / 别处</span>
          <ul class="site-footer__socials">
            <li v-for="social in site.socials" :key="social.label">
              <a
                :href="social.href"
                class="site-footer__social"
                target="_blank"
                rel="noreferrer"
                :data-cursor="social.label"
              >
                <span>{{ social.label }}</span>
                <span class="site-footer__social-handle">{{ social.handle }}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
        </div>

        <div class="site-footer__col site-footer__col--clock">
          <span class="site-footer__label mono">Local time / 此刻</span>
          <p class="site-footer__clock">{{ clock }}</p>
          <div class="site-footer__place mono">
            <span>{{ site.location }}</span>
            <span>{{ site.coords }}</span>
          </div>
        </div>
      </div>

      <div class="site-footer__bottom">
        <p class="mono">© 2026 LU YU — All systems operational</p>
        <p class="mono site-footer__built">Designed &amp; coded with Vue, GSAP &amp; Vite</p>
        <CircleButton
          label="Back to top"
          direction="up"
          :size="52"
          cursor="Top"
          class="site-footer__top"
          @click="backToTop"
        />
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  --bg: #08080a;
  --bg-deep: #050506;
  --fg: #f2ede4;
  --fg-dim: #9b9487;
  --fg-faint: #615c54;
  --line: rgba(242, 237, 228, 0.14);
  --line-strong: rgba(242, 237, 228, 0.28);
  --card: #121214;
  --paper: #efe8db;
  --accent: #ff5a2f;
  --acid: #d8ff43;
  position: relative;
  overflow: hidden;
  padding-block: clamp(86px, 11vw, 168px) clamp(26px, 3vw, 40px);
  background: var(--bg-deep);
  color: var(--fg);
  isolation: isolate;
}

.site-footer__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: min(78vw, 1100px);
  height: min(78vw, 1100px);
  margin-top: calc(-0.5 * min(78vw, 1100px));
  margin-left: calc(-0.5 * min(78vw, 1100px));
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 90, 47, 0.22), transparent 42%),
    radial-gradient(circle at 60% 40%, rgba(122, 103, 255, 0.14), transparent 58%);
  filter: blur(50px);
  opacity: 0.75;
  pointer-events: none;
  will-change: transform;
}

.site-footer__grid-lines {
  position: absolute;
  inset: 0;
  z-index: -1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding-inline: var(--gutter);
  pointer-events: none;
}

.site-footer__grid-lines span {
  border-left: 1px solid rgba(242, 237, 228, 0.045);
}

.site-footer__grid-lines span:last-child {
  border-right: 1px solid rgba(242, 237, 228, 0.045);
}

.site-footer__inner {
  position: relative;
}

.site-footer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: clamp(32px, 5vw, 64px);
  border-bottom: 1px solid var(--line);
}

.site-footer__status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--fg-dim);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.site-footer__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(230px, 0.45fr);
  gap: clamp(28px, 5vw, 80px);
  align-items: end;
  padding-block: clamp(38px, 6vw, 82px) clamp(28px, 4vw, 52px);
}

.site-footer__title {
  display: flex;
  flex-direction: column;
  margin-left: -0.045em;
  font-family: var(--font-serif);
  font-size: clamp(3.4rem, 8.6vw, 9.2rem);
  font-weight: 400;
  line-height: 0.82;
  letter-spacing: -0.045em;
}

.site-footer__line {
  display: block;
}

.site-footer__line--indent {
  padding-left: clamp(26px, 7vw, 120px);
}

.site-footer__title em {
  color: var(--accent);
  font-style: italic;
}

.site-footer__hero-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: clamp(4px, 1vw, 14px);
}

.site-footer__cn {
  max-width: 32ch;
  color: var(--fg-dim);
  font-size: clamp(13px, 1.05vw, 15px);
  line-height: 1.9;
}

.site-footer__reply {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.site-footer__email {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(18px, 4vw, 60px);
  padding-block: clamp(20px, 2.6vw, 34px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  transition: color 0.4s ease;
}

.site-footer__email-text {
  font-family: var(--font-serif);
  font-size: clamp(1.7rem, 4.7vw, 5rem);
  font-style: italic;
  line-height: 1;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.site-footer__email-arrow {
  display: grid;
  flex: 0 0 auto;
  width: clamp(44px, 5vw, 66px);
  height: clamp(44px, 5vw, 66px);
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  font-size: clamp(18px, 1.5vw, 24px);
  transition:
    background-color 0.4s var(--ease-out),
    border-color 0.4s ease,
    color 0.4s ease,
    transform 0.55s var(--ease-out);
}

.site-footer__email:hover {
  color: var(--accent);
}

.site-footer__email:hover .site-footer__email-arrow {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff6ec;
  transform: rotate(45deg);
}

.site-footer__columns {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(190px, 0.55fr) minmax(170px, 0.5fr);
  gap: clamp(32px, 6vw, 100px);
  padding-block: clamp(42px, 6vw, 80px);
}

.site-footer__col {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.site-footer__label {
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.site-footer__field {
  border-bottom-color: var(--line-strong);
}

.site-footer__field input {
  padding-right: 44px;
  font-size: 14px;
}

.site-footer__field input::placeholder {
  color: var(--fg-faint);
}

.site-footer__submit {
  position: absolute;
  right: 0;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--fg);
  transition:
    color 0.3s ease,
    transform 0.45s var(--ease-out);
}

.site-footer__submit svg {
  width: 19px;
  height: 19px;
}

.site-footer__submit:hover {
  color: var(--accent);
  transform: translateX(3px);
}

.site-footer__form-note {
  margin-top: 10px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: none;
  transition: color 0.3s ease;
}

.site-footer__form-note.is-error {
  color: var(--accent);
}

.site-footer__form-note.is-ok {
  color: var(--acid);
}

.site-footer__socials {
  display: flex;
  flex-direction: column;
  gap: 11px;
  list-style: none;
}

.site-footer__social {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 18px;
  gap: 12px;
  align-items: center;
  color: var(--fg-dim);
  font-size: 11px;
  letter-spacing: 0.04em;
  transition: color 0.3s ease;
}

.site-footer__social-handle {
  color: var(--fg-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.site-footer__social span:last-child {
  font-size: 12px;
  opacity: 0.5;
  transition: transform 0.4s var(--ease-out);
}

.site-footer__social:hover {
  color: var(--fg);
}

.site-footer__social:hover span:last-child {
  transform: translate(2px, -2px);
}

.site-footer__col--clock {
  align-items: flex-start;
}

.site-footer__clock {
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: clamp(1.8rem, 2.8vw, 2.6rem);
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.site-footer__place {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--fg-faint);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.site-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: clamp(22px, 3vw, 34px);
  border-top: 1px solid var(--line);
  color: var(--fg-faint);
}

.site-footer__bottom .mono {
  font-size: 8px;
  letter-spacing: 0.1em;
}

.site-footer__top {
  flex: 0 0 auto;
}

@media (max-width: 1024px) {
  .site-footer__hero {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 26px;
  }

  .site-footer__hero-side {
    max-width: 42ch;
  }

  .site-footer__columns {
    grid-template-columns: minmax(0, 1fr) minmax(170px, 0.6fr);
    gap: 44px;
  }

  .site-footer__col--clock {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }

  .site-footer__col--clock .site-footer__label {
    display: none;
  }

  .site-footer__place {
    text-align: right;
  }
}

@media (max-width: 760px) {
  .site-footer {
    padding-block: 76px 26px;
  }

  .site-footer__status {
    display: none;
  }

  .site-footer__title {
    font-size: clamp(3rem, 13.5vw, 5rem);
  }

  .site-footer__line--indent {
    padding-left: 20px;
  }

  .site-footer__email {
    align-items: flex-end;
  }

  .site-footer__email-text {
    font-size: clamp(1.55rem, 7.2vw, 2.6rem);
  }

  .site-footer__columns {
    grid-template-columns: 1fr;
    gap: 38px;
  }

  .site-footer__col--clock {
    flex-direction: column;
    align-items: flex-start;
  }

  .site-footer__place {
    text-align: left;
  }

  .site-footer__bottom {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 14px;
  }

  .site-footer__built {
    order: 3;
    width: 100%;
  }

  .site-footer__top {
    margin-left: auto;
  }
}
</style>
