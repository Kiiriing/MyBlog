import { chapters } from '../data/chapters'
import { useReveal } from '../hooks/useReveal'
import '../styles/components/ChapterTag.css'

type ChapterTagProps = {
  /** 章节编号，取自 data/chapters 的 index */
  index: string
  /** 右侧补充信息，例如年份或条目数 */
  meta?: string
  className?: string
}

/* 子页面顶部的一枚「章节标签」：把当前页面放回全站三幕叙事里。
   数据与首页的章节脊柱、幕间页共用同一份 chapters。 */
export default function ChapterTag({ index, meta, className }: ChapterTagProps) {
  const chapter = chapters.find((item) => item.index === index) || chapters[0]
  const total = String(chapters.length).padStart(2, '0')
  const ref = useReveal<HTMLDivElement>({ y: 18 })

  return (
    <div ref={ref} className={`chapter-tag${className ? ` ${className}` : ''}`}>
      <div className="chapter-tag__row">
        <span className="chapter-tag__no">{chapter.index}</span>
        <span className="chapter-tag__total mono">/ {total}</span>
        <span className="chapter-tag__act mono">
          {chapter.act} · {chapter.actName}
          <b>{chapter.actCn}</b>
        </span>
        <span className="chapter-tag__line" aria-hidden="true" />
        <span className="chapter-tag__label mono">
          {chapter.label} / {chapter.cn}
        </span>
        {meta ? <span className="chapter-tag__meta mono">{meta}</span> : null}
      </div>

      <p className="chapter-tag__caption">
        <span className="chapter-tag__en">{chapter.caption}</span>
        <span className="chapter-tag__cn mono">{chapter.captionCn}</span>
      </p>
    </div>
  )
}
