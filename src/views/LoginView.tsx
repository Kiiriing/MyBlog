import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError, type CodeScene } from '../lib/api'
import { signIn, signOut, useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import { refreshNotifications } from '../store/notifications'
import CodeSlots from '../components/CodeSlots'
import RubberSegment, { type SegmentItem } from '../components/RubberSegment'
import StatusMark from '../components/StatusMark'
import Seo from '../components/Seo'
import '../styles/components/LoginView.css'

type Mode = 'login' | 'register' | 'reset'

const MODES: (SegmentItem & { en: string })[] = [
  { value: 'login', label: '登录', en: 'Sign in' },
  { value: 'register', label: '注册', en: 'Register' },
  { value: 'reset', label: '找回密码', en: 'Reset' }
]

const COPY: Record<
  Mode,
  { kicker: string; title: string; emph: string; lead: string; leadEn: string }
> = {
  login: {
    kicker: 'Account / 登录',
    title: 'Sign',
    emph: 'in.',
    lead: '用用户名或邮箱登录，接收站内公告、反馈回执与私信。登录状态保留 3 天，换网络会要求重新登录。',
    leadEn:
      'Sign in with your username or email to receive announcements, feedback replies and direct messages. Sessions last three days; changing networks asks you to verify again.'
  },
  register: {
    kicker: 'Register / 注册',
    title: 'Join',
    emph: 'us.',
    lead: '先取一个用户名，再绑定邮箱。获取验证码前需要完成人机验证，验证码由邮件发送，10 分钟内有效。',
    leadEn:
      'Pick a username, then bind an email. Complete the human check before requesting a code; the code is sent by email and valid for ten minutes.'
  },
  reset: {
    kicker: 'Recovery / 找回密码',
    title: 'Reset',
    emph: 'key.',
    lead: '填写用户名或注册邮箱并完成人机验证，验证码会发送到注册邮箱，验证后即可设置新密码。',
    leadEn:
      'Enter your username or registered email and complete the human check. A code will be sent to the registered email, then you can set a new password.'
  }
}

const STRENGTH_LABEL = ['未设置', '弱', '较弱', '较强', '强']
const STRENGTH_LABEL_EN = ['Not set', 'Weak', 'Fair', 'Strong', 'Very strong']
const USERNAME_PATTERN = /^[\w\u4e00-\u9fa5]{2,20}$/

function messageOf(error: unknown) {
  if (error instanceof ApiError) return error.message
  return '网络异常，请稍后再试。'
}

function sceneOf(mode: Mode): CodeScene {
  return mode === 'register' ? 'REGISTER' : 'RESET_PASSWORD'
}

/** 大写 / 小写 / 数字 / 特殊符号，命中几类就是几分 */
function strengthOf(password: string) {
  let score = 0
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

export default function LoginView() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const { t, lang, isZh } = useI18n()
  const modes = MODES.map((item) => ({
    value: item.value,
    label: isZh ? item.label : item.en
  }))

  /* 登录后回到来源页（只接受站内路径），评论登录门槛会带上 ?next= */
  const nextParam = new URLSearchParams(location.search).get('next')
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  const [mode, setMode] = useState<Mode>('login')
  const [account, setAccount] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  /* 6 位输完自动校验邮箱验证码，格子按结果变绿 / 变红 */
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')

  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  /* 验证码校验通过（邮件发出）后，把人机验证行换成完成态标记 */
  const [captchaPassed, setCaptchaPassed] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const copy = COPY[mode]
  const strength = strengthOf(password)
  const needsCaptcha = mode !== 'login'

  const loadCaptcha = useCallback(async () => {
    try {
      const captcha = await api.captcha()
      setCaptchaId(captcha.id)
      setCaptchaImage(captcha.image)
      setCaptchaCode('')
    } catch (failure) {
      setError(messageOf(failure))
    }
  }, [])

  /* 注册 / 找回密码需要人机验证，切到对应模式时取一张新图 */
  useEffect(() => {
    if (mode === 'login') return
    void loadCaptcha()
  }, [mode, loadCaptcha])

  useEffect(() => {
    document.title = `${copy.kicker.split(' / ')[1]} — 陆屿 LU YU`
  }, [copy.kicker, lang])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  /* 倒计时结束才能重发，届时需要重新做一次人机验证 */
  useEffect(() => {
    if (cooldown === 0) setCaptchaPassed(false)
  }, [cooldown])

  /* 6 位输完即校验邮箱验证码：正确变绿、错误变红，不必等提交 */
  useEffect(() => {
    const target = (mode === 'register' ? email : account).trim()
    if (code.length !== 6 || !target) {
      setCodeStatus('idle')
      return
    }

    let cancelled = false
    setCodeStatus('checking')
    const timer = window.setTimeout(() => {
      api
        .verifyCode({ account: target, scene: sceneOf(mode), code })
        .then(() => {
          if (cancelled) return
          setCodeStatus('valid')
          setError('')
        })
        .catch(() => {
          if (!cancelled) setCodeStatus('invalid')
        })
    }, 240)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [code, mode, email, account])

  function switchMode(next: string) {
    if (next === mode) return
    setMode(next as Mode)
    setError('')
    setNotice('')
    setCode('')
    setPassword('')
    setConfirm('')
    setCaptchaId('')
    setCaptchaImage('')
    setCaptchaCode('')
    setCaptchaPassed(false)
  }

  function goBack() {
    const state = window.history.state as { idx?: number } | null
    if (state && typeof state.idx === 'number' && state.idx > 0) navigate(-1)
    else navigate('/')
  }

  /** 注册用邮箱，找回密码用用户名或邮箱 */
  function codeTarget() {
    return mode === 'register' ? email.trim() : account.trim()
  }

  async function onSendCode() {
    if (sending || cooldown > 0) return
    setError('')
    setNotice('')

    if (!codeTarget()) {
      setError(mode === 'register' ? '请先填写邮箱' : '请先填写用户名或邮箱')
      return
    }
    if (!captchaCode.trim()) {
      setError('请先填写图片验证码')
      return
    }

    setSending(true)
    try {
      const ticket = await api.sendCode({
        account: codeTarget(),
        scene: sceneOf(mode),
        captchaId,
        captchaCode: captchaCode.trim()
      })
      setCooldown(ticket.resendAfterSeconds)
      setCaptchaPassed(true)
      setNotice(
        `验证码已发送至 ${ticket.sentTo}，${Math.round(ticket.expiresInSeconds / 60)} 分钟内有效`
      )
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setSending(false)
      /* 图片验证码一次性，无论成败都换一张 */
      void loadCaptcha()
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setError('')
    setNotice('')

    if (mode === 'login') {
      if (!account.trim()) return setError('请填写用户名或邮箱')
      if (!password) return setError('请填写密码')
    }

    if (mode === 'register') {
      if (!USERNAME_PATTERN.test(username.trim())) {
        return setError('用户名为 2-20 位中英文、数字或下划线')
      }
      if (!email.trim()) return setError('请填写邮箱')
      if (password.length < 8) return setError('密码至少需要 8 位')
      if (strength < 3) {
        return setError('密码强度需要达到「较强」：大写字母、小写字母、数字、特殊符号至少包含三种')
      }
      if (confirm !== password) return setError('两次输入的密码不一致')
      if (code.length !== 6) return setError('请填写 6 位邮箱验证码')
    }

    if (mode === 'reset') {
      if (!account.trim()) return setError('请填写用户名或邮箱')
      if (password.length < 8) return setError('新密码至少需要 8 位')
      if (code.length !== 6) return setError('请填写 6 位邮箱验证码')
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        const result = await api.login(account.trim(), password)
        signIn(result)
        await refreshNotifications()
        navigate(next)
        return
      }

      if (mode === 'register') {
        const result = await api.register({
          username: username.trim(),
          email: email.trim(),
          password,
          code
        })
        signIn(result)
        await refreshNotifications()
        navigate(next)
        return
      }

      await api.resetPassword({ account: account.trim(), code, newPassword: password })
      switchMode('login')
      setNotice('密码已重置，请用新密码登录。')
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setSubmitting(false)
    }
  }

  const signedIn = mode === 'login' && auth.user

  return (
    <div className="login">
      <Seo
        title={`${copy.kicker.split(' / ')[1]} — 陆屿 LU YU`}
        path="/login"
        description={t(
          '登录、注册或找回密码，接收站内公告与反馈回执。',
          'Sign in, register or reset your password to receive announcements and feedback replies.'
        )}
        noindex
      />
      <div className="login__ambient" aria-hidden="true" />
      <div className="login__grid-lines" aria-hidden="true" />

      <button type="button" className="login__back" aria-label={t('返回上一页', 'Go back')} onClick={goBack}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="shell login__inner">
        <div className="login__stage">
          <aside className="login__intro">
            <span className="login__kicker">LU YU — Member access</span>
            <h1 className="login__title">
              {copy.title} <em>{copy.emph}</em>
            </h1>
            <p className="login__text">{isZh ? copy.lead : copy.leadEn}</p>

            <ul className="login__marks">
              <li>
                <span>01</span>{t('3 天免密登录', 'Three-day sessions')}
              </li>
              <li>
                <span>02</span>{t('登录 IP 变化需重新验证', 'Re-verify when the network changes')}
              </li>
              <li>
                <span>03</span>{t('邮件验证码 + 人机校验', 'Email code + human check')}
              </li>
            </ul>
          </aside>

          <section className="login__panel">
            {signedIn ? (
              <div className="login__signed">
                <span className="login__kicker">Signed in / {t('已登录', 'Signed in')}</span>
                <h2 className="login__signed-name">{auth.user?.username}</h2>
                <p className="login__signed-mail">{auth.user?.email}</p>
                <div className="login__signed-actions">
                  <button type="button" className="login__submit" onClick={() => navigate('/')}>
                    <span>{t('回到首页', 'Back to home')}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    type="button"
                    className="login__ghost"
                    onClick={() => {
                      signOut()
                      setNotice(t('已退出登录', 'Signed out'))
                    }}
                  >
                    {t('退出登录', 'Sign out')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <RubberSegment
                  items={modes}
                  value={mode}
                  onChange={switchMode}
                  ariaLabel={t('账号操作', 'Account actions')}
                />

                <div key={mode} className="login__body">
                  <form className="login__form" onSubmit={onSubmit} noValidate>
                    {mode === 'login' ? (
                      <label className="login__field">
                        <span className="login__label">{t('用户名 / 邮箱', 'Username / email')}</span>
                        <input
                          type="text"
                          name="account"
                          value={account}
                          autoComplete="username"
                          spellCheck={false}
                          placeholder={t('yourname 或 you@example.com', 'yourname or you@example.com')}
                          onChange={(event) => setAccount(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {mode === 'register' ? (
                      <div className="login__row">
                        <label className="login__field">
                          <span className="login__label">{t('用户名', 'Username')}</span>
                          <input
                            type="text"
                            name="username"
                            value={username}
                            autoComplete="username"
                            spellCheck={false}
                            placeholder={t('2-20 位中英文数字', '2–20 letters or numbers')}
                            maxLength={20}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                          />
                        </label>

                        <label className="login__field">
                          <span className="login__label">{t('邮箱', 'Email')}</span>
                          <input
                            type="email"
                            name="email"
                            value={email}
                            autoComplete="email"
                            placeholder="you@example.com"
                            onChange={(event) => setEmail(event.target.value)}
                            required
                          />
                        </label>
                      </div>
                    ) : null}

                    {mode === 'reset' ? (
                      <label className="login__field">
                        <span className="login__label">{t('用户名 / 邮箱', 'Username / email')}</span>
                        <input
                          type="text"
                          name="account"
                          value={account}
                          autoComplete="username"
                          spellCheck={false}
                          placeholder={t('yourname 或 you@example.com', 'yourname or you@example.com')}
                          onChange={(event) => setAccount(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {needsCaptcha ? (
                      <div className="login__pair">
                        <div className="login__field">
                          <span className="login__label">{t('人机验证', 'Human check')}</span>
                          {captchaPassed ? (
                            <div className="login__captcha-done">
                              <StatusMark label={t('已通过人机验证', 'Human check passed')} size={18} />
                            </div>
                          ) : (
                            <div className="login__captcha">
                              <input
                                type="text"
                                name="captchaCode"
                                value={captchaCode}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder={t('输入图片中的字符', 'Enter the characters shown')}
                                maxLength={4}
                                onChange={(event) => setCaptchaCode(event.target.value)}
                              />
                              <button
                                type="button"
                                className="login__captcha-img"
                                title={t('看不清？换一张', 'Can’t read it? Try another')}
                                aria-label={t('换一张验证码', 'Refresh captcha')}
                                onClick={() => void loadCaptcha()}
                              >
                                {captchaImage ? (
                                  <img src={captchaImage} alt={t('人机验证码', 'Human verification code')} />
                                ) : (
                                  <span>{t('加载中…', 'Loading…')}</span>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="login__field">
                          <span className="login__label">
                            {t('邮箱验证码', 'Email code')}
                            {mode === 'reset' ? t('（发送至注册邮箱）', ' (sent to the registered email)') : ''}
                          </span>
                          <div className="login__code-row">
                            <CodeSlots
                              value={code}
                              onChange={setCode}
                              disabled={submitting}
                              status={
                                codeStatus === 'idle' &&
                                Boolean(error) &&
                                code.length > 0 &&
                                code.length < 6
                                  ? 'invalid'
                                  : codeStatus
                              }
                            />
                            <button
                              type="button"
                              className="login__code-btn"
                              disabled={sending || cooldown > 0}
                              onClick={() => void onSendCode()}
                            >
                              {cooldown > 0
                                ? t(`${cooldown}s 后重发`, `Resend in ${cooldown}s`)
                                : sending
                                  ? t('发送中…', 'Sending…')
                                  : t('获取验证码', 'Get code')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {mode === 'login' ? (
                      <label className="login__field">
                        <span className="login__label">{t('密码', 'Password')}</span>
                        <input
                          type="password"
                          name="password"
                          value={password}
                          autoComplete="current-password"
                          placeholder={t('输入登录密码', 'Enter your password')}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {mode === 'register' ? (
                      <div className="login__row">
                        <label className="login__field">
                          <span className="login__label">{t('密码', 'Password')}</span>
                          <input
                            type="password"
                            name="password"
                            value={password}
                            autoComplete="new-password"
                            placeholder={t('至少 8 位', 'At least 8 characters')}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                          />
                        </label>

                        <label className="login__field">
                          <span className="login__label">{t('确认密码', 'Confirm password')}</span>
                          <input
                            type="password"
                            name="confirm"
                            value={confirm}
                            autoComplete="new-password"
                            placeholder={t('再输入一次', 'Enter it again')}
                            onChange={(event) => setConfirm(event.target.value)}
                            required
                          />
                        </label>
                      </div>
                    ) : null}

                    {mode === 'reset' ? (
                      <label className="login__field">
                        <span className="login__label">{t('新密码', 'New password')}</span>
                        <input
                          type="password"
                          name="password"
                          value={password}
                          autoComplete="new-password"
                          placeholder={t('至少 8 位', 'At least 8 characters')}
                          onChange={(event) => setPassword(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {mode !== 'login' ? (
                      <div className="login__strength" data-score={strength} role="status">
                        <span className="login__strength-bars" aria-hidden="true">
                          {[1, 2, 3, 4].map((step) => (
                            <i key={step} data-on={strength >= step ? '' : undefined} />
                          ))}
                        </span>
                        <span className="login__strength-label">
                          {(isZh ? STRENGTH_LABEL : STRENGTH_LABEL_EN)[strength]}
                          {mode === 'register' && password && strength < 3
                            ? t(` · 还差 ${3 - strength} 类字符`, ` · ${3 - strength} more character types`)
                            : ''}
                        </span>
                      </div>
                    ) : null}

                    <button type="submit" className="login__submit" disabled={submitting}>
                      <span>
                        {mode === 'login'
                          ? t('登录', 'Sign in')
                          : mode === 'register'
                            ? t('注册并登录', 'Register & sign in')
                            : t('重置密码', 'Reset password')}
                      </span>
                      <span aria-hidden="true">{submitting ? '…' : '↗'}</span>
                    </button>

                    <p className={`login__msg${error ? ' is-error' : ''}`} aria-live="polite">
                      {error || notice || '\u00a0'}
                    </p>
                  </form>
                </div>

                <footer className="login__helper">
                  {mode === 'login' ? (
                    <>
                      <button type="button" onClick={() => switchMode('reset')}>
                        {t('忘记密码？', 'Forgot password?')}
                      </button>
                      <button type="button" onClick={() => switchMode('register')}>
                        {t('还没有账号，去注册', 'No account yet? Register')}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => switchMode('login')}>
                      {t('已有账号，去登录', 'Already have an account? Sign in')}
                    </button>
                  )}
                </footer>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
