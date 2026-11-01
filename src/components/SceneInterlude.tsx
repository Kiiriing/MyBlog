import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { useReveal } from '../hooks/useReveal'
import type { Interlude } from '../data/chapters'
import '../styles/components/SceneInterlude.css'

/* 幕间章节页：两段正文之间的一整页「翻页」。
   巨大的描边斜体字随滚动横向漂移，横线随滚动拉开，幕次与编号把故事串起来。
   背景是奶油纸面，正好夹在暗场之间，让整页有明暗交替的呼吸。 */
export default function SceneInterlude({
  act,
  actName,
  actCn,
  roman,
  word,
  cn,
  en,
  meta
}: Interlude) {
  const section = useRef<HTMLElement>(null)
  const wordEl = useRef<HTMLSpanElement>(null)
  const markEl = useRef<HTMLSpanElement>(null)
  const ruleEl = useRef<HTMLSpanElement>(null)

  const headReveal = useReveal<HTMLElement>()
  const copyReveal = useReveal<HTMLDivElement>({ delay: 90 })
  const footReveal = useReveal<HTMLDivElement>({ delay: 140 })

  useEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      /* 大字与滚动方向相反地漂移：像镜头掠过标题，而不是文字固定在纸上 */
      gsap.fromTo(
        wordEl.current,
        { xPercent: -7 },
        {
          xPercent: 7,
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      )

      /* 罗马数字反向更慢，形成第二层视差 */
      gsap.fromTo(
        markEl.current,
        { yPercent: 12 },
        {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      )

      /* 信号线：进入视口时从左拉开，成为这一页的「转场」 */
      gsap.fromTo(
        ruleEl.current,
        { scaleX: 0.08 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top 86%',
            end: 'bottom 40%',
            scrub: 0.6
          }
        }
      )
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={section} className="interlude theme-paper" aria-label={`${act} — ${cn}`}>
      <div className="interlude__grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="interlude__word serif-italic" aria-hidden="true">
        <span ref={wordEl}>{word}</span>
      </div>

      <span ref={markEl} className="interlude__roman serif-italic" aria-hidden="true">
        {roman}
      </span>

      <div className="shell interlude__inner">
        <header ref={headReveal} className="interlude__head">
          <span className="eyebrow">Interlude / 幕间</span>
          <span className="mono interlude__act">
            {act} · {actName}
            <i>{actCn}</i>
          </span>
        </header>

        <div ref={copyReveal} className="interlude__copy">
          <p className="interlude__cn serif">{cn}</p>
          <p className="interlude__en serif-italic">{en}</p>
        </div>

        <div ref={footReveal} className="interlude__foot">
          <span className="mono interlude__meta">{meta}</span>

          <span className="interlude__rule" aria-hidden="true">
            <span ref={ruleEl} />
            <i />
          </span>

          <span className="mono interlude__next">
            Continue
            <span aria-hidden="true"> ↓</span>
          </span>
        </div>
      </div>
    </section>
  )
}
