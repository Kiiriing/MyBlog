import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, type CodeScene } from '../lib/api'
import { signIn, signOut, useAuth } from '../store/auth'
import { refreshNotifications } from '../store/notifications'
import CodeSlots from '../components/CodeSlots'
import RubberSegment, { type SegmentItem } from '../components/RubberSegment'
import '../styles/components/LoginView.css'

type Mode = 'login' | 'register' | 'reset'

const MODES: SegmentItem[] = [
  { value: 'login', label: '登录' },
  { value: 'register', label: '注册' },
  { value: 'reset', label: '找回密码' }
]

const COPY: Record<Mode, { kicker: string; title: string; emph: string; lead: string }> = {
  login: {
    kicker: 'Account / 登录',
    title: 'Sign',
    emph: 'in.',
    lead: '用用户名或邮箱登录，接收站内公告、反馈回执与私信。登录状态保留 3 天，换网络会要求重新登录。'
  },
  register: {
    kicker: 'Register / 注册',
    title: 'Join',
    emph: 'us.',
    lead: '先取一个用户名，再绑定邮箱。获取验证码前需要完成人机验证，验证码由邮件发送，10 分钟内有效。'
  },
  reset: {
    kicker: 'Recovery / 找回密码',
    title: 'Reset',
    emph: 'key.',
    lead: '填写用户名或注册邮箱并完成人机验证，验证码会发送到注册邮箱，验证后即可设置新密码。'
  }
}

const STRENGTH_LABEL = ['未设置', '弱', '较弱', '较强', '强']
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
  const auth = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [account, setAccount] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')

  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')

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
  }, [copy.kicker])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

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
        navigate('/')
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
        navigate('/')
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
      <div className="login__ambient" aria-hidden="true" />
      <div className="login__grid-lines" aria-hidden="true" />

      <button type="button" className="login__back" aria-label="返回上一页" onClick={goBack}>
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
            <p className="login__text">{copy.lead}</p>

            <ul className="login__marks">
              <li>
                <span>01</span>3 天免密登录
              </li>
              <li>
                <span>02</span>登录 IP 变化需重新验证
              </li>
              <li>
                <span>03</span>邮件验证码 + 人机校验
              </li>
            </ul>
          </aside>

          <section className="login__panel">
            {signedIn ? (
              <div className="login__signed">
                <span className="login__kicker">Signed in / 已登录</span>
                <h2 className="login__signed-name">{auth.user?.username}</h2>
                <p className="login__signed-mail">{auth.user?.email}</p>
                <div className="login__signed-actions">
                  <button type="button" className="login__submit" onClick={() => navigate('/')}>
                    <span>回到首页</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    type="button"
                    className="login__ghost"
                    onClick={() => {
                      signOut()
                      setNotice('已退出登录')
                    }}
                  >
                    退出登录
                  </button>
                </div>
              </div>
            ) : (
              <>
                <RubberSegment
                  items={MODES}
                  value={mode}
                  onChange={switchMode}
                  ariaLabel="账号操作"
                />

                <div key={mode} className="login__body">
                  <form className="login__form" onSubmit={onSubmit} noValidate>
                    {mode === 'login' ? (
                      <label className="login__field">
                        <span className="login__label">用户名 / 邮箱</span>
                        <input
                          type="text"
                          name="account"
                          value={account}
                          autoComplete="username"
                          spellCheck={false}
                          placeholder="yourname 或 you@example.com"
                          onChange={(event) => setAccount(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {mode === 'register' ? (
                      <div className="login__row">
                        <label className="login__field">
                          <span className="login__label">用户名</span>
                          <input
                            type="text"
                            name="username"
                            value={username}
                            autoComplete="username"
                            spellCheck={false}
                            placeholder="2-20 位中英文数字"
                            maxLength={20}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                          />
                        </label>

                        <label className="login__field">
                          <span className="login__label">邮箱</span>
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
                        <span className="login__label">用户名 / 邮箱</span>
                        <input
                          type="text"
                          name="account"
                          value={account}
                          autoComplete="username"
                          spellCheck={false}
                          placeholder="yourname 或 you@example.com"
                          onChange={(event) => setAccount(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {needsCaptcha ? (
                      <div className="login__pair">
                        <div className="login__field">
                          <span className="login__label">人机验证</span>
                          <div className="login__captcha">
                            <input
                              type="text"
                              name="captchaCode"
                              value={captchaCode}
                              autoComplete="off"
                              spellCheck={false}
                              placeholder="输入图片中的字符"
                              maxLength={4}
                              onChange={(event) => setCaptchaCode(event.target.value)}
                            />
                            <button
                              type="button"
                              className="login__captcha-img"
                              title="看不清？换一张"
                              aria-label="换一张验证码"
                              onClick={() => void loadCaptcha()}
                            >
                              {captchaImage ? (
                                <img src={captchaImage} alt="人机验证码" />
                              ) : (
                                <span>加载中…</span>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="login__field">
                          <div className="login__field-head">
                            <span className="login__label">
                              邮箱验证码
                              {mode === 'reset' ? '（发送至注册邮箱）' : ''}
                            </span>
                            <button
                              type="button"
                              className="login__code-btn"
                              disabled={sending || cooldown > 0}
                              onClick={() => void onSendCode()}
                            >
                              {cooldown > 0
                                ? `${cooldown}s 后重发`
                                : sending
                                  ? '发送中…'
                                  : '获取验证码'}
                            </button>
                          </div>
                          <CodeSlots
                            value={code}
                            onChange={setCode}
                            disabled={submitting}
                            invalid={Boolean(error) && code.length > 0 && code.length < 6}
                          />
                        </div>
                      </div>
                    ) : null}

                    {mode === 'login' ? (
                      <label className="login__field">
                        <span className="login__label">密码</span>
                        <input
                          type="password"
                          name="password"
                          value={password}
                          autoComplete="current-password"
                          placeholder="输入登录密码"
                          onChange={(event) => setPassword(event.target.value)}
                          required
                        />
                      </label>
                    ) : null}

                    {mode === 'register' ? (
                      <div className="login__row">
                        <label className="login__field">
                          <span className="login__label">密码</span>
                          <input
                            type="password"
                            name="password"
                            value={password}
                            autoComplete="new-password"
                            placeholder="至少 8 位"
                            onChange={(event) => setPassword(event.target.value)}
                            required
                          />
                        </label>

                        <label className="login__field">
                          <span className="login__label">确认密码</span>
                          <input
                            type="password"
                            name="confirm"
                            value={confirm}
                            autoComplete="new-password"
                            placeholder="再输入一次"
                            onChange={(event) => setConfirm(event.target.value)}
                            required
                          />
                        </label>
                      </div>
                    ) : null}

                    {mode === 'reset' ? (
                      <label className="login__field">
                        <span className="login__label">新密码</span>
                        <input
                          type="password"
                          name="password"
                          value={password}
                          autoComplete="new-password"
                          placeholder="至少 8 位"
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
                          {STRENGTH_LABEL[strength]}
                          {mode === 'register' && password && strength < 3
                            ? ` · 还差 ${3 - strength} 类字符`
                            : ''}
                        </span>
                      </div>
                    ) : null}

                    <button type="submit" className="login__submit" disabled={submitting}>
                      <span>
                        {mode === 'login' ? '登录' : mode === 'register' ? '注册并登录' : '重置密码'}
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
                        忘记密码？
                      </button>
                      <button type="button" onClick={() => switchMode('register')}>
                        还没有账号，去注册
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => switchMode('login')}>
                      已有账号，去登录
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
