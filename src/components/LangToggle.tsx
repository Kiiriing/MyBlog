import { toggleLang, useI18n } from '../store/i18n'
import WarmTooltip from './WarmTooltip'
import '../styles/components/LangToggle.css'

/* 语言切换：按钮上始终显示「将要切换到的语言」——
   中文界面显示 EN，英文界面显示 中，一眼就能分清当前点下去会得到什么。 */
export default function LangToggle() {
  const { lang } = useI18n()
  const toEnglish = lang === 'zh'
  const glyph = toEnglish ? 'EN' : '中'
  const label = toEnglish ? 'Switch to English' : '切换到中文'

  return (
    <WarmTooltip content={toEnglish ? '切换到英文 / English' : '切换到中文 / 中文'} side="bottom">
      <button
        className="lang-btn"
        type="button"
        aria-label={label}
        title={label}
        lang={toEnglish ? 'en' : 'zh-CN'}
        onClick={toggleLang}
      >
        <svg className="lang-btn__globe" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M3.8 12h16.4M12 3.8c2.1 2.3 3.2 5 3.2 8.2s-1.1 5.9-3.2 8.2c-2.1-2.3-3.2-5-3.2-8.2S9.9 6.1 12 3.8Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        <span className="lang-btn__glyph">{glyph}</span>
      </button>
    </WarmTooltip>
  )
}
