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
import JournalList from '../components/JournalList'
import SiteFooter from '../components/SiteFooter'
import ChapterTag from '../components/ChapterTag'
import ChapterNext from '../components/ChapterNext'
import Seo from '../components/Seo'
import '../styles/components/JournalView.css'

export default function JournalView() {
  const [params, setParams] = useSearchParams()
  const projectSlug = params.get('project') || ''
  const year = params.get('year') || ''
  const project = getProject(projectSlug)
  const pageTitle = project
    ? `${project.title} ${project.cn} · 手记 — 陆屿 LU YU`
    : '手记 Journal — 陆屿 LU YU'

  const filtered = posts.filter(
    (post) => (!project || post.project === project.slug) && (!year || postYear(post) === year)
  )
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
        description="陆屿的手记：工程、产品与设计之间的构建笔记，按项目、年份与标签整理。"
      />
      <div className="journal-page__grid" aria-hidden="true" />

      <header className="journal-page__head">
        <div className="shell">
          <ChapterTag index="07" meta={`${total} entries`} className="journal-page__chapter" />

          <div className="journal-page__meta">
            <span className="eyebrow">Journal / 手记</span>
            <span className="mono journal-page__meta-note">
              Essays, build notes &amp; 一些未完成的想法
            </span>
          </div>

          <h1 className="journal-page__title">
            <span>Notes on</span>
            <em>building &amp; shipping.</em>
          </h1>

          <div className="journal-page__intro">
            <p>
              这里收集我在工程、产品与设计之间留下的笔记。 有些是关于实现的，有些只是某个下午的调试记录。
              它们被写下来，是因为不想让那些判断太快消失。
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
            <span className="mono journal-page__filter-label">Project / 项目</span>
            <div className="journal-page__filter-group" role="group" aria-label="按项目筛选文章">
              <button
                className={`journal-page__filter${!project ? ' is-active' : ''}`}
                type="button"
                aria-pressed={!project}
                onClick={() => setFilter('project', '')}
              >
                <span>全部</span>
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
              {String(filtered.length).padStart(2, '0')} shown
            </span>
          </div>

          <div className="journal-page__years" role="group" aria-label="按年份筛选文章">
            <span className="mono journal-page__filter-label">Year / 年份</span>
            <div className="journal-page__year-group">
              <button
                className={`journal-page__year${!year ? ' is-active' : ''}`}
                type="button"
                aria-pressed={!year}
                onClick={() => setFilter('year', '')}
              >
                All
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
          </div>

          {project ? (
            <section
              className="journal-project"
              style={{ '--project-accent': project.accent } as React.CSSProperties}
              aria-label={`${project.title} 项目手记`}
            >
              <div className="journal-project__main">
                <span className="mono journal-project__kicker">Project / 项目</span>
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
                      查看项目 <span aria-hidden="true">↗</span>
                    </Link>
                  ) : null}
                  <button
                    className="journal-project__reset mono"
                    type="button"
                    onClick={() => setFilter('project', '')}
                  >
                    清除筛选
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <div className="journal-page__list">
            {filtered.length ? (
              <JournalList posts={filtered} />
            ) : (
              <p className="journal-page__empty">
                这个筛选下还没有手记，换一个项目或年份看看。
              </p>
            )}
          </div>

          <div className="journal-page__archive">
            <div className="journal-page__archive-head">
              <span className="eyebrow">Archive / 归档</span>
              <span className="mono">By year &amp; tag</span>
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
            <p className="mono">End of index — more notes are being written.</p>
            <Link to="/" className="journal-page__home" data-cursor="Index">
              <span>Back to index</span>
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
