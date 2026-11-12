import { Link, useParams } from 'react-router-dom'
import { getAllTags, getPostsByTag } from '../data/posts'
import JournalList from '../components/JournalList'
import SiteFooter from '../components/SiteFooter'
import ChapterNext from '../components/ChapterNext'
import Seo from '../components/Seo'
import '../styles/components/JournalView.css'

export default function JournalTagView() {
  const { tag = '' } = useParams()
  const decoded = decodeURIComponent(tag)
  const items = getPostsByTag(decoded)
  const tags = getAllTags()

  return (
    <div className="journal-page theme-paper">
      <Seo
        title={`#${decoded} · 手记 — 陆屿 LU YU`}
        path={`/journal/tag/${encodeURIComponent(decoded)}`}
        description={`陆屿手记中带有 #${decoded} 标签的文章，共 ${items.length} 篇。`}
      />
      <div className="journal-page__grid" aria-hidden="true" />

      <header className="journal-page__head">
        <div className="shell">
          <div className="tag-page__top">
            <Link to="/journal" className="post-back mono" data-cursor="Back">
              <span aria-hidden="true">←</span>
              <span>Journal / 手记</span>
            </Link>
            <span className="mono tag-page__count">
              {String(items.length).padStart(2, '0')} entries
            </span>
          </div>

          <span className="eyebrow tag-page__eyebrow">Tag / 标签</span>
          <h1 className="tag-page__title">#{decoded}</h1>
          <p className="tag-page__intro">
            所有带着这个标签的手记。标签会随着写作慢慢长出来，没有提前规划。
          </p>

          <div className="tag-page__cloud">
            {tags.map(({ tag: item, count }) => (
              <Link
                key={item}
                to={`/journal/tag/${encodeURIComponent(item)}`}
                className={`mono${item === decoded ? ' is-active' : ''}`}
              >
                #{item}
                <span>{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="journal-page__body">
        <div className="shell">
          <div className="journal-page__list">
            {items.length ? (
              <JournalList posts={items} />
            ) : (
              <p className="journal-page__empty">这个标签下还没有手记。</p>
            )}
          </div>

          <div className="journal-page__foot">
            <p className="mono">Tag index — {decoded}</p>
            <Link to="/journal" className="journal-page__home" data-cursor="Index">
              <span>Back to journal</span>
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
