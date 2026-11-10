import { useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react'
import '../styles/components/CodeSlots.css'

type CodeSlotsProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  /** idle 默认；checking 校验中；valid / invalid 是自动校验结果 */
  status?: 'idle' | 'checking' | 'valid' | 'invalid'
  disabled?: boolean
  ariaLabel?: string
}

/**
 * 验证码输入槽：逐位填入、带回弹落地动画与闪烁光标。
 * 参考 reactbits 的 CodeSlots，去掉动画库依赖，用 CSS 动画实现。
 */
export default function CodeSlots({
  value,
  onChange,
  length = 6,
  status = 'idle',
  disabled = false,
  ariaLabel = '邮箱验证码'
}: CodeSlotsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  const digits = value.replace(/\D/g, '').slice(0, length)
  const slots = Array.from({ length }, (_, i) => digits[i] ?? '')
  const active = Math.min(digits.length, length - 1)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value.replace(/\D/g, '')
    if (!typed) return
    onChange((digits + typed).slice(0, length))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      onChange(digits.slice(0, -1))
    } else if (event.key === 'Delete') {
      event.preventDefault()
      onChange('')
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Tab') {
      return
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (pasted) onChange((digits + pasted).slice(0, length))
  }

  return (
    <div
      className="code-slots"
      data-status={status === 'idle' ? undefined : status}
      data-disabled={disabled || undefined}
    >
      <div className="code-slots__row" onMouseDown={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          className="code-slots__input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={ariaLabel}
          value=""
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {slots.map((char, i) => (
          <span
            key={i}
            className="code-slots__slot"
            data-filled={char ? '' : undefined}
            data-active={focused && i === active ? '' : undefined}
          >
            {char ? (
              <span key={`${i}-${char}`} className="code-slots__digit">
                {char}
              </span>
            ) : null}
            {focused && i === active && !char ? (
              <span className="code-slots__caret" aria-hidden="true" />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  )
}
