import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { prefersReducedMotion } from '../composables/useSmoothScroll'
import '../styles/components/RouteWipe.css'

export type RouteWipeHandle = {
  play: (label?: string, meta?: string) => void
}

type Run = { id: number; label: string; meta: string }

/* 路由转场：一整块幕布自下而上盖住旧页面，再向上抽走，露出新页面。

   全部交给 CSS 动画（transform / opacity）而不是 GSAP 逐帧写样式：
   路由切换时新页面会在幕布后面挂载（React 卸载 + 挂载、图片解码、
   ScrollTrigger.refresh），主线程会有一次明显停顿。CSS 动画跑在合成线程上，
   停顿期间幕布与大字仍然按 60fps 前进，不会再「卡住再突然跳一下」。
   每次 play 递增 id 并换 key，整棵子树重挂载，动画从头开始，无需强制回流。 */

const RouteWipe = forwardRef<RouteWipeHandle>(function RouteWipe(_, ref) {
  const [run, setRun] = useState<Run | null>(null)
  const id = useRef(0)
  const endTimer = useRef(0)

  useImperativeHandle(
    ref,
    () => ({
      play(nextLabel?: string, nextMeta?: string) {
        if (prefersReducedMotion()) return

        window.clearTimeout(endTimer.current)
        id.current += 1
        setRun({
          id: id.current,
          label: nextLabel || 'Index',
          meta: nextMeta || '/'
        })
        /* 动画总长 1.62s，结束后整块卸掉，避免常驻一层全屏 fixed 图层 */
        endTimer.current = window.setTimeout(() => setRun(null), 1720)
      }
    }),
    []
  )

  useEffect(() => () => window.clearTimeout(endTimer.current), [])

  if (!run) return null

  return (
    <div key={run.id} className="route-wipe" aria-hidden="true">
      <div className="route-wipe__panel">
        <div className="route-wipe__texture" />
        <span className="route-wipe__mark" aria-hidden="true">
          ↗
        </span>

        <div className="shell route-wipe__inner">
          <div className="route-wipe__top mono">
            <span>LU YU — Route transition</span>
            <span>2024 / 2026</span>
          </div>

          <div className="route-wipe__center">
            <span className="route-wipe__eyebrow mono">Now entering</span>
            <span className="route-wipe__line route-wipe__line--label">
              <span className="route-wipe__label">{run.label}</span>
            </span>
            <span className="route-wipe__line route-wipe__line--meta">
              <span className="route-wipe__sub mono">{run.meta}</span>
            </span>
          </div>

          <div className="route-wipe__bottom mono">
            <span>Please wait a moment</span>
            <span>Selected work &amp; notes</span>
          </div>
        </div>
      </div>
    </div>
  )
})

export default RouteWipe
