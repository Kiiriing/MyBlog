import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { gsap } from '../lib/gsap'
import { posts, projectOf } from '../data/posts'
import { useI18n } from '../store/i18n'
import '../styles/components/JournalList.css'

type Post = (typeof posts)[number]

type JournalListProps = {
  posts: Post[]
}

export default function JournalList({ posts: items }: JournalListProps) {
  const preview = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<Post | null>(null)
  const { t } = useI18n()

  const canPreview = useRef(false)
  const quick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null)

  useEffect(() => {
    if (!preview.current) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    canPreview.current = true
    const x = gsap.quickTo(preview.current, 'x', { duration: 0.55, ease: 'power3.out' })
    const y = gsap.quickTo(preview.current, 'y', { duration: 0.55, ease: 'power3.out' })
    quick.current = { x, y }

    return () => {
      gsap.killTweensOf(preview.current)
      quick.current = null
      canPreview.current = false
    }
  }, [])

  function positionAt(event: React.MouseEvent) {
    const q = quick.current
    if (!canPreview.current || !preview.current || !q) return
    const rect = preview.current.getBoundingClientRect()
    const width = rect.width || 232
    const height = rect.height || 310
    const x = Math.min(window.innerWidth - width - 24, Math.max(24, event.clientX + 28))
    const y = Math.max(24, Math.min(window.innerHeight - height - 24, event.clientY - height / 2))
    q.x(x)
    q.y(y)
  }

  function showPreview(post: Post, event: React.MouseEvent) {
    if (!canPreview.current || !preview.current) return
    setActive(post)
    positionAt(event)
    gsap.to(preview.current, {
      opacity: 1,
      scale: 1,
      duration: 0.42,
      ease: 'power3.out',
      overwrite: 'auto'
    })
  }

  function movePreview(event: React.MouseEvent) {
    if (!active) return
    positionAt(event)
  }

  function hidePreview() {
    if (!preview.current) return
    setActive(null)
    gsap.to(preview.current, {
      opacity: 0,
      scale: 0.94,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  const previewNode = (
    <div ref={preview} className="journal-preview" aria-hidden="true">
      <div className="journal-preview__frame">
        {active ? (
          <img key={active.slug} src={active.art} alt={active.title} draggable="false" />
        ) : null}
        <span className="journal-preview__tag mono">
          {active ? (projectOf(active)?.cn ?? active.category) : t('手记', 'Journal')}
        </span>
      </div>
      <div className="journal-preview__foot mono">
        <span>{active ? active.index : '—'}</span>
        <span>{active?.reading || t('阅读', 'Read')}</span>
      </div>
    </div>
  )

  return (
    <>
      <div className="journal-list" onMouseLeave={hidePreview}>
        {items.map((post) => {
          const project = projectOf(post)
          return (
            <Link
              key={post.slug}
              to={`/journal/${post.slug}`}
              className="journal-row"
              data-cursor="Read"
              onMouseEnter={(event) => showPreview(post, event)}
              onMouseMove={movePreview}
            >
              <span className="journal-row__index mono">{post.index}</span>

              <span className="journal-row__main">
                <span className="journal-row__title">{post.title}</span>
                <span className="journal-row__en">{post.en}</span>
              </span>

              <span className="journal-row__cat mono">
                {project ? `${project.title} · ${project.cn}` : post.category}
              </span>
              <span className="journal-row__date mono">{post.date}</span>

              <span className="journal-row__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 19L19 5M9 5h10v10" stroke="currentColor" strokeWidth="1" />
                </svg>
              </span>
            </Link>
          )
        })}
      </div>

      {typeof document !== 'undefined' ? createPortal(previewNode, document.body) : null}
    </>
  )
}
