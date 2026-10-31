import { useEffect, useState } from 'react'
import '../styles/components/ScrollProgress.css'

type Section = { el: Element; label: string; index: string }

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [activeLabel, setActiveLabel] = useState('Index')
  const [activeIndex, setActiveIndex] = useState('01')
  const [total, setTotal] = useState(6)
  const [sections, setSections] = useState<Section[]>([])

  useEffect(() => {
    let current: Section[] = []
    let ticking = false
    let frame = 0

    const collect = () => {
      current = Array.from(document.querySelectorAll('[data-section]')).map((el) => ({
        el,
        label: (el as HTMLElement).dataset.label || '',
        index: (el as HTMLElement).dataset.section || ''
      }))
      if (current.length) {
        setTotal(current.length)
        setActiveIndex(current[0].index || '01')
        setActiveLabel(current[0].label || 'Index')
      }
      setSections(current)
    }

    const update = () => {
      ticking = false
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      setProgress(Math.min(1, Math.max(0, window.scrollY / max)))

      if (!current.length) collect()

      const marker = window.scrollY + window.innerHeight * 0.42
      let active = current[0]
      current.forEach((section) => {
        if ((section.el as HTMLElement).offsetTop <= marker) active = section
      })
      if (active) {
        setActiveLabel(active.label)
        setActiveIndex(active.index)
      }
    }

    const requestUpdate = () => {
      if (ticking) return
      ticking = true
      frame = requestAnimationFrame(update)
    }

    const onResize = () => {
      collect()
      requestUpdate()
    }

    collect()
    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const atEnd = activeIndex === String(total).padStart(2, '0')

  return (
    <aside className={`scroll-rail${atEnd ? ' is-at-end' : ''}`} aria-hidden="true">
      <div className="scroll-rail__count">
        <span>{activeIndex}</span>
        <span className="scroll-rail__slash">/ {String(total).padStart(2, '0')}</span>
      </div>
      <div className="scroll-rail__track">
        <span className="scroll-rail__fill" style={{ transform: `scaleY(${progress})` }} />
      </div>
      <div className="scroll-rail__label">{activeLabel}</div>
    </aside>
  )
}
