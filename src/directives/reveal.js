let observer = null

function getObserver() {
  if (observer) return observer

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      })
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -8% 0px'
    }
  )

  return observer
}

export const reveal = {
  mounted(el, binding) {
    el.classList.add('reveal')

    const value = binding.value
    if (typeof value === 'number') {
      el.style.setProperty('--reveal-delay', `${value}ms`)
    } else if (value && typeof value === 'object') {
      if (value.delay) el.style.setProperty('--reveal-delay', `${value.delay}ms`)
      if (value.y != null) el.style.setProperty('--reveal-y', `${value.y}px`)
    }

    if (binding.arg === 'mask') {
      el.classList.add('reveal--mask')
    }

    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      getObserver().observe(el)
    } else {
      el.classList.add('is-revealed')
    }
  },
  unmounted(el) {
    observer?.unobserve(el)
  }
}

export default reveal
