import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWork, works } from '../data/works'
import { postsByProject } from '../data/posts'
import ArtworkFrame from '../components/ArtworkFrame'
import SiteFooter from '../components/SiteFooter'
import ChapterTag from '../components/ChapterTag'
import ChapterNext from '../components/ChapterNext'
import Seo, { SITE_URL } from '../components/Seo'
import { useReveal } from '../hooks/useReveal'
import { useI18n } from '../store/i18n'
import '../styles/components/WorkView.css'

function RevealIntro({ delay, children }: { delay?: number; children: React.ReactNode }) {
  const ref = useReveal<HTMLParagraphElement>({ delay })
  return (
    <p ref={ref} className="work-intro">
      {children}
    </p>
  )
}

function RevealNote({
  delay,
  label,
  children
}: {
  delay?: number
  label: string
  children: React.ReactNode
}) {
  const ref = useReveal<HTMLElement>({ delay })
  return (
    <article ref={ref} className="work-note">
      <span className="mono work-note__label">{label}</span>
      <p>{children}</p>
    </article>
  )
}

function WorkGallery({
  items
}: {
  items: { src: string; caption: string; fit?: string; wide?: boolean }[]
}) {
  const [index, setIndex] = useState(0)
  const [armed, setArmed] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const count = items.length
  const current = items[Math.min(index, count - 1)]

  /* 截图体积远大于 SVG 素材：滚到画廊附近再挂载，首屏不为 8 张图买单 */
  useEffect(() => {
    const node = stage.current
    if (armed || !node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArmed(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px 0px' }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [armed])

  if (!count) return null

  const go = (step: number) => setIndex((value) => (value + step + count) % count)

  return (
    <div className="work-carousel" role="group" aria-roledescription="carousel" aria-label="项目截图">
      <div className={`work-carousel__stage${items.length === 1 && items[0].wide ? ' work-carousel__stage--wide' : ''}`} ref={stage}>
        {armed &&
          items.map((item, itemIndex) => (
            <div
              key={`${item.src}-${itemIndex}`}
              className={`work-carousel__slide${itemIndex === index ? ' is-active' : ''}`}
              aria-hidden={itemIndex !== index}
            >
              <ArtworkFrame
                src={item.src}
                alt={item.caption}
                ratio="16 / 10"
                parallax={item.fit === 'contain' ? 0 : 5}
                eager={itemIndex === 0}
                imageClass={`work-carousel__img${
                  item.fit === 'contain' ? ' work-carousel__img--contain' : ` work-carousel__img--${itemIndex}`
                }`}
              />
            </div>
          ))}

        <span className="work-carousel__counter mono">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>

        {count > 1 ? (
          <div className="work-carousel__nav">
            <button
              type="button"
              className="work-carousel__arrow"
              aria-label="上一张"
              onClick={() => go(-1)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.1" />
              </svg>
            </button>
            <button
              type="button"
              className="work-carousel__arrow"
              aria-label="下一张"
              onClick={() => go(1)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.1" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <div className="work-carousel__foot">
        <p className="work-carousel__caption mono" aria-live="polite">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span>{current.caption}</span>
        </p>

        {count > 1 ? (
          <div className="work-carousel__dots">
            {items.map((item, itemIndex) => (
              <button
                key={`${item.src}-dot-${itemIndex}`}
                type="button"
                className={`work-carousel__dot${itemIndex === index ? ' is-active' : ''}`}
                aria-label={`第 ${itemIndex + 1} 张：${item.caption}`}
                aria-current={itemIndex === index}
                onClick={() => setIndex(itemIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function WorkView() {
  const { slug = '' } = useParams()
  const work = getWork(slug)
  const nextWork = work ? getWork(work.next) : null
  const journalPosts = work ? postsByProject(work.slug) : []
  const total = String(works.length).padStart(2, '0')
  const { t } = useI18n()

  if (!work) {
    return (
      <div className="work-missing">
        <Seo
          title={t('未找到这个项目 — 陆屿 LU YU', 'Project not found — LU YU')}
          path={`/work/${slug}`}
          noindex
        />
        <div className="shell work-missing__inner">
          <span className="eyebrow">404 / Work</span>
          <h1 className="work-missing__title">
            This project
            <br />
            <em>is out of frame.</em>
          </h1>
          <p>{t('这个项目可能暂时不在展出中。', 'This project may not be on display right now.')}</p>
          <Link to="/work" className="work-missing__link" data-cursor="Index">
            {t('返回作品索引', 'Back to work index')} ↗
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div
      className="work-page"
      style={{ '--project-accent': work.accent } as React.CSSProperties}
    >
      <Seo
        title={t(`${work.title} ${work.cn} — 陆屿 LU YU`, `${work.title} — LU YU`)}
        path={`/work/${work.slug}`}
        description={work.summary}
        image={work.art}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: `${work.title} ${work.cn}`,
          description: work.summary,
          image: `${SITE_URL}${work.art}`,
          dateCreated: work.year,
          keywords: work.stack.join(', '),
          creator: { '@type': 'Person', name: '陆屿', alternateName: 'LU YU', url: SITE_URL },
          url: `${SITE_URL}/work/${work.slug}`
        }}
      />
      <header className="work-hero">
        <span className="work-hero__ghost" aria-hidden="true">
          {work.index}
        </span>

        <div className="shell work-hero__head">
          <div className="work-hero__top">
            <Link to="/work" className="work-hero__back mono" data-cursor="Index">
              <span aria-hidden="true">←</span>
              <span>{t('全部项目', 'All projects')}</span>
            </Link>
            <span className="mono work-hero__index">
              {work.index} / {total} — {work.year}
            </span>
          </div>

          <ChapterTag index="04" meta={`Project ${work.index}`} />

          <div className="work-hero__title-row">
            <h1 className="work-hero__title">
              <span>{work.title}</span>
              <em>{work.cn}</em>
            </h1>
            <div className="work-hero__aside">
              <p className="work-hero__tagline">{work.tagline}</p>
              <div className="work-hero__class mono">
                <span>{work.category}</span>
                <span>{work.client}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="work-content shell">
        <aside className="work-content__side">
          <span className="eyebrow">The build / {t('构建', 'Build')}</span>
          <dl className="work-content__details">
            {work.details.map((detail) => (
              <div key={detail.label}>
                <dt className="mono">{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>

          <div className="work-content__stack">
            <span className="mono work-content__label">Stack / {t('技术栈', 'Stack')}</span>
            <ul>
              {work.stack.map((tech) => (
                <li key={tech} className="mono">
                  {tech}
                </li>
              ))}
            </ul>
          </div>

          {work.links?.length ? (
            <div className="work-content__links">
              <span className="mono work-content__label">Links / {t('链接', 'Links')}</span>
              {work.links.map((link) =>
                link.href.startsWith('/') ? (
                  <Link key={link.label} to={link.href} className="work-content__link mono">
                    <span className="work-content__link-main">
                      <span>{link.label}</span>
                      <span className="work-content__link-hint">{link.hint}</span>
                    </span>
                    <span className="work-content__link-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="work-content__link mono"
                  >
                    <span className="work-content__link-main">
                      <span>{link.label}</span>
                      <span className="work-content__link-hint">{link.hint}</span>
                    </span>
                    <span className="work-content__link-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                )
              )}
            </div>
          ) : null}

          <div className="work-content__status mono">
            <span className="dot" />
            {work.status} — {work.year}
          </div>
        </aside>

        <div className="work-content__main">
          {work.intro.map((paragraph, index) => (
            <RevealIntro key={index} delay={index * 70}>
              {paragraph}
            </RevealIntro>
          ))}

          {work.projectUrl ? (
            <a
              className="work-repo"
              href={work.projectUrl}
              target="_blank"
              rel="noreferrer"
              data-cursor="GitHub"
            >
              <span className="work-repo__badge mono" aria-hidden="true">
                GH
              </span>
              <span className="work-repo__body">
                <span className="mono work-repo__eyebrow">
                  Repository / {t('代码仓库', 'Repository')}
                </span>
                <strong className="work-repo__name">{work.projectUrl.split('/').slice(-2).join(' / ')}</strong>
                <span className="work-repo__hint">
                  {t('查看完整源码与提交记录', 'Browse the full source and commit history')}
                </span>
              </span>
              <span className="work-repo__arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ) : null}

          <div className="work-notes">
            <div className="work-notes__head">
              <span className="eyebrow">Build notes / {t('实现', 'Build notes')}</span>
              <span className="mono">{t('三个决定', 'Three decisions')}</span>
            </div>
            <div className="work-notes__grid">
              {work.notes.map((note, index) => (
                <RevealNote key={note.label} delay={index * 80} label={note.label}>
                  {note.value}
                </RevealNote>
              ))}
            </div>
          </div>

          <div className="work-gallery">
            <WorkGallery items={work.gallery} />
          </div>
        </div>
      </section>

      {journalPosts.length ? (
        <section className="work-journal shell" aria-label={t('该项目手记', 'Project journal')}>
          <div className="work-journal__head">
            <div>
              <span className="eyebrow">Journal / {t('项目手记', 'Project journal')}</span>
              <p className="mono work-journal__note">{t('写于构建过程中', 'Written while building it')}</p>
            </div>
            <Link to={`/journal?project=${work.slug}`} className="work-journal__all mono">
              {t('全部', 'All')} {String(journalPosts.length).padStart(2, '0')} {t('篇', 'entries')}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="work-journal__grid">
            {journalPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/journal/${post.slug}`}
                className="work-journal__item"
                data-cursor="Read"
              >
                <span className="mono work-journal__meta">
                  {post.index} — {post.date}
                </span>
                <span className="work-journal__title">{post.title}</span>
                <span className="work-journal__en">{post.en}</span>
                <span className="mono work-journal__tags">
                  {post.tags.map((tag) => `#${tag}`).join('  ')}
                </span>
                <span className="work-journal__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {nextWork ? (
        <section className="work-next">
          <Link to={`/work/${nextWork.slug}`} className="work-next__link shell" data-cursor="Next">
            <div className="work-next__copy">
              <span className="eyebrow">{t('下一个项目', 'Next project')}</span>
              <h2 className="work-next__title">
                <span>{nextWork.title}</span>
                <em>{nextWork.cn}</em>
              </h2>
              <p className="work-next__summary">{nextWork.tagline}</p>
              <span className="work-next__more mono">
                {t('查看项目', 'View project')}
                <span aria-hidden="true">↗</span>
              </span>
            </div>

            <div className="work-next__visual">
              <ArtworkFrame src={nextWork.art} alt={`${nextWork.title} 项目预览`} ratio="4 / 5" parallax={4} eager />
            </div>
          </Link>
        </section>
      ) : null}

      <ChapterNext index="05" />

      <SiteFooter />
    </div>
  )
}
