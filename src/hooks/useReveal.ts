import { useEffect, useRef } from 'react'

type RevealOptions = number | { delay?: number; y?: number } | undefined

let observer: IntersectionObserver | null = null

function getObserver() {
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        observer?.unobserve(entry.target)
      })
    },
    { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
  )
  return observer
}

/** React 版 v-reveal：进入视口后加 .is-revealed，样式由全局 .reveal 提供 */
export function useReveal<T extends HTMLElement = HTMLElement>(value?: RevealOptions, mask = false) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.classList.add('reveal')
    if (typeof value === 'number') {
      el.style.setProperty('--reveal-delay', `${value}ms`)
    } else if (value) {
      if (value.delay) el.style.setProperty('--reveal-delay', `${value.delay}ms`)
      if (value.y != null) el.style.setProperty('--reveal-y', `${value.y}px`)
    }
    if (mask) el.classList.add('reveal--mask')

    if ('IntersectionObserver' in window) {
      const current = getObserver()
      current.observe(el)
      return () => current.unobserve(el)
    }
    el.classList.add('is-revealed')
  }, [value, mask])

  return ref
}
