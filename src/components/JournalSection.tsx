import { Link } from 'react-router-dom'
import { posts } from '../data/posts'
import JournalList from './JournalList'
import { useReveal } from '../hooks/useReveal'
import { useI18n } from '../store/i18n'
import '../styles/components/JournalSection.css'

export default function JournalSection() {
  const { t } = useI18n()
  const latest = posts.slice(0, 4)
  const listRef = useReveal<HTMLDivElement>({ delay: 60 })
  const total = String(posts.length).padStart(2, '0')

  return (
    <section id="journal" className="journal-section theme-paper" data-section="07" data-label="Journal">
      <div className="journal-section__grid" aria-hidden="true" />

      <div className="shell journal-section__inner">
        <header className="journal-section__head">
          <span className="eyebrow">07 / Journal · {t('手记', 'Journal')}</span>
          <Link to="/journal" className="journal-section__all mono" data-cursor="Read">
            <span>{t('全部手记', 'All entries')} / {total}</span>
            <span className="journal-section__all-icon" aria-hidden="true">
              ↗
            </span>
          </Link>
        </header>

        <div className="journal-section__intro">
          <h2 className="journal-section__title">
            <span>Notes on</span>
            <em>building.</em>
          </h2>

          <div className="journal-section__lede">
            <p>
              {t(
                '从幂等订单、签到反作弊，到大屏指标口径与一次前端迁移——都是真实项目里留下来的判断。 写给同样在意细节的人。',
                'From idempotent orders and attendance anti-cheat to data-wall metric definitions and a front-end migration — judgements left behind by real projects, written for people who care about details.'
              )}
            </p>
            <div className="journal-section__meta mono">
              <span>{t('随笔与构建笔记', 'Essays & build notes')}</span>
              <span>2026 — ongoing</span>
            </div>
          </div>
        </div>

        <div ref={listRef} className="journal-section__list">
          <JournalList posts={latest} />
        </div>

        <footer className="journal-section__foot">
          <span className="mono">04 / {total} — {t('最新手记', 'latest entries')}</span>
          <Link to="/journal" className="journal-section__more" data-cursor="Read">
            <span>{t('继续阅读', 'Continue reading')}</span>
            <span className="journal-section__more-line" aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </section>
  )
}
