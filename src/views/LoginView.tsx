import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError, type CodeScene } from '../lib/api'
import { signIn, signOut, useAuth } from '../store/auth'
import { refreshNotifications } from '../store/notifications'
import '../styles/components/LoginView.css'

type Mode = 'login' | 'register' | 'reset'

const COPY: Record<Mode, { kicker: string; title: string; emph: string; lead: string }> = {
  login: {
    kicker: 'Account / 登录',
    title: 'Sign',
    emph: 'in.',
    lead: '登录后可接收站内公告、反馈回执与私信。登录状态保留 3 天，换网络会要求重新登录。'
  },
  register: {
    kicker: 'Register / 注册',
    title: 'Join',
    emph: 'us.',
    lead: '用邮箱注册账号。点击获取验证码会先做一次人机验证，验证码由邮件发送，10 分钟内有效。'
  },
  reset: {
    kicker: 'Recovery / 找回密码',
    title: 'Reset',
    emph: 'key.',
    lead: '填写注册邮箱并完成人机验证，我们会把验证码发到邮箱，验证后即可设置新密码。'
  }
}

function messageOf(error: unknown) {
  if (error instanceof ApiError) return error.message
  return '网络异常，请稍后再试。'
}

function sceneOf(mode: Mode): CodeScene {
  return mode === 'register' ? 'REGISTER' : 'RESET_PASSWORD'
}

export default function LoginView() {
  const navigate = useNavigate()
  const auth = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const copy = COPY[mode]

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
    document.title = `${copy.kicker.split(' / ')[1] ?? 'Sign in'} — 陆屿 LU YU`
  }, [copy.kicker])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function switchMode(next: Mode) {
    if (mode === next) return
    setMode(next)
    setError('')
    setNotice('')
    setCode('')
    setCaptchaId('')
    setCaptchaImage('')
    setCaptchaCode('')
    setPassword('')
    setNewPassword('')
  }

  async function onSendCode() {
    if (sending || cooldown > 0) return
    setError('')
    setNotice('')

    if (!email.trim()) {
      setError('请先填写邮箱')
      return
    }
    if (!captchaCode.trim()) {
      setError('请先填写图片验证码')
      return
    }

    setSending(true)
    try {
      const ticket = await api.sendCode({
        email: email.trim(),
        scene: sceneOf(mode),
        captchaId,
        captchaCode: captchaCode.trim()
      })
      setCooldown(ticket.resendAfterSeconds)
      setNotice(
        `验证码已发送至 ${email.trim()}，${Math.round(ticket.expiresInSeconds / 60)} 分钟内有效`
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
    setSubmitting(true)

    try {
      if (mode === 'login') {
        const result = await api.login(email.trim(), password)
        signIn(result)
        await refreshNotifications()
        navigate('/')
        return
      }

      if (mode === 'register') {
        const result = await api.register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          code: code.trim()
        })
        signIn(result)
        await refreshNotifications()
        navigate('/')
        return
      }

      await api.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword
      })
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

      <div className="shell login__inner">
        <header className="login__top">
          <span className="eyebrow">{copy.kicker}</span>
          <span className="mono login__top-meta">LU YU — Member access</span>
        </header>

        <div className="login__stage">
          <aside className="login__intro">
            <h1 className="login__title">
              {copy.title} <em>{copy.emph}</em>
            </h1>
            <p className="login__text">{copy.lead}</p>

            <ul className="login__marks mono">
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

            <Link to="/" className="login__back mono" data-cursor="Index">
              返回首页 <span aria-hidden="true">↖</span>
            </Link>
          </aside>

          <section className="login__panel">
            {signedIn ? (
              <div className="login__signed">
                <span className="mono login__panel-kicker">Signed in</span>
                <h2 className="login__signed-name">{auth.user?.displayName}</h2>
                <p className="login__signed-mail mono">{auth.user?.email}</p>
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
                <div className="login__tabs" role="tablist" aria-label="账号操作">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    className={`login__tab${mode === 'login' ? ' is-active' : ''}`}
                    onClick={() => switchMode('login')}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'register'}
                    className={`login__tab${mode === 'register' ? ' is-active' : ''}`}
                    onClick={() => switchMode('register')}
                  >
                    注册
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'reset'}
                    className={`login__tab${mode === 'reset' ? ' is-active' : ''}`}
                    onClick={() => switchMode('reset')}
                  >
                    找回密码
                  </button>
                </div>

                <form className="login__form" onSubmit={onSubmit} noValidate>
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

                  {mode === 'register' ? (
                    <label className="login__field">
                      <span className="login__label">昵称</span>
                      <input
                        type="text"
                        name="displayName"
                        value={displayName}
                        autoComplete="nickname"
                        placeholder="怎么称呼你"
                        maxLength={40}
                        onChange={(event) => setDisplayName(event.target.value)}
                        required
                      />
                    </label>
                  ) : null}

                  {mode === 'login' ? (
                    <label className="login__field">
                      <span className="login__label">密码</span>
                      <input
                        type="password"
                        name="password"
                        value={password}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </label>
                  ) : null}

                  {mode !== 'login' ? (
                    <>
                      <div className="login__field">
                        <span className="login__label">人机验证</span>
                        <div className="login__captcha">
                          <input
                            type="text"
                            name="captchaCode"
                            value={captchaCode}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="图片中的字符"
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
                              <span className="mono">加载中…</span>
                            )}
                          </button>
                        </div>
                      </div>

                      <label className="login__field">
                        <span className="login__label">邮箱验证码</span>
                        <div className="login__code">
                          <input
                            type="text"
                            name="code"
                            value={code}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6 位数字"
                            maxLength={6}
                            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                            required
                          />
                          <button
                            type="button"
                            className="login__code-btn"
                            disabled={sending || cooldown > 0}
                            onClick={() => void onSendCode()}
                          >
                            {cooldown > 0 ? `${cooldown}s 后重发` : sending ? '发送中…' : '获取验证码'}
                          </button>
                        </div>
                      </label>
                    </>
                  ) : null}

                  {mode !== 'login' ? (
                    <label className="login__field">
                      <span className="login__label">{mode === 'reset' ? '新密码' : '密码'}</span>
                      <input
                        type="password"
                        name={mode === 'reset' ? 'newPassword' : 'password'}
                        value={mode === 'reset' ? newPassword : password}
                        autoComplete="new-password"
                        placeholder="至少 8 位"
                        onChange={(event) =>
                          mode === 'reset'
                            ? setNewPassword(event.target.value)
                            : setPassword(event.target.value)
                        }
                        required
                      />
                    </label>
                  ) : null}

                  <button type="submit" className="login__submit" disabled={submitting}>
                    <span>
                      {mode === 'login' ? '登录' : mode === 'register' ? '注册并登录' : '重置密码'}
                    </span>
                    <span aria-hidden="true">{submitting ? '…' : '↗'}</span>
                  </button>

                  <p
                    className={`login__msg mono${error ? ' is-error' : ''}`}
                    role="status"
                    aria-live="polite"
                  >
                    {error || notice || '\u00a0'}
                  </p>
                </form>

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
