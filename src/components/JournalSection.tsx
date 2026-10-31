import { Link } from 'react-router-dom'
import { posts } from '../data/posts'
import JournalList from './JournalList'
import { useReveal } from '../hooks/useReveal'
import '../styles/components/JournalSection.css'

export default function JournalSection() {
  const latest = posts.slice(0, 4)
  const listRef = useReveal<HTMLDivElement>({ delay: 60 })
  const total = String(posts.length).padStart(2, '0')

  return (
    <section id="journal" className="journal-section theme-paper" data-section="05" data-label="Journal">
      <div className="journal-section__grid" aria-hidden="true" />

      <div className="shell journal-section__inner">
        <header className="journal-section__head">
          <span className="eyebrow">05 / Journal · 手记</span>
          <Link to="/journal" className="journal-section__all mono" data-cursor="Read">
            <span>All entries / {total}</span>
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
              关于工程、产品与设计的零散记录。它们不是结论， 更像是一些被留下来的决策过程——写给同样在意细节的人。
            </p>
            <div className="journal-section__meta mono">
              <span>Essays &amp; build notes</span>
              <span>2026 — ongoing</span>
            </div>
          </div>
        </div>

        <div ref={listRef} className="journal-section__list">
          <JournalList posts={latest} />
        </div>

        <footer className="journal-section__foot">
          <span className="mono">04 / {total} — latest entries</span>
          <Link to="/journal" className="journal-section__more" data-cursor="Read">
            <span>Continue reading</span>
            <span className="journal-section__more-line" aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </section>
  )
}
