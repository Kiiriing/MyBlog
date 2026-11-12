import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { gsap } from '../lib/gsap'
import { works } from '../data/works'
import { site } from '../data/site'
import SiteFooter from '../components/SiteFooter'
import ChapterTag from '../components/ChapterTag'
import ChapterNext from '../components/ChapterNext'
import Seo from '../components/Seo'
import { useI18n } from '../store/i18n'
import '../styles/components/WorkIndexView.css'

const filters = [
  { key: 'all', label: 'All', cn: '全部' },
  { key: 'enterprise', label: 'Enterprise', cn: '企业系统' },
  { key: 'fullstack', label: 'Full-stack', cn: '全栈产品' },
  { key: 'data', label: 'Data', cn: '数据可视化' },
  { key: 'collab', label: 'Collab', cn: '校企协作' }
]

type Work = (typeof works)[number]

export default function WorkIndexView() {
  const preview = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState('all')
  const [hovered, setHovered] = useState<Work | null>(null)
  const { t } = useI18n()

  const canPreview = useRef(false)
  const quick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null)

  const filtered = active === 'all' ? works : works.filter((work) => work.filters?.includes(active))
  const count = String(filtered.length).padStart(2, '0')
  const total = String(works.length).padStart(2, '0')

  useEffect(() => {
    if (!preview.current) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    canPreview.current = true
    const x = gsap.quickTo(preview.current, 'x', { duration: 0.5, ease: 'power3.out' })
    const y = gsap.quickTo(preview.current, 'y', { duration: 0.5, ease: 'power3.out' })
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
    const width = rect.width || 290
    const height = rect.height || 400
    const gap = 34
    const margin = 24

    let x = event.clientX + gap
    if (x + width > window.innerWidth - margin) {
      x = event.clientX - width - gap
    }
    x = Math.max(margin, Math.min(window.innerWidth - width - margin, x))

    const y = Math.max(
      margin,
      Math.min(window.innerHeight - height - margin, event.clientY - height * 0.55)
    )

    q.x(x)
    q.y(y)
  }

  function showPreview(work: Work, event: React.MouseEvent) {
    if (!canPreview.current || !preview.current) return
    setHovered(work)
    positionAt(event)
    gsap.to(preview.current, {
      opacity: 1,
      scale: 1,
      rotate: 0,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: 'auto'
    })
  }

  function movePreview(event: React.MouseEvent) {
    if (!hovered) return
    positionAt(event)
  }

  function hidePreview() {
    if (!preview.current) return
    setHovered(null)
    gsap.to(preview.current, {
      opacity: 0,
      scale: 0.92,
      rotate: -3,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  }

  const previewNode = (
    <div ref={preview} className="work-preview" aria-hidden="true">
      <div className="work-preview__frame">
        {hovered ? <img key={hovered.slug} src={hovered.art} alt="" draggable="false" /> : null}
        <span className="work-preview__badge mono">Case study</span>
        <span className="work-preview__no mono">
          {hovered?.index || '—'} / {total}
        </span>
      </div>

      <div className="work-preview__meta">
        <strong>{hovered?.title || 'Selected work'}</strong>
        <span className="mono">
          {hovered?.year} — {hovered?.cn}
        </span>
      </div>
      <span className="work-preview__stack mono">
        {hovered?.stack?.slice(0, 3).join(' · ') || 'Full-stack'}
      </span>
    </div>
  )

  return (
    <div className="work-index">
      <Seo
        title={t('作品 Work — Full-stack Projects · 陆屿 LU YU', 'Work — Full-stack Projects · LU YU')}
        path="/work"
        description={t(
          '陆屿的作品索引：企业管理系统、签到考勤、数据大屏与校企协作项目。',
          'LU YU’s project index: enterprise systems, attendance, data walls and university collaboration.'
        )}
      />
      <header className="work-index__hero">
        <div className="work-index__ambient" aria-hidden="true" />
        <span className="work-index__ghost" aria-hidden="true">
          PROJECTS
        </span>

        <div className="shell work-index__hero-inner">
          <div className="work-index__hero-top mono">
            <span>Work index / {t('项目索引', 'Work index')}</span>
            <span>{total} projects — 2024 / 2026</span>
          </div>

          <ChapterTag index="04" meta={`${total} projects`} className="work-index__chapter" />

          <div className="work-index__hero-main">
            <div className="work-index__intro">
              <h1 className="work-index__title">
                <span>All</span>
                <em>projects.</em>
              </h1>
              <p className="work-index__cn">
                {t(
                  '从界面到数据库，四个真正交付过的项目。',
                  'From interface to database — four projects that actually shipped.'
                )}
              </p>
            </div>

            <aside className="work-index__aside">
              <p className="work-index__lede">
                {t(
                  '这里收录 2024 年以来的四个项目：企业管理系统、签到考勤、数据可视化大屏 与校企协作。每一个都从一条需求开始，最后跑到真实用户手里。',
                  'Four projects since 2024: an enterprise management system, attendance tracking, a data visualisation wall and university collaboration. Each started as a single requirement and ended up in real users’ hands.'
                )}
              </p>

              <span className="work-index__stamp" aria-hidden="true">
                <svg viewBox="0 0 160 160">
                  <defs>
                    <path
                      id="work-stamp-circle"
                      d="M80,80 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#work-stamp-circle">
                      FULL-STACK WORK · 2024—2026 · FOUR PROJECTS ·
                    </textPath>
                  </text>
                  <text className="work-index__stamp-core" x="80" y="87" textAnchor="middle">
                    ✦
                  </text>
                </svg>
              </span>
            </aside>
          </div>

          <div className="work-index__hero-meta mono">
            <span>{t('基于北京', 'Based in Beijing')}</span>
            <span>Enterprise / Full-stack / Data / Collaboration</span>
            <span>{t('向下滚动浏览', 'Scroll to browse')} ↓</span>
          </div>
        </div>
      </header>

      <div className="shell work-index__filters">
        <div
          className="work-index__filter-list"
          role="group"
          aria-label={t('按类别筛选项目', 'Filter projects by category')}
        >
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`work-index__filter${active === filter.key ? ' is-active' : ''}`}
              aria-pressed={active === filter.key}
              onClick={() => {
                setActive(filter.key)
                hidePreview()
              }}
            >
              <span className="work-index__filter-en mono">{filter.label}</span>
              <span className="work-index__filter-cn">{filter.cn}</span>
            </button>
          ))}
        </div>

        <span className="work-index__count mono" aria-live="polite" aria-atomic="true">
          <span key={count} className="work-index__count-current">
            {count}
          </span>
          <span className="work-index__count-total"> / {total}</span>
        </span>
      </div>

      <div className="shell work-index__list">
        <div className="work-rows" onMouseLeave={hidePreview}>
          {filtered.map((work) => (
            <Link
              key={work.slug}
              to={`/work/${work.slug}`}
              className="work-row"
              style={{ '--row-accent': work.accent } as React.CSSProperties}
              data-cursor="Open"
              onMouseEnter={(event) => showPreview(work, event)}
              onMouseMove={movePreview}
            >
              <span className="work-row__no">{work.index}</span>

              <span className="work-row__thumb" aria-hidden="true">
                <img src={work.art} alt="" draggable="false" />
              </span>

              <span className="work-row__main">
                <span className="work-row__title">{work.title}</span>
                <span className="work-row__cn">{work.cn}</span>
              </span>

              <span className="work-row__cat mono">{work.category}</span>
              <span className="work-row__year mono">{work.year}</span>

              <span className="work-row__arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 19L19 5M9 5h10v10" stroke="currentColor" strokeWidth="1" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {!filtered.length ? (
          <p className="work-index__empty mono">
            {t('这一类暂时没有项目，换一个筛选看看。', 'No projects in this category yet. Try another filter.')}
          </p>
        ) : null}

        <div className="work-index__end">
          <span className="mono">End of index — {total} projects</span>
          <a href={`mailto:${site.email}`} className="work-index__end-link mono" data-cursor="Write">
            {t('开始一个项目', 'Start a project')} ↗
          </a>
        </div>
      </div>

      <ChapterNext index="05" />

      <SiteFooter />

      {typeof document !== 'undefined' ? createPortal(previewNode, document.body) : null}
    </div>
  )
}
