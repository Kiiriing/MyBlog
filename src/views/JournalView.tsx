import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getAllTags,
  getProject,
  getYears,
  journalProjects,
  postYear,
  posts,
  postsByProject,
  postsByYear
} from '../data/posts'
import { api } from '../lib/api'
import { useI18n } from '../store/i18n'
import JournalList from '../components/JournalList'
import SiteFooter from '../components/SiteFooter'
import ChapterTag from '../components/ChapterTag'
import ChapterNext from '../components/ChapterNext'
import Seo from '../components/Seo'
import '../styles/components/JournalView.css'

export default function JournalView() {
  const [params, setParams] = useSearchParams()
  const { t } = useI18n()
  const projectSlug = params.get('project') || ''
  const year = params.get('year') || ''
  const project = getProject(projectSlug)
  const pageTitle = project
    ? `${project.title} ${project.cn} · ${t('手记', 'Journal')} — LU YU`
    : t('手记 Journal — 陆屿 LU YU', 'Journal — LU YU')
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [heat, setHeat] = useState<Record<string, number>>({})

  useEffect(() => {
    let alive = true
    api
      .postStatsList(posts.map((post) => post.slug))
      .then((list) => {
        if (!alive) return
        const next: Record<string, number> = {}
        list.forEach((item) => {
          next[item.slug] = item.views + item.likes * 6 + item.favorites * 8
        })
        setHeat(next)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const filtered = posts.filter(
    (post) => (!project || post.project === project.slug) && (!year || postYear(post) === year)
  )
  const ordered =
    sort === 'hot'
      ? [...filtered].sort(
          (a, b) => (heat[b.slug] ?? 0) - (heat[a.slug] ?? 0) || b.date.localeCompare(a.date)
        )
      : filtered
  const total = String(posts.length).padStart(2, '0')
  const years = getYears()
  const tags = getAllTags()

  function setFilter(key: 'project' | 'year', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="journal-page theme-paper">
      <Seo
        title={pageTitle}
        path="/journal"
        description={t(
          '陆屿的手记：工程、产品与设计之间的构建笔记，按项目、年份与标签整理。',
          'LU YU’s journal: build notes between engineering, product and design, organised by project, year and tag.'
        )}
      />
      <div className="journal-page__grid" aria-hidden="true" />

      <header className="journal-page__head">
        <div className="shell">
          <ChapterTag index="07" meta={`${total} entries`} className="journal-page__chapter" />

          <div className="journal-page__meta">
            <span className="eyebrow">Journal / {t('手记', 'Journal')}</span>
            <span className="mono journal-page__meta-note">
              {t('Essays, build notes & 一些未完成的想法', 'Essays, build notes & some unfinished thoughts')}
            </span>
          </div>

          <h1 className="journal-page__title">
            <span>Notes on</span>
            <em>building &amp; shipping.</em>
          </h1>

          <div className="journal-page__intro">
            <p>
              {t(
                '这里收集我在工程、产品与设计之间留下的笔记。 有些是关于实现的，有些只是某个下午的调试记录。 它们被写下来，是因为不想让那些判断太快消失。',
                'Notes left between engineering, product and design. Some are about implementation, others are just a debugging session from a certain afternoon. They are written down so those judgements do not disappear too quickly.'
              )}
            </p>
            <div className="journal-page__index mono">
              <span>{total} entries</span>
              <span>{journalProjects.length} projects</span>
              <span>Beijing</span>
            </div>
          </div>
        </div>
      </header>

      <main className="journal-page__body">
        <div className="shell">
          <div className="journal-page__filters">
            <span className="mono journal-page__filter-label">
              {t('Project / 项目', 'Project / 项目')}
            </span>
            <div
              className="journal-page__filter-group"
              role="group"
              aria-label={t('按项目筛选文章', 'Filter posts by project')}
            >
              <button
                className={`journal-page__filter${!project ? ' is-active' : ''}`}
                type="button"
                aria-pressed={!project}
                onClick={() => setFilter('project', '')}
              >
                <span>{t('全部', 'All')}</span>
                <span className="journal-page__filter-count">{posts.length}</span>
              </button>
              {journalProjects.map((item) => {
                const count = postsByProject(item.slug).length
                return (
                  <button
                    key={item.slug}
                    className={`journal-page__filter${project?.slug === item.slug ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={project?.slug === item.slug}
                    onClick={() => setFilter('project', item.slug)}
                  >
                    <span>{item.cn}</span>
                    <span className="journal-page__filter-count">{count}</span>
                  </button>
                )
              })}
            </div>
            <span className="mono journal-page__result" aria-live="polite">
              {String(filtered.length).padStart(2, '0')} {t('篇', 'shown')}
            </span>
          </div>

          <div
            className="journal-page__years"
            role="group"
            aria-label={t('按年份筛选文章', 'Filter posts by year')}
          >
            <span className="mono journal-page__filter-label">{t('Year / 年份', 'Year / 年份')}</span>
            <div className="journal-page__year-group">
              <button
                className={`journal-page__year${!year ? ' is-active' : ''}`}
                type="button"
                aria-pressed={!year}
                onClick={() => setFilter('year', '')}
              >
                {t('All', 'All')}
              </button>
              {years.map((item) => (
                <button
                  key={item}
                  className={`journal-page__year${year === item ? ' is-active' : ''}`}
                  type="button"
                  aria-pressed={year === item}
                  onClick={() => setFilter('year', item)}
                >
                  {item}
                  <span>{postsByYear(item).length}</span>
                </button>
              ))}
            </div>
            <div
              className="journal-page__sort"
              role="group"
              aria-label={t('排序方式', 'Sort order')}
            >
              <button
                type="button"
                className={`mono${sort === 'latest' ? ' is-active' : ''}`}
                aria-pressed={sort === 'latest'}
                onClick={() => setSort('latest')}
              >
                {t('最新', 'Latest')}
              </button>
              <button
                type="button"
                className={`mono${sort === 'hot' ? ' is-active' : ''}`}
                aria-pressed={sort === 'hot'}
                onClick={() => setSort('hot')}
              >
                {t('热度', 'Popular')}
              </button>
            </div>
          </div>

          {project ? (
            <section
              className="journal-project"
              style={{ '--project-accent': project.accent } as React.CSSProperties}
              aria-label={t(`${project.title} 项目手记`, `${project.title} project journal`)}
            >
              <div className="journal-project__main">
                <span className="mono journal-project__kicker">{t('Project / 项目', 'Project / 项目')}</span>
                <h2 className="journal-project__title">
                  <span>{project.title}</span>
                  <em>{project.cn}</em>
                </h2>
                <p className="journal-project__note">{project.note}</p>
              </div>
              <div className="journal-project__aside">
                <span className="mono journal-project__count">
                  {String(postsByProject(project.slug).length).padStart(2, '0')} entries
                </span>
                <div className="journal-project__actions">
                  {project.work ? (
                    <Link
                      to={`/work/${project.work}`}
                      className="journal-project__link"
                      data-cursor="Project"
                    >
                      {t('查看项目', 'View project')} <span aria-hidden="true">↗</span>
                    </Link>
                  ) : null}
                  <button
                    className="journal-project__reset mono"
                    type="button"
                    onClick={() => setFilter('project', '')}
                  >
                    {t('清除筛选', 'Clear filter')}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <div className="journal-page__list">
            {ordered.length ? (
              <JournalList posts={ordered} />
            ) : (
              <p className="journal-page__empty">
                {t(
                  '这个筛选下还没有手记，换一个项目或年份看看。',
                  'No notes under this filter yet. Try another project or year.'
                )}
              </p>
            )}
          </div>

          <div className="journal-page__archive">
            <div className="journal-page__archive-head">
              <span className="eyebrow">{t('Archive / 归档', 'Archive / 归档')}</span>
              <span className="mono">{t('按年份与标签', 'By year & tag')}</span>
            </div>
            <div className="journal-page__archive-grid">
              <div>
                <ul className="journal-page__archive-years">
                  {years.map((item) => (
                    <li key={item}>
                      <button type="button" onClick={() => setFilter('year', item)}>
                        <span className="mono">{item}</span>
                        <span className="mono journal-page__archive-count">
                          {String(postsByYear(item).length).padStart(2, '0')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="journal-page__tag-cloud">
                {tags.map(({ tag, count }) => (
                  <Link key={tag} to={`/journal/tag/${encodeURIComponent(tag)}`} className="mono">
                    #{tag}
                    <span>{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="journal-page__foot">
            <p className="mono">
              {t('索引结束 — 还有更多手记正在写。', 'End of index — more notes are being written.')}
            </p>
            <Link to="/" className="journal-page__home" data-cursor="Index">
              <span>{t('回到首页', 'Back to index')}</span>
              <span aria-hidden="true">↖</span>
            </Link>
          </div>
        </div>
      </main>

      <ChapterNext index="08" />

      <SiteFooter />
    </div>
  )
}
