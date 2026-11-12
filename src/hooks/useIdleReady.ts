import { useEffect, useState } from 'react'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

/* 挂载 three 场景是一次同步的重活：建 WebGL 上下文、编译着色器、上传贴图，
   主线程会被占住上百毫秒。即使等到接近视口才挂载，IntersectionObserver
   触发的那一刻通常正好在滚动中，这笔开销照样会顶掉一帧，看起来就是卡顿。
   所以再等一次浏览器空闲：滚动停下后再真正创建，滚动路径上没有长任务。 */
export function useIdleReady(active: boolean, timeout = 600) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active || ready) return

    const idleWindow = window as IdleWindow
    let lastScroll = 0
    const onScroll = () => {
      lastScroll = performance.now()
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    if (!idleWindow.requestIdleCallback) {
      const timer = window.setTimeout(() => setReady(true), 120)
      return () => {
        window.clearTimeout(timer)
        window.removeEventListener('scroll', onScroll)
      }
    }

    let handle = 0
    const schedule = () => {
      handle = idleWindow.requestIdleCallback!(() => {
        /* 空闲回调也可能落在滚动途中（rAF 密集时仍有空档），
           这时继续等下一次空闲，保证滚动路径上不出现上百毫秒的长任务 */
        if (performance.now() - lastScroll < 220) {
          schedule()
          return
        }
        setReady(true)
      }, { timeout })
    }
    schedule()

    return () => {
      window.removeEventListener('scroll', onScroll)
      idleWindow.cancelIdleCallback?.(handle)
    }
  }, [active, ready, timeout])

  return active && ready
}
