import { useEffect, useRef, useState } from 'react'

/* 视口之外的 WebGL / three 组件（悬挂吊牌、照片隧道）一旦挂载，就会在同一个
   commit 里同步建上下文、编译着色器、上传贴图，主线程会被占住上百毫秒。
   从别的页面返回首页时，这些开销全部堆在幕布揭开前后，表现就是页面卡顿。
   所以让它们等容器接近视口后再挂载：首屏只初始化真正看得到的那几层。 */
export function useNearViewport<T extends HTMLElement = HTMLDivElement>(rootMargin = '600px') {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    if (near) return
    const el = ref.current
    if (!el) return

    if (!('IntersectionObserver' in window)) {
      setNear(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [near, rootMargin])

  return [ref, near] as const
}
