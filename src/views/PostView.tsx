import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdjacentPost, getPost, posts } from '../data/posts'
import ArtworkFrame from '../components/ArtworkFrame'
import SiteFooter from '../components/SiteFooter'
import '../styles/components/PostView.css'

export default function PostView() {
  const { slug = '' } = useParams()
  const post = getPost(slug)
  const adjacent = getAdjacentPost(slug)
  const total = String(posts.length).padStart(2, '0')

  const article = useRef<HTMLElement>(null)
  const progressEl = useRef<HTMLSpanElement>(null)

  const titleParts = String(post?.title || '')
    .split(/(?<=[：:、，,。—])/)
    .filter(Boolean)

  useEffect(() => {
    document.title = post
      ? `${post.title} — 陆屿 LU YU`
      : '未找到这篇手记 — 陆屿 LU YU'
  }, [slug])

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

  if (!post) {
    return (
      <div className="post-missing theme-paper">
        <div className="shell post-missing__inner">
          <span className="eyebrow">404 / Journal</span>
          <h1 className="post-missing__title">
            This note
            <br />
            <em>got lost.</em>
          </h1>
          <p>这篇手记可能被移动了，或者还没有写完。</p>
          <Link to="/journal" className="post-missing__link" data-cursor="Back">
            返回手记索引 ↗
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="post-page theme-paper">
      <div className="post-progress" aria-hidden="true">
        <span ref={progressEl} />
      </div>

      <header className="post-head">
        <div className="shell">
          <div className="post-head__top">
            <Link to="/journal" className="post-back mono" data-cursor="Back">
              <span aria-hidden="true">←</span>
              <span>Journal / 手记</span>
            </Link>
            <span className="mono post-head__no">
              {post.index} / {total}
            </span>
          </div>

          <div className="post-head__meta">
            <span className="post-head__cat mono">{post.category}</span>
            <span className="mono">{post.date}</span>
            <span className="mono">{post.reading} read</span>
          </div>

          <h1 className="post-head__title">
            {titleParts.map((part, index) => (
              <span key={index} className="post-head__title-part">
                {part}
              </span>
            ))}
          </h1>
          <p className="post-head__en">{post.en}</p>
          <p className="post-head__excerpt">{post.excerpt}</p>

          <div className="post-head__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="post-head__tag mono">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="post-cover shell">
        <ArtworkFrame
          src={post.art}
          alt={`${post.title} — 文章配图`}
          ratio="16 / 9"
          parallax={8}
          eager
        >
          <div className="post-cover__meta mono">
            <span>LU YU / Journal</span>
            <span>{post.date}</span>
          </div>
        </ArtworkFrame>
        <p className="post-cover__caption mono">
          Fig. {post.index} — {post.en}, {post.date.slice(0, 4)}
        </p>
      </div>

      <div className="post-layout shell">
        <aside className="post-aside">
          <div className="post-aside__inner">
            <span className="post-aside__label mono">Filed under</span>
            <ul className="post-aside__tags">
              {post.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
            <div className="post-aside__rule" />
            <div className="post-aside__meta mono">
              <span>Words — 我</span>
              <span>Images — 我</span>
              <span>Beijing, CN</span>
            </div>
          </div>
        </aside>

        <article ref={article} className="post-body">
          {(post.blocks as any[]).map((block, index) => {
            if (block.type === 'p') {
              return (
                <p key={index} className="post-body__p">
                  {block.text}
                </p>
              )
            }

            if (block.type === 'h2') {
              return (
                <h2 key={index} className="post-body__h2">
                  <span>{block.text}</span>
                </h2>
              )
            }

            if (block.type === 'quote') {
              return (
                <blockquote key={index} className="post-body__quote">
                  <p>{block.text}</p>
                  {block.cite ? <cite className="mono">{block.cite}</cite> : null}
                </blockquote>
              )
            }

            if (block.type === 'list') {
              return (
                <ul key={index} className="post-body__list">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            }

            if (block.type === 'image') {
              return (
                <figure key={index} className="post-body__figure">
                  <div className="post-body__figure-frame">
                    <img
                      src={block.src}
                      alt={block.caption}
                      loading="lazy"
                      decoding="async"
                      style={{ objectPosition: block.position || '50% 50%' }}
                    />
                  </div>
                  <figcaption className="mono">{block.caption}</figcaption>
                </figure>
              )
            }

            if (block.type === 'code') {
              return (
                <pre key={index} className="post-body__code">
                  <code>{block.text}</code>
                </pre>
              )
            }

            return null
          })}
        </article>
      </div>

      <nav className="post-adjacent shell" aria-label="文章导航">
        {adjacent.prev ? (
          <Link to={`/journal/${adjacent.prev.slug}`} className="post-adjacent__item" data-cursor="Read">
            <span className="mono">Newer / 更新一篇</span>
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
            <span className="mono">Older / 更早一篇</span>
            <span className="post-adjacent__title">{adjacent.next.title}</span>
            <span className="post-adjacent__en">{adjacent.next.en}</span>
          </Link>
        ) : null}
      </nav>

      <div className="post-return shell">
        <Link to="/journal" className="post-return__link" data-cursor="Index">
          <span>Back to all entries</span>
          <span aria-hidden="true">↖</span>
        </Link>
      </div>

      <SiteFooter />
    </div>
  )
}
