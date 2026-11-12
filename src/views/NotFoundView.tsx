import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toggleMenu } from '../store/ui'
import SiteFooter from '../components/SiteFooter'
import Seo from '../components/Seo'
import '../styles/components/NotFoundView.css'

export default function NotFoundView() {
  useEffect(() => {
    document.title = 'Lost signal — 陆屿 LU YU'
  }, [])

  return (
    <div className="notfound">
      <Seo title="Lost signal — 陆屿 LU YU" path="/404" noindex />
      <div className="notfound__ambient" aria-hidden="true" />

      <div className="shell notfound__inner">
        <div className="notfound__top">
          <span className="eyebrow">404 / Lost signal</span>
          <span className="mono">Beijing, CN — {new Date().getFullYear()}</span>
        </div>

        <div className="notfound__main">
          <div className="notfound__code" aria-hidden="true">
            404
          </div>

          <div className="notfound__copy">
            <h1 className="notfound__title">
              This page
              <br />
              <em>drifted away.</em>
            </h1>
            <p className="notfound__text">
              你要找的页面可能被移动、删除，或者从来没有真正存在过。 不如回到信号开始的地方，再试一次。
            </p>

            <div className="notfound__actions">
              <Link to="/" className="notfound__btn" data-cursor="Index">
                <span>返回首页</span>
                <span aria-hidden="true">↖</span>
              </Link>
              <Link to="/journal" className="notfound__btn" data-cursor="Read">
                <span>阅读手记</span>
                <span aria-hidden="true">↗</span>
              </Link>
              <button
                type="button"
                className="notfound__btn notfound__btn--ghost"
                data-cursor="Menu"
                onClick={() => toggleMenu()}
              >
                <span>打开菜单</span>
                <span aria-hidden="true">≡</span>
              </button>
            </div>
          </div>
        </div>

        <div className="notfound__foot">
          <span className="mono">Error 404 — Page not found</span>
          <span className="mono">But the signal continues.</span>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
