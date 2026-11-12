import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdjacentPost, getPost, getRelatedPosts, posts, projectOf } from '../data/posts'
import { lockScroll, scrollTo, unlockScroll } from '../composables/useSmoothScroll'
import ArtworkFrame from '../components/ArtworkFrame'
import SiteFooter from '../components/SiteFooter'
import EngagementBar from '../components/EngagementBar'
import CommentSection from '../components/CommentSection'
import Seo, { SITE_URL } from '../components/Seo'
import { useI18n } from '../store/i18n'
import '../styles/components/PostView.css'

function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => legacyCopy(text)
      )
    }
  } catch {
    /* 某些浏览器在非安全上下文会同步抛错，走下面的回退 */
  }
  return Promise.resolve(legacyCopy(text))
}

function legacyCopy(text: string) {
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  const { t } = useI18n()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function copy() {
    /* 先给反馈，再异步写剪贴板：部分浏览器会在授权未决时挂起 Promise */
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
    void copyText(code).catch(() => {})
  }

  return (
    <div className="post-code">
      <div className="post-code__bar">
        <span className="post-code__lang mono">
          {language ? `${language} / snippet` : t('代码片段', 'Code')}
        </span>
        <button
          type="button"
          className={`post-code__copy mono${copied ? ' is-copied' : ''}`}
          onClick={copy}
          aria-label={copied ? t('已复制代码', 'Code copied') : t('复制代码', 'Copy code')}
        >
          {copied ? t('已复制 ✓', 'Copied ✓') : t('复制', 'Copy')}
        </button>
      </div>
      <pre className="post-body__code">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function PostView() {
  const { slug = '' } = useParams()
  const post = getPost(slug)
  const adjacent = getAdjacentPost(slug)
  const related = getRelatedPosts(slug, 2)
  const project = post ? projectOf(post) : undefined
  const total = String(posts.length).padStart(2, '0')

  const article = useRef<HTMLElement>(null)
  const progressEl = useRef<HTMLSpanElement>(null)
  const [activeHeading, setActiveHeading] = useState('')
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null)
  const { t } = useI18n()

  const titleParts = String(post?.title || '')
    .split(/(?<=[：:、，,。—])/)
    .filter(Boolean)

  const blocks = (post?.blocks ?? []) as any[]
  const headingIds = new Map<number, string>()
  let headingNo = 0
  blocks.forEach((block, index) => {
    if (block.type === 'h2') {
      headingNo += 1
      headingIds.set(index, `section-${headingNo}`)
    }
  })
  const headings = [...headingIds.entries()].map(([index, id]) => ({
    id,
    text: String(blocks[index].text).replace(/^\d+\s*\/\s*/, '')
  }))

  useEffect(() => {
    if (!article.current) return

    let ticking = false
    let frame = 0

    function updateProgress() {
      ticking = false
      if (!article.current) return

      const start = article.current.offsetTop - window.innerHeight * 0.35
      const distance = Math.max(1, article.current.offsetHeight - window.innerHeight * 0.45)
      const value = Math.min(1, Math.max(0, (window.scrollY - start) / distance))

      if (progressEl.current) progressEl.current.style.transform = `scaleX(${value})`
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      frame = requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [slug])

  /* 目录高亮：只关心正处在视口上三分之一的标题 */
  useEffect(() => {
    if (!article.current) return
    const nodes = Array.from(article.current.querySelectorAll<HTMLElement>('.post-body__h2'))
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveHeading(visible[0].target.id)
      },
      { rootMargin: '-16% 0px -72% 0px' }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [slug])

  /* 灯箱打开时锁滚动，Esc 或点击背景关闭 */
  useEffect(() => {
    if (!lightbox) return
    lockScroll()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockScroll()
    }
  }, [lightbox])

  function goToHeading(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    scrollTo(el, { offset: -100, duration: 1.1 })
  }

  if (!post) {
    return (
      <div className="post-missing theme-paper">
        <Seo title={t('未找到这篇手记 — 陆屿 LU YU', 'Note not found — LU YU')} path={`/journal/${slug}`} noindex />
        <div className="shell post-missing__inner">
          <span className="eyebrow">404 / Journal</span>
          <h1 className="post-missing__title">
            This note
            <br />
            <em>got lost.</em>
          </h1>
          <p>{t('这篇手记可能被移动了，或者还没有写完。', 'This note may have been moved, or it is not finished yet.')}</p>
          <Link to="/journal" className="post-missing__link" data-cursor="Back">
            {t('返回手记索引', 'Back to journal index')} ↗
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const published = post.date.replace(/\./g, '-')
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: published,
    dateModified: published,
    inLanguage: 'zh-CN',
    articleSection: project ? `${project.title} · ${project.cn}` : post.category,
    keywords: post.tags.join(', '),
    image: `${SITE_URL}${post.art}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/journal/${post.slug}` },
    author: { '@type': 'Person', name: '陆屿', alternateName: 'LU YU', url: SITE_URL },
    publisher: { '@type': 'Person', name: '陆屿', url: SITE_URL }
  }

  return (
    <div className="post-page theme-paper">
      <Seo
        title={t(`${post.title} — 陆屿 LU YU`, `${post.en} — LU YU`)}
        path={`/journal/${post.slug}`}
        description={post.excerpt}
        image={post.art}
        type="article"
        jsonLd={articleLd}
      />
      <div className="post-progress" aria-hidden="true">
        <span ref={progressEl} />
      </div>

      <header className="post-hero">
        <div className="shell">
          <div className="post-hero__bar">
            <Link to="/journal" className="post-hero__back mono" data-cursor="Back">
              <span aria-hidden="true">←</span>
              <span>Journal / {t('手记', 'Journal')}</span>
            </Link>
            <span className="mono post-hero__folio">
              {t('第', 'No.')} {post.index} / {total}
            </span>
          </div>

          <div className="post-hero__masthead">
            <div className="post-hero__intro">
              <div className="post-hero__kicker">
                <span className="post-hero__cat mono">{post.category}</span>
                {project ? (
                  <Link to={`/journal?project=${project.slug}`} className="post-hero__project mono">
                    {project.title} · {project.cn}
                  </Link>
                ) : null}
                <span className="mono">{post.date}</span>
                <span className="mono">
                  {post.reading} {t('阅读', 'read')}
                </span>
              </div>

              <h1 className="post-hero__title">
                {titleParts.map((part, index) => (
                  <span key={index} className="post-hero__title-part">
                    {part}
                  </span>
                ))}
              </h1>
              <p className="post-hero__en">{post.en}</p>
              <p className="post-hero__excerpt">{post.excerpt}</p>

              <div className="post-hero__tags">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/journal/tag/${encodeURIComponent(tag)}`}
                    className="post-hero__tag mono"
                    data-cursor="Tag"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>

              <EngagementBar slug={post.slug} />
            </div>

            <figure className="post-hero__cover">
              <div className="post-hero__cover-top">
                <span className="post-hero__cover-no" aria-hidden="true">
                  {post.index}
                </span>
                <span className="mono post-hero__cover-label">
                  Cover / {post.en}
                </span>
              </div>
              <ArtworkFrame
                src={post.art}
                alt={t(`${post.title} — 文章配图`, `${post.en} — article image`)}
                ratio="4 / 5"
                parallax={8}
                eager
              >
                <div className="post-hero__cover-meta mono">
                  <span>LU YU / Journal</span>
                  <span>{post.date}</span>
                </div>
              </ArtworkFrame>
              <figcaption className="post-hero__caption mono">
                <span>Fig. {post.index}</span>
                <span>
                  {post.en}, {post.date.slice(0, 4)}
                </span>
              </figcaption>
            </figure>
          </div>

          <div className="post-hero__strip">
            <div className="post-hero__strip-item">
              <span className="mono">{t('归入', 'Filed under')}</span>
              {project ? (
                <Link to={`/journal?project=${project.slug}`}>{project.cn}</Link>
              ) : (
                <span>{post.category}</span>
              )}
            </div>
            <div className="post-hero__strip-item">
              <span className="mono">{t('文字', 'Words')}</span>
              <span>陆屿 / LU YU</span>
            </div>
            <div className="post-hero__strip-item">
              <span className="mono">{t('地点', 'Place')}</span>
              <span>Beijing, CN</span>
            </div>
            <div className="post-hero__strip-item">
              <span className="mono">{t('卷号', 'Edition')}</span>
              <span>Vol. 03 — Journal</span>
            </div>
          </div>
        </div>
      </header>

      <div className="post-main shell">
        <aside className="post-rail" aria-label={t('文章索引', 'Post index')}>
          <div className="post-rail__inner">
            <nav className="post-rail__toc" aria-label={t('本页目录', 'On this page')}>
              <span className="post-rail__label mono">{t('本页目录', 'On this page')}</span>
              {headings.length ? (
                <ol>
                  {headings.map((heading, index) => (
                    <li key={heading.id}>
                      <button
                        type="button"
                        className={activeHeading === heading.id ? 'is-active' : ''}
                        onClick={() => goToHeading(heading.id)}
                      >
                        <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                        <span>{heading.text}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="post-rail__single mono">{t('单页短文', 'Single page')}</p>
              )}
            </nav>

            <div className="post-rail__block">
              <span className="post-rail__label mono">{t('归入', 'Filed under')}</span>
              <ul className="post-rail__tags">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Link to={`/journal/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="post-rail__block">
              <span className="post-rail__label mono">{t('页码', 'Folio')}</span>
              <p className="post-rail__folio mono">
                {post.index} / {total}
              </p>
            </div>

            <Link to="/journal" className="post-rail__back mono" data-cursor="Index">
              {t('全部手记', 'All notes')} <span aria-hidden="true">↖</span>
            </Link>
          </div>
        </aside>

        <article ref={article} className="post-body">
          {blocks.map((block, index) => {
            if (block.type === 'p') {
              return (
                <p key={index} className="post-body__p">
                  {block.text}
                </p>
              )
            }

            if (block.type === 'h2') {
              const raw = String(block.text)
              const matched = raw.match(/^(\d+)\s*\/\s*(.*)$/)
              return (
                <h2 key={index} id={headingIds.get(index)} className="post-body__h2">
                  {matched ? (
                    <span className="post-body__h2-no" aria-hidden="true">
                      {matched[1]}
                    </span>
                  ) : null}
                  <span className="post-body__h2-text">{matched ? matched[2] : raw}</span>
                </h2>
              )
            }

            if (block.type === 'quote') {
              return (
                <blockquote key={index} className="post-body__quote">
                  <span className="post-body__quote-mark" aria-hidden="true">
                    “
                  </span>
                  <p>{block.text}</p>
                  {block.cite ? <cite className="mono">{block.cite}</cite> : null}
                </blockquote>
              )
            }

            if (block.type === 'list') {
              return (
                <ul key={index} className="post-body__list">
                  {block.items.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            }

            if (block.type === 'image') {
              return (
                <figure key={index} className="post-body__figure">
                  <button
                    type="button"
                    className="post-body__figure-frame"
                    onClick={() => setLightbox({ src: block.src, caption: block.caption })}
                    aria-label={t(`放大图片：${block.caption}`, `Enlarge image: ${block.caption}`)}
                  >
                    <img
                      src={block.src}
                      alt={block.caption}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: block.position || '50% 50%' }}
                    />
                    <span className="post-body__figure-hint mono" aria-hidden="true">
                      {t('放大', 'Enlarge')} ↗
                    </span>
                  </button>
                  <figcaption className="post-body__figure-caption mono">
                    <span>Fig.</span>
                    <span>{block.caption}</span>
                  </figcaption>
                </figure>
              )
            }

            if (block.type === 'code') {
              return <CodeBlock key={index} code={block.text} language={block.language} />
            }

            return null
          })}

          <div className="post-body__end" aria-hidden="true">
            <span />
            <span className="mono">End of note — {post.index}</span>
            <span />
          </div>
        </article>
      </div>

      {related.length ? (
        <section className="post-related shell" aria-label={t('相关手记', 'Related notes')}>
          <div className="post-related__head">
            <span className="eyebrow">Related / {t('延伸阅读', 'Keep reading')}</span>
            <span className="mono">{t('同项目或同标签', 'Same project or tags')}</span>
          </div>
          <div className="post-related__grid">
            {related.map((item) => (
              <Link
                key={item.slug}
                to={`/journal/${item.slug}`}
                className="post-related__item"
                data-cursor="Read"
              >
                <span className="post-related__no" aria-hidden="true">
                  {item.index}
                </span>
                <span className="mono post-related__meta">
                  {projectOf(item)?.cn ?? item.category} · {item.date}
                </span>
                <span className="post-related__title">{item.title}</span>
                <span className="post-related__en">{item.en}</span>
                <span className="post-related__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <CommentSection slug={post.slug} />

      <nav className="post-adjacent shell" aria-label={t('文章导航', 'Post navigation')}>
        {adjacent.prev ? (
          <Link to={`/journal/${adjacent.prev.slug}`} className="post-adjacent__item" data-cursor="Read">
            <span className="mono post-adjacent__dir">
              <span aria-hidden="true">←</span> {t('更新一篇', 'Newer')}
            </span>
            <span className="post-adjacent__title">{adjacent.prev.title}</span>
            <span className="post-adjacent__en">{adjacent.prev.en}</span>
          </Link>
        ) : (
          <span className="post-adjacent__empty" />
        )}

        {adjacent.next ? (
          <Link
            to={`/journal/${adjacent.next.slug}`}
            className="post-adjacent__item post-adjacent__item--right"
            data-cursor="Read"
          >
            <span className="mono post-adjacent__dir">
              {t('更早一篇', 'Older')} <span aria-hidden="true">→</span>
            </span>
            <span className="post-adjacent__title">{adjacent.next.title}</span>
            <span className="post-adjacent__en">{adjacent.next.en}</span>
          </Link>
        ) : null}
      </nav>

      <div className="post-return shell">
        <Link to="/journal" className="post-return__link" data-cursor="Index">
          <span>{t('返回全部手记', 'Back to all entries')}</span>
          <span aria-hidden="true">↖</span>
        </Link>
      </div>

      <SiteFooter />

      {lightbox ? (
        <div
          className="post-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="post-lightbox__close mono"
            onClick={() => setLightbox(null)}
          >
            {t('关闭', 'Close')} ✕
          </button>
          <figure className="post-lightbox__figure" onClick={(event) => event.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.caption} />
            <figcaption className="mono">{lightbox.caption}</figcaption>
          </figure>
        </div>
      ) : null}
    </div>
  )
}
