import '../styles/components/MarqueeBand.css'

const items = [
  'Full-stack Development',
  'Vue / React',
  'TypeScript',
  'Node.js & APIs',
  'PostgreSQL',
  'Performance',
  '全栈开发',
  '动效工程',
  '交互'
]

export default function MarqueeBand() {
  return (
    <div className="marquee theme-paper" aria-hidden="true">
      <div className="marquee__track">
        {[0, 1].map((copy) => (
          <span key={copy} style={{ display: 'contents' }}>
            {items.map((item, i) => (
              <span
                key={`${copy}-${i}`}
                className={`marquee__item${/[\u4e00-\u9fa5]/.test(item) ? ' is-cn' : ''}`}
              >
                <span>{item}</span>
                <i className="marquee__star">✦</i>
              </span>
            ))}
          </span>
        ))}
      </div>
      <span className="marquee__label mono">Capabilities / 能力</span>
    </div>
  )
}
