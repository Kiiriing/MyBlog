import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import { experience } from '../data/profile'
import { site } from '../data/site'
import Magnetic from './Magnetic'
import { useReveal } from '../hooks/useReveal'
import { useI18n } from '../store/i18n'
import '../styles/components/ExperienceSection.css'

const total = String(experience.length).padStart(2, '0')

export default function ExperienceSection() {
  const { t } = useI18n()
  const section = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const indexEl = useRef<HTMLSpanElement>(null)
  const fillEl = useRef<HTMLSpanElement>(null)

  const headReveal = useReveal<HTMLElement>()
  const titleReveal = useReveal<HTMLHeadingElement>()
  const ledeReveal = useReveal<HTMLParagraphElement>({ delay: 80 })
  const outroReveal = useReveal<HTMLDivElement>({ delay: 60 })

  useEffect(() => {
    const root = section.current
    const track = list.current
    if (!root || !track) return

    const items = Array.from(track.querySelectorAll<HTMLElement>('.experience__item'))
    if (!items.length) return

    items[0].classList.add('is-active')

    if (prefersReducedMotion()) {
      items.forEach((item) => item.classList.add('is-active'))
      if (indexEl.current) indexEl.current.textContent = total
      return
    }

    /* 逐条监听：当前经历进入视口中段时点亮，左侧索引同步更新 */
    const triggers = items.map((item, index) =>
      ScrollTrigger.create({
        trigger: item,
        start: 'top 58%',
        end: 'bottom 52%',
        onToggle: (self) => {
          if (!self.isActive) return
          items.forEach((el) => el.classList.toggle('is-active', el === item))
          if (indexEl.current) indexEl.current.textContent = experience[index].index
        }
      })
    )

    /* 左侧竖向进度线跟随整段经历滚动 */
    const fillTween = gsap.fromTo(
      fillEl.current,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: 'top 58%',
          end: 'bottom 52%',
          scrub: true
        }
      }
    )

    const ghostTween = gsap.to(ghost.current, {
      yPercent: -16,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    })

    return () => {
      triggers.forEach((trigger) => trigger.kill())
      fillTween.scrollTrigger?.kill()
      fillTween.kill()
      ghostTween.scrollTrigger?.kill()
      ghostTween.kill()
    }
  }, [])

  return (
    <section
      id="experience"
      ref={section}
      className="experience theme-paper"
      data-section="05"
      data-label="Experience"
    >
      <div className="experience__grid" aria-hidden="true" />
      <div ref={ghost} className="experience__ghost serif-italic" aria-hidden="true">
        roles
      </div>

      <div className="shell experience__inner">
        <header ref={headReveal} className="experience__head">
          <span className="eyebrow">05 / Experience · {t('经历', 'Experience')}</span>
          <div className="experience__head-meta mono">
            <span>2024 — now</span>
            <span>{total} chapters</span>
          </div>
        </header>

        <div className="experience__stage">
          <aside className="experience__rail">
            <div className="experience__counter">
              <span ref={indexEl}>{experience[0].index}</span>
              <span className="experience__counter-total">/ {total}</span>
            </div>

            <div className="experience__progress" aria-hidden="true">
              <span ref={fillEl} />
            </div>

            <p className="experience__rail-note mono">
              Roles, systems
              <br />
              &amp; the people around them.
            </p>

            <span className="experience__rail-mark" aria-hidden="true">
              ✦
            </span>
          </aside>

          <div className="experience__main">
            <h2 ref={titleReveal} className="experience__title">
              <span>Where I’ve</span>
              <em>shipped.</em>
            </h2>

            <p ref={ledeReveal} className="experience__lede">
              {t(
                '从校内工作室的接口，到合作企业管理系统的架构与排期。三段经历，一条从「把功能写完」 到「让团队与产品都能跑起来」的路径。',
                'From APIs at a campus studio to the architecture and scheduling of a partner enterprise system. Three chapters along one path — from finishing features to making both the team and the product run.'
              )}
            </p>

            <div ref={list} className="experience__list">
              {experience.map((item) => (
                <article key={item.index} className="experience__item">
                  <span className="experience__item-no serif-italic" aria-hidden="true">
                    {item.index}
                  </span>

                  <div className="experience__item-top">
                    <span className="experience__period mono">{item.period}</span>
                    <span className="experience__org mono">{item.org}</span>
                    {item.highlight ? (
                      <span className="experience__badge mono">
                        <span className="dot" />
                        {t('当前', 'Current')}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="experience__role">{item.role}</h3>
                  <p className="experience__cn">{item.cn}</p>
                  <p className="experience__summary">{item.summary}</p>

                  <ul className="experience__bullets">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>

                  <div className="experience__foot">
                    <div className="experience__stack">
                      {item.stack.map((tech) => (
                        <span key={tech} className="mono">
                          {tech}
                        </span>
                      ))}
                    </div>
                    <span className="experience__year mono">{item.year}</span>
                  </div>
                </article>
              ))}

              <div ref={outroReveal} className="experience__outro">
                <div className="experience__outro-copy">
                  <span className="mono">Full CV / references</span>
                  <p>
                    {t(
                      '想看更完整的项目清单、接口文档或竞赛证书，写信给我。通常 48 小时内回复，也乐于聊聊正在做的系统。',
                      'For a fuller project list, API documentation or competition certificates, write to me. I usually reply within 48 hours and am always happy to talk about systems in progress.'
                    )}
                  </p>
                </div>

                <Magnetic strength={0.28}>
                  <a
                    href={`mailto:${site.email}?subject=Full%20CV%20request`}
                    className="experience__cta"
                    data-cursor="Write"
                  >
                    <span>{t('索取完整简历', 'Ask for the full CV')}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </Magnetic>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
