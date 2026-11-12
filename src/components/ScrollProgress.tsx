import { useEffect, useRef, useState } from 'react'
import { chapters } from '../data/chapters'
import { scrollToSection } from '../composables/useSmoothScroll'
import { useI18n } from '../store/i18n'
import '../styles/components/ScrollProgress.css'

type Section = { id: string; el: Element; index: string; label: string }

export default function ScrollProgress() {
  const { t } = useI18n()
  const fillRef = useRef<HTMLSpanElement>(null)

  const [sections, setSections] = useState<Section[]>([])
  const [activeKey, setActiveKey] = useState('01')
  const [hovered, setHovered] = useState<string | null>(null)

  const active = chapters.find((chapter) => chapter.index === activeKey) || chapters[0]
  const preview = hovered ? chapters.find((chapter) => chapter.index === hovered) || null : null
  const total = String(sections.length || chapters.length).padStart(2, '0')
  const atEnd = activeKey === String(sections.length || chapters.length).padStart(2, '0')

  useEffect(() => {
    let current: Section[] = []
    let ticking = false
    let frame = 0
    let currentKey = ''

    const collect = () => {
      current = Array.from(document.querySelectorAll<HTMLElement>('[data-section]')).map((el) => ({
        id: el.id,
        el,
        index: el.dataset.section || '',
        label: el.dataset.label || ''
      }))
      setSections(current)
    }

    /* 进度条直接写 DOM，滚动时只有「章节变化」才触发一次 React 更新，
       避免每帧 setState 把整条脊柱重渲染 */
    const update = () => {
      ticking = false
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, window.scrollY / max))

      if (fillRef.current) fillRef.current.style.transform = `scaleY(${progress})`

      if (!current.length) collect()

      const marker = window.scrollY + window.innerHeight * 0.42
      let key = current[0]?.index || '01'
      current.forEach((section) => {
        if ((section.el as HTMLElement).offsetTop <= marker) key = section.index
      })

      if (key !== currentKey) {
        currentKey = key
        setActiveKey(key)
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

  function jump(section: Section) {
    setHovered(null)
    scrollToSection(section.id)
  }

  return (
    <aside
      className={`scroll-rail${atEnd ? ' is-at-end' : ''}${preview ? ' is-previewing' : ''}`}
      aria-label={t('章节导航', 'Chapter navigation')}
      onPointerLeave={() => setHovered(null)}
    >
      <div className="scroll-rail__count">
        <span>{active.index}</span>
        <span className="scroll-rail__slash">/ {total}</span>
      </div>

      <div className="scroll-rail__track">
        <span ref={fillRef} className="scroll-rail__fill" />
        {sections.map((section, index) => (
          <button
            key={section.index}
            type="button"
            className={`scroll-rail__tick${section.index === activeKey ? ' is-active' : ''}${
              section.index === hovered ? ' is-hovered' : ''
            }`}
            style={
              {
                top: `${(index / Math.max(1, sections.length - 1)) * 100}%`
              } as React.CSSProperties
            }
            aria-label={t(`前往第 ${section.index} 章：${section.label}`, `Go to chapter ${section.index}: ${section.label}`)}
            aria-current={section.index === activeKey ? 'true' : undefined}
            data-cursor="Jump"
            onPointerEnter={() => setHovered(section.index)}
            onFocus={() => setHovered(section.index)}
            onBlur={() => setHovered(null)}
            onClick={() => jump(section)}
          >
            <span className="scroll-rail__tick-line" />
          </button>
        ))}
      </div>

      <span className="scroll-rail__label">{active.label}</span>
      <span className="scroll-rail__act mono" aria-hidden="true">
        {active.act} · {active.actName}
      </span>
      <span className="scroll-rail__caption serif-italic" aria-hidden="true">
        {active.captionCn}
      </span>

      {preview ? (
        <div className="scroll-rail__preview" aria-hidden="true">
          <span className="scroll-rail__preview-act mono">
            {preview.act} · {preview.actName} {preview.actCn}
          </span>
          <span className="scroll-rail__preview-label serif-italic">{preview.label}</span>
          <span className="scroll-rail__preview-en">{preview.caption}</span>
          <span className="scroll-rail__preview-cn">{preview.captionCn}</span>
        </div>
      ) : null}
    </aside>
  )
}
