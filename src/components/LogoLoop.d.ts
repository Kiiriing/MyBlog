import type { ComponentType, CSSProperties, ReactNode } from 'react'

/* React Bits LogoLoop（src/components/LogoLoop.jsx）的类型声明。
   组件本身保持 1:1 的原样实现（JSX），这里只声明对外 props。 */

export type LogoLoopItem = {
  /** 直接用文字 / 图标节点作为条目，与 src 二选一 */
  node?: ReactNode
  src?: string
  srcSet?: string
  sizes?: string
  width?: number
  height?: number
  alt?: string
  title?: string
  href?: string
  ariaLabel?: string
  hoverColor?: string
}

export type LogoLoopProps = {
  logos: LogoLoopItem[]
  speed?: number
  direction?: 'left' | 'right' | 'up' | 'down'
  width?: string | number
  logoHeight?: number
  gap?: number
  pauseOnHover?: boolean
  hoverSpeed?: number
  fadeOut?: boolean
  fadeOutWidth?: number
  scaleOnHover?: boolean
  layout?: 'line' | 'wave' | 'arc' | 'orbit'
  bend?: number
  focus?: number
  magnify?: number
  tiltX?: number
  tiltY?: number
  step?: boolean
  muted?: number
  labels?: 'none' | 'inline' | 'below' | 'hover'
  draggable?: boolean
  scrollBoost?: number
  intro?: boolean
  renderItem?: (item: LogoLoopItem, key: string) => ReactNode
  ariaLabel?: string
  className?: string
  style?: CSSProperties
}

declare const LogoLoop: ComponentType<LogoLoopProps>

export default LogoLoop
