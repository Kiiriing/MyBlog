import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/components/LoginView.css'

export default function LoginView() {
  useEffect(() => {
    document.title = 'Sign in — 陆屿 LU YU'
  }, [])

  return (
    <div className="login">
      <div className="login__ambient" aria-hidden="true" />

      <div className="shell login__inner">
        <header className="login__top">
          <span className="eyebrow">Account / 账号</span>
          <span className="mono login__top-meta">LU YU — Member access</span>
        </header>

        <div className="login__main">
          <div className="login__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="16" r="7" stroke="currentColor" strokeWidth="1.1" />
              <path
                d="M9 39c1.6-8 7.4-12 15-12s13.4 4 15 12"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="login__title">
            Sign <em>in.</em>
          </h1>

          <p className="login__text">
            登录入口已经留好，账号与登录流程正在接入。完成后可以在这里接收站内公告、反馈回执与私信。
          </p>

          <div className="login__actions">
            <Link to="/" className="login__btn" data-cursor="Index">
              <span>返回首页</span>
              <span aria-hidden="true">↖</span>
            </Link>
            <Link to="/journal" className="login__btn login__btn--ghost" data-cursor="Read">
              <span>阅读手记</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <p className="login__note mono">Placeholder — authentication UI coming soon</p>
        </div>
      </div>
    </div>
  )
}
