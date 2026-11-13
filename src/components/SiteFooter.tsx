import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from '../lib/gsap'
import { scrollTo, prefersReducedMotion } from '../composables/useSmoothScroll'
import { useClock } from '../hooks/useClock'
import { site } from '../data/site'
import { findBannedWord } from '../data/moderation'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import CircleButton from './CircleButton'
import '../styles/components/SiteFooter.css'

/** 记录“今天已用完反馈额度”，按北京时间切日，跨天自动恢复 */
const FEEDBACK_LIMIT_KEY = 'luyu.feedback.limited'

function todayStamp() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
}

function hasHitDailyLimit() {
  try {
    return window.localStorage.getItem(FEEDBACK_LIMIT_KEY) === todayStamp()
  } catch {
    return false
  }
}

export default function SiteFooter() {
  const clock = useClock()
  const auth = useAuth()
  const { t } = useI18n()
  const footer = useRef<HTMLElement>(null)
  const glow = useRef<HTMLDivElement>(null)
  const quick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null)

  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  /* 当天额度用完后锁定表单，刷新页面也保持锁定，北京时间零点自动解除 */
  const [limited, setLimited] = useState(hasHitDailyLimit)
  const resetTimer = useRef(0)

  const locked = !auth.user || sending || limited

  const status = error
    ? error
    : limited
      ? sent
        ? t(
            '已收到反馈 — 今天的 3 条已经发完，明天再来吧。',
            'Feedback received — that’s all 3 for today. See you tomorrow.'
          )
        : t('今天的 3 条反馈已经发完了，明天再来吧。', 'That’s all for today — up to 3 messages per day.')
      : !auth.user
        ? t('登录后可以提交反馈与建议。', 'Sign in to send feedback and suggestions.')
        : sent
          ? t('已收到反馈 — 回复会出现在站内信里。', 'Feedback received — replies arrive in your inbox.')
          : t(
              '关于站点或项目的想法都可以写在这里，每天最多 3 条 · Enter 发送，Shift + Enter 换行。',
              'Anything about the site or the projects. Up to 3 messages per day · Enter to send, Shift + Enter for a new line.'
            )

  useEffect(() => {
    if (!footer.current || !glow.current) return
    if (prefersReducedMotion()) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const x = gsap.quickTo(glow.current, 'x', { duration: 0.9, ease: 'power3.out' })
    const y = gsap.quickTo(glow.current, 'y', { duration: 0.9, ease: 'power3.out' })
    quick.current = { x, y }

    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current)
      gsap.killTweensOf(glow.current)
      quick.current = null
    }
  }, [])

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const q = quick.current
    if (!q || !footer.current) return
    const rect = footer.current.getBoundingClientRect()
    q.x((event.clientX - rect.left - rect.width / 2) * 0.42)
    q.y((event.clientY - rect.top - rect.height / 2) * 0.42)
  }

  function onPointerLeave() {
    quick.current?.x(0)
    quick.current?.y(0)
  }

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault()
    if (!auth.user || sending || limited) return
    if (resetTimer.current) window.clearTimeout(resetTimer.current)

    const value = content.trim()

    if (value.length < 2) {
      setSent(false)
      setError(t('再多写一点吧，至少 2 个字。', 'A little more, please — at least 2 characters.'))
      return
    }

    if (findBannedWord(value)) {
      setSent(false)
      setError(t('内容里包含不合适的词汇，请修改后再提交。', 'The content contains inappropriate language. Please revise it.'))
      return
    }

    setError('')
    setSending(true)
    try {
      const result = await api.submitFeedback(value)
      setSent(true)
      setContent('')
      resetTimer.current = window.setTimeout(() => setSent(false), 5600)
      /* 服务端回传当天剩余条数，用完后直接锁定，避免再发请求拿到 429 */
      if (result.remaining <= 0) {
        setLimited(true)
        try {
          window.localStorage.setItem(FEEDBACK_LIMIT_KEY, todayStamp())
        } catch {
          /* 隐私模式下写入失败也不影响本次锁定 */
        }
      }
    } catch (err) {
      setSent(false)
      if (err instanceof ApiError && err.status === 429) {
        setLimited(true)
        try {
          window.localStorage.setItem(FEEDBACK_LIMIT_KEY, todayStamp())
        } catch {
          /* 隐私模式下写入失败也不影响本次锁定 */
        }
      }
      setError(
        err instanceof ApiError
          ? err.message
          : t('提交失败，请稍后再试。', 'Could not send. Please try again later.')
      )
    } finally {
      setSending(false)
    }
  }

  /** Enter 发送，Shift + Enter 换行；输入法组字中的回车不触发提交 */
  function onFeedbackKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  function backToTop() {
    scrollTo(0, { duration: 1.25 })
  }

  return (
    <footer
      id="contact"
      ref={footer}
      className="site-footer"
      data-section="08"
      data-label="Contact"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div ref={glow} className="site-footer__glow" aria-hidden="true" />
      <div className="site-footer__grid-lines" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="shell site-footer__inner">
        <header className="site-footer__head">
          <span className="eyebrow">{t('08 / Contact · 联系', '08 / Contact · 联系')}</span>
          <span className="site-footer__status mono">
            <span className="dot" />
            {t('2026 开放实习与全栈岗位', site.availability)}
          </span>
        </header>

        <div className="site-footer__hero">
          <h2 className="site-footer__title">
            <span className="site-footer__line">Let’s make</span>
            <span className="site-footer__line site-footer__line--indent">
              <em>it work, beautifully.</em>
            </span>
          </h2>

          <div className="site-footer__hero-side">
            <p className="site-footer__cn">
              {t(
                '如果你有一个想认真做的产品，或者需要有人把前后端 一起推进，欢迎写信给我。',
                'If you have a product worth building carefully, or need someone to move the front end and back end forward together, write to me.'
              )}
            </p>
            <span className="site-footer__reply mono">
              {t('通常 48 小时内回复', 'Usually replies within 48 hours')}
            </span>
          </div>
        </div>

        <a className="site-footer__email" href={`mailto:${site.email}`} data-cursor="Write">
          <span className="site-footer__email-text">{site.email}</span>
          <span className="site-footer__email-arrow" aria-hidden="true">
            ↗
          </span>
        </a>

        <div className="site-footer__columns">
          <div className="site-footer__col site-footer__col--feedback">
            <div className="site-footer__label-row">
              <span className="site-footer__label mono">
                {t('Feedback / 用户反馈', 'Feedback / 用户反馈')}
              </span>
              {auth.user ? (
                <span className="site-footer__who mono">{auth.user.displayName}</span>
              ) : (
                <Link to="/login" className="site-footer__login mono" data-cursor="Sign in">
                  {t('登录', 'Sign in')} <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>

            <form className="site-footer__form" noValidate onSubmit={submitFeedback}>
              <label className="sr-only" htmlFor="feedback-content">
                {t('反馈内容', 'Feedback content')}
              </label>
              <div className="field site-footer__field site-footer__field--area">
                <textarea
                  id="feedback-content"
                  name="feedback"
                  rows={3}
                  maxLength={1000}
                  placeholder={
                    auth.user
                      ? t('写下你的建议…', 'Write your suggestion…')
                      : t('登录后即可提交反馈', 'Sign in to send feedback')
                  }
                  aria-invalid={!!error}
                  aria-describedby="feedback-status"
                  value={content}
                  disabled={locked}
                  onKeyDown={onFeedbackKeyDown}
                  onChange={(event) => {
                    setContent(event.target.value)
                    setError('')
                  }}
                />
                <button
                  className="site-footer__submit"
                  type="submit"
                  aria-label={t('发送反馈', 'Send feedback')}
                  data-cursor="Send"
                  disabled={locked}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </button>
              </div>
              <p
                id="feedback-status"
                className={[
                  'site-footer__form-note mono',
                  error ? 'is-error' : '',
                  sent ? 'is-ok' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-live="polite"
              >
                {status}
              </p>
            </form>
          </div>

          <div className="site-footer__col">
            <span className="site-footer__label mono">{t('Elsewhere / 别处', 'Elsewhere / 别处')}</span>
            <ul className="site-footer__socials">
              {site.socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    className="site-footer__social"
                    target="_blank"
                    rel="noreferrer"
                    data-cursor={social.label}
                  >
                    <span>{social.label}</span>
                    <span className="site-footer__social-handle">{social.handle}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__col site-footer__col--clock">
            <span className="site-footer__label mono">
              {t('Local time / 此刻', 'Local time / 此刻')}
            </span>
            <p className="site-footer__clock">{clock}</p>
            <div className="site-footer__place mono">
              <span>{site.location}</span>
              <span>{site.coords}</span>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p className="mono">© 2026 LU YU — {t('所有系统运行正常', 'All systems operational')}</p>
          <p className="mono site-footer__built">
            {t('由 React、GSAP 与 Vite 设计并编写', 'Designed & coded with React, GSAP & Vite')}
          </p>
          <CircleButton
            label={t('回到顶部', 'Back to top')}
            direction="up"
            size={52}
            cursor="Top"
            className="site-footer__top"
            onClick={backToTop}
          />
        </div>
      </div>
    </footer>
  )
}
