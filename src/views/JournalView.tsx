import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, posts } from '../data/posts'
import JournalList from '../components/JournalList'
import SiteFooter from '../components/SiteFooter'
import ChapterTag from '../components/ChapterTag'
import ChapterNext from '../components/ChapterNext'
import '../styles/components/JournalView.css'

export default function JournalView() {
  const [active, setActive] = useState('全部')

  useEffect(() => {
    document.title = '手记 Journal — 陆屿 LU YU'
  }, [])

  const filtered = active === '全部' ? posts : posts.filter((post) => post.category === active)
  const total = String(posts.length).padStart(2, '0')

  return (
    <div className="journal-page theme-paper">
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
              <span>2026 — ongoing</span>
              <span>Beijing</span>
            </div>
          </div>
        </div>
      </header>

      <main className="journal-page__body">
        <div className="shell">
          <div className="journal-page__filters">
            <span className="mono journal-page__filter-label">Filter / 筛选</span>
            <div className="journal-page__filter-group" role="group" aria-label="按分类筛选文章">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`journal-page__filter${active === category ? ' is-active' : ''}`}
                  type="button"
                  aria-pressed={active === category}
                  onClick={() => setActive(category)}
                >
                  <span>{category}</span>
                  <span className="journal-page__filter-count">
                    {category === '全部'
                      ? posts.length
                      : posts.filter((post) => post.category === category).length}
                  </span>
                </button>
              ))}
            </div>
            <span className="mono journal-page__result" aria-live="polite">
              {String(filtered.length).padStart(2, '0')} shown
            </span>
          </div>

          <div className="journal-page__list">
            <JournalList posts={filtered} />
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
