import { Link } from 'react-router-dom'
import { chapters } from '../data/chapters'
import { useReveal } from '../hooks/useReveal'
import '../styles/components/ChapterNext.css'

type ChapterNextProps = {
  /** 下一章的编号；子页面用它把故事继续下去 */
  index: string
  className?: string
}

/* 「下一章」：每页结尾的一次翻页。
   悬停时整块反相（深色底 → 米色底），像把书翻过去一页。 */
export default function ChapterNext({ index, className }: ChapterNextProps) {
  const chapter = chapters.find((item) => item.index === index) || chapters[chapters.length - 1]
  const ref = useReveal<HTMLElement>({ y: 30 })

  return (
    <section
      ref={ref}
      className={`chapter-next${className ? ` ${className}` : ''}`}
      aria-label={`下一章：${chapter.label}`}
    >
      <Link to={chapter.path} className="chapter-next__link" data-cursor="Next">
        <span className="chapter-next__ghost" aria-hidden="true">
          {chapter.label}
        </span>

        <div className="chapter-next__inner shell">
          <div className="chapter-next__head mono">
            <span>Next chapter / 下一章</span>
            <span>
              {chapter.act} · {chapter.actName} {chapter.actCn}
            </span>
          </div>

          <div className="chapter-next__main">
            <span className="chapter-next__no">{chapter.index}</span>
            <h2 className="chapter-next__title">
              <span>{chapter.label}</span>
              <em>{chapter.cn}</em>
            </h2>
          </div>

          <div className="chapter-next__foot">
            <p className="chapter-next__caption">
              {chapter.caption}
              <span>{chapter.captionCn}</span>
            </p>
            <span className="chapter-next__arrow" aria-hidden="true">
              ↗
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}
