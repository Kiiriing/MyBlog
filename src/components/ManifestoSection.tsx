import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { useReveal } from '../hooks/useReveal'
import { useI18n } from '../store/i18n'
import '../styles/components/ManifestoSection.css'

const statementZh = [
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

const statementEn = [
  { text: 'I believe' },
  { text: 'a good website is not about' },
  { text: 'adding everything,' },
  { text: 'but about' },
  { text: 'finding the clearest' },
  { text: 'path' },
  { text: 'through complexity.', accent: true },
  { text: 'I work between' },
  { text: 'the interface, the API' },
  { text: 'and the database —' },
  { text: 'caring about one load,' },
  { text: 'one edge case,' },
  { text: 'and every place' },
  { text: 'a user should never have to wait.' },
  { text: 'Those details make complex systems' },
  { text: 'feel simple and trustworthy again.', accent: true }
]

export default function ManifestoSection() {
  const { t, isZh } = useI18n()
  const statement = isZh ? statementZh : statementEn
  const statementText = statement.map((word) => word.text).join(' ')
  const textEl = useRef<HTMLHeadingElement>(null)
  const section = useRef<HTMLElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const footRef = useReveal<HTMLDivElement>({ delay: 80 })

  useEffect(() => {
    const words = Array.from(textEl.current?.querySelectorAll<HTMLElement>('.manifesto__word') || [])
    if (!words.length) return

    if (prefersReducedMotion()) {
      words.forEach((word) => {
        word.style.opacity = '1'
      })
      return
    }

    words.forEach((word) => {
      word.style.opacity = '0.14'
    })

    const trigger = ScrollTrigger.create({
      trigger: textEl.current,
      start: 'top 82%',
      end: 'bottom 42%',
      scrub: true,
      onUpdate: (self: ScrollTrigger) => {
        const progress = self.progress
        words.forEach((word, index) => {
          const local = (progress * (words.length + 7) - index) / 6
          word.style.opacity = String(Math.min(1, Math.max(0.14, local)))
        })
      }
    })

    const ghostTween = gsap.to(ghost.current, {
      yPercent: -22,
      ease: 'none',
      scrollTrigger: {
        trigger: section.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    })

    return () => {
      trigger.kill()
      ghostTween.scrollTrigger?.kill()
      ghostTween.kill()
    }
  }, [isZh])

  return (
    <section
      id="manifesto"
      ref={section}
      className="manifesto theme-paper"
      data-section="02"
      data-label="Manifesto"
    >
      <div ref={ghost} className="manifesto__ghost serif-italic" aria-hidden="true">
        manifesto
      </div>

      <div className="shell">
        <div className="manifesto__grid">
          <aside className="manifesto__aside">
            <span className="eyebrow">02 / Manifesto · {t('自述', 'Manifesto')}</span>

            <div className="manifesto__aside-bottom">
              <span className="manifesto__seal" aria-hidden="true">
                ✦
              </span>
              <p className="manifesto__aside-note mono">
                On systems, speed
                <br />
                and the space between.
              </p>
              <span className="manifesto__aside-cn">{t('我 / 2026', 'Me / 2026')}</span>
            </div>
          </aside>

          <div className="manifesto__main">
            <h2 ref={textEl} className="manifesto__statement" aria-label={statementText}>
              {statement.map((word, index) => (
                <span
                  key={index}
                  className={`manifesto__word${word.accent ? ' is-accent' : ''}`}
                  aria-hidden="true"
                >
                  {word.text}
                </span>
              ))}
            </h2>

            <div ref={footRef} className="manifesto__foot">
              {isZh ? (
                <p className="manifesto__translation">
                  A good website is not about adding everything. It is about finding the clearest
                  path through complexity. I work between the interface, the API and the database —
                  caring about one load, one edge case, and every place a user should never have to
                  wait.
                </p>
              ) : null}
              <div className="manifesto__signoff">
                <span className="mono">{t('写给自己的注记', 'A note to self')}</span>
                <span className="manifesto__line" />
                <span className="mono">Beijing · 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
