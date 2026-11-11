import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { changelog } from '../data/changelog'
import SiteFooter from '../components/SiteFooter'
import '../styles/components/UpdatesView.css'

/** 版本层级：只影响时间线圆点的样式，不改内容 */
function levelOf(version: string) {
  const [, minor, patch] = version.replace(/^v/, '').split('.').map(Number)
  if (patch) return 'patch'
  if (minor) return 'minor'
  return 'major'
}

/** 把文案里的 `xxx` 渲染成行内代码 */
function renderText(text: string) {
  return text.split('`').map((part, i) =>
    i % 2 === 1 ? <code key={i}>{part}</code> : part
  )
}

export default function UpdatesView() {
  useEffect(() => {
    document.title = '更新记录 Changelog — 陆屿 LU YU'
  }, [])

  const total = String(changelog.length).padStart(2, '0')
  const latest = changelog[0]

  return (
    <div className="updates-page theme-paper">
      <div className="updates-page__grid" aria-hidden="true" />

      <header className="updates-page__head">
        <div className="shell">
          <div className="updates-page__meta">
            <span className="eyebrow">Changelog / 更新</span>
            <span className="mono updates-page__meta-note">{total} milestones · 2026</span>
          </div>

          <h1 className="updates-page__title">
            <span>Shipping,</span>
            <em>one release at a time.</em>
          </h1>

          <div className="updates-page__intro">
            <p>
              从第一行代码到现在，每一次修复、重构和深夜的调整都记在这里。
              按时间倒序排列，最近的一次在最上面。
            </p>
            <div className="updates-page__index mono">
              <span>Latest {latest.version}</span>
              <span>{latest.date}</span>
              <span>Beijing</span>
            </div>
          </div>
        </div>
      </header>

      <main className="updates-page__body">
        <div className="shell">
          <ol className="timeline">
            {changelog.map((entry, i) => (
              <li
                key={entry.version}
                id={entry.version}
                className={`timeline__item timeline__item--${levelOf(entry.version)}`}
                style={{ '--i': Math.min(i, 6) } as CSSProperties}
              >
                <span className="timeline__dot" aria-hidden="true" />

                <div className="timeline__meta">
                  <span className="timeline__version mono">{entry.version}</span>
                  {i === 0 ? <span className="timeline__latest mono">Latest</span> : null}
                  <time className="timeline__date mono" dateTime={entry.dateTime}>
                    {entry.date}
                  </time>
                </div>

                <h2 className="timeline__title">{entry.title}</h2>

                <ul className="timeline__list">
                  {entry.items.map((item) => (
                    <li key={item}>{renderText(item)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <div className="updates-page__foot">
            <p className="mono">End of log — 共 {changelog.length} 个里程碑。</p>
            <Link to="/" className="updates-page__home" data-cursor="Index">
              <span>Back to index</span>
              <span aria-hidden="true">↖</span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
