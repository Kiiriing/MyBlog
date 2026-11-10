import { useEffect, useState } from 'react'
import '../styles/components/StatusMark.css'

type StatusMarkProps = {
  label: string
  /** 完成态：打勾并划掉文字；默认 done */
  status?: 'pending' | 'done'
  size?: number
  className?: string
}

/**
 * 状态标记：打勾 + 划掉文字，用于「已通过人机验证」这类一次性提示。
 * 首帧先渲染 pending，下一帧再切到 done，勾与划线才有过渡动画。
 */
export default function StatusMark({
  label,
  status = 'done',
  size = 20,
  className = ''
}: StatusMarkProps) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <span
      className={`status-mark${className ? ` ${className}` : ''}`}
      data-status={entered ? status : 'pending'}
    >
      <svg
        className="status-mark__glyph"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role="img"
        aria-label={label}
      >
        <circle className="status-mark__track" cx="12" cy="12" r="9" />
        <path className="status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" pathLength={1} />
      </svg>
      <span className="status-mark__label" aria-hidden="true">
        {label}
        <span className="status-mark__strike" />
      </span>
    </span>
  )
}
