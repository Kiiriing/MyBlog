import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PostComment } from '../../lib/api'
import { itemAt, PAGE_SIZE, type SortMode } from './useCommentFeed'

/** 还没测量过高度的评论先按这个值占位，渲染出来后会换成真实高度 */
export const ROW_ESTIMATE = 220

/** 视口上下各多渲染 0.75 屏，滚动时不会露出空白，也不至于挂太多 DOM */
const OVERSCAN_RATIO = 0.75

type CommentRange = { start: number; end: number }

/** 在有序的偏移数组里找 value 落在哪一条评论上 */
function locate(offsets: number[], value: number, total: number) {
  let low = 0
  let high = total
  while (low < high) {
    const mid = (low + high) >> 1
    if (offsets[mid + 1] <= value) low = mid + 1
    else high = mid
  }
  return Math.min(low, Math.max(0, total - 1))
}

/**
 * 一级评论的虚拟滚动：高度测量、偏移量计算、按视口维护渲染区间与滚动监听。
 * OVERSCAN_RATIO / ROW_ESTIMATE 的取值与公式与拆分前保持一致。
 */
export function useVirtualComments({
  slug,
  sort,
  pages,
  rootTotal
}: {
  slug: string
  sort: SortMode
  pages: Map<number, PostComment[]>
  rootTotal: number
}) {
  const [range, setRange] = useState<CommentRange>({ start: 0, end: PAGE_SIZE - 1 })
  /* 高度测量完成后自增，用来重算各条评论的偏移量 */
  const [measureRev, setMeasureRev] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const heights = useRef(new Map<string, number>())
  const offsetsRef = useRef<number[]>([0])
  const measureFrame = useRef(0)

  /* 一行的高度变了就重算偏移，同一帧内的多次测量合并成一次渲染 */
  const handleMeasure = useCallback((id: string, height: number) => {
    if (!height) return
    const prev = heights.current.get(id)
    if (prev !== undefined && Math.abs(prev - height) < 1) return
    heights.current.set(id, height)
    if (measureFrame.current) return
    measureFrame.current = requestAnimationFrame(() => {
      measureFrame.current = 0
      setMeasureRev((value) => value + 1)
    })
  }, [])

  /* 每条一级评论的上下偏移：测量过的用真实高度，没测量过的用估算值 */
  const offsets = useMemo(() => {
    const list = new Array<number>(rootTotal + 1)
    list[0] = 0
    for (let index = 0; index < rootTotal; index += 1) {
      const comment = itemAt(pages, index)
      const measured = comment ? heights.current.get(comment.id) : undefined
      list[index + 1] = list[index] + (measured ?? ROW_ESTIMATE)
    }
    return list
    // measureRev 变化代表高度变了，需要重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, rootTotal, measureRev])

  offsetsRef.current = offsets

  /* 切换排序 / 文章时丢掉旧高度，渲染窗口回到首屏 */
  useEffect(() => {
    heights.current.clear()
    setRange({ start: 0, end: PAGE_SIZE - 1 })
  }, [slug, sort])

  /* 滚动时按视口算出要渲染的区间，只有这一段评论会挂到 DOM 上 */
  useEffect(() => {
    if (!rootTotal) return
    let frame = 0
    const update = () => {
      frame = 0
      const box = listRef.current
      const list = offsetsRef.current
      if (!box || list.length < 2) return
      const rect = box.getBoundingClientRect()
      const viewTop = -rect.top
      const pad = window.innerHeight * OVERSCAN_RATIO
      const start = locate(list, viewTop - pad, rootTotal)
      const end = locate(list, viewTop + window.innerHeight + pad, rootTotal)
      setRange((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end }
      )
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootTotal, offsets])

  useEffect(
    () => () => {
      if (measureFrame.current) cancelAnimationFrame(measureFrame.current)
    },
    []
  )

  return { listRef, range, setRange, offsets, offsetsRef, handleMeasure }
}
