import { Link, useParams } from 'react-router-dom'
import { getAllTags, getPostsByTag } from '../data/posts'
import { useI18n } from '../store/i18n'
import JournalList from '../components/JournalList'
import SiteFooter from '../components/SiteFooter'
import Seo from '../components/Seo'
import '../styles/components/JournalView.css'

export default function JournalTagView() {
  const { tag = '' } = useParams()
  const { t } = useI18n()
  const decoded = decodeURIComponent(tag)
  const items = getPostsByTag(decoded)
  const tags = getAllTags()

  return (
    <div className="journal-page theme-paper">
      <Seo
        title={`#${decoded} · ${t('手记', 'Journal')} — LU YU`}
        path={`/journal/tag/${encodeURIComponent(decoded)}`}
        description={t(
          `陆屿手记中带有 #${decoded} 标签的文章，共 ${items.length} 篇。`,
          `Journal posts tagged #${decoded} — ${items.length} in total.`
        )}
      />
      <div className="journal-page__grid" aria-hidden="true" />

      <header className="journal-page__head">
        <div className="shell">
          <div className="tag-page__top">
            <Link to="/journal" className="post-back mono" data-cursor="Back">
              <span aria-hidden="true">←</span>
              <span>Journal / {t('手记', 'Journal')}</span>
            </Link>
            <span className="mono tag-page__count">
              {String(items.length).padStart(2, '0')} entries
            </span>
          </div>

          <span className="eyebrow tag-page__eyebrow">Tag / {t('标签', 'Tag')}</span>
          <h1 className="tag-page__title">#{decoded}</h1>
          <p className="tag-page__intro">
            {t(
              '所有带着这个标签的手记。标签会随着写作慢慢长出来，没有提前规划。',
              'Every note carrying this tag. Tags grow as the writing goes on, never planned in advance.'
            )}
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
              <p className="journal-page__empty">
                {t('这个标签下还没有手记。', 'No notes under this tag yet.')}
              </p>
            )}
          </div>

          <div className="journal-page__foot">
            <p className="mono">Tag index — {decoded}</p>
            <Link to="/journal" className="journal-page__home" data-cursor="Index">
              <span>{t('返回手记', 'Back to journal')}</span>
              <span aria-hidden="true">↖</span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
