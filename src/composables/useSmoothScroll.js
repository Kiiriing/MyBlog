import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '../lib/gsap'

let lenis = null
let ticker = null

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function initSmoothScroll() {
  if (typeof window === 'undefined' || lenis) return lenis

  const reduce = prefersReducedMotion()

  lenis = new Lenis({
    autoRaf: false,
    duration: 1.15,
    smoothWheel: !reduce,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
  })

  lenis.on('scroll', ScrollTrigger.update)

  ticker = (time) => handleTicker(time)
  gsap.ticker.add(ticker)
  gsap.ticker.lagSmoothing(0)

  requestAnimationFrame(() => ScrollTrigger.refresh())

  return lenis
}

function handleTicker(time) {
  if (lenis) lenis.raf(time * 1000)
}

export function getLenis() {
  return lenis
}

export function lockScroll() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.add('is-locked')
  lenis?.stop()
}

export function unlockScroll() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('is-locked')
  lenis?.start()
}

export function scrollTo(target, options = {}) {
  const config = {
    duration: 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    ...options
  }

  if (lenis) {
    lenis.scrollTo(target, config)
    return
  }

  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
    return
  }

  const el = typeof target === 'string' ? document.querySelector(target) : target
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  scrollTo(el, { offset: 0 })
}

export function destroySmoothScroll() {
  if (ticker) gsap.ticker.remove(ticker)
  lenis?.destroy()
  lenis = null
  ticker = null
}
