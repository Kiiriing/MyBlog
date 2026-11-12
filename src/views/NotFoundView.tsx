import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toggleMenu } from '../store/ui'
import { useI18n } from '../store/i18n'
import SiteFooter from '../components/SiteFooter'
import Seo from '../components/Seo'
import '../styles/components/NotFoundView.css'

export default function NotFoundView() {
  const { t, lang } = useI18n()

  useEffect(() => {
    document.title = t('Lost signal — 陆屿 LU YU', 'Lost signal — LU YU')
  }, [lang])

  return (
    <div className="notfound">
      <Seo title={t('Lost signal — 陆屿 LU YU', 'Lost signal — LU YU')} path="/404" noindex />
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
              {t(
                '你要找的页面可能被移动、删除，或者从来没有真正存在过。 不如回到信号开始的地方，再试一次。',
                'The page you are looking for may have been moved, deleted, or never really existed. Go back to where the signal began and try again.'
              )}
            </p>

            <div className="notfound__actions">
              <Link to="/" className="notfound__btn" data-cursor="Index">
                <span>{t('返回首页', 'Back to index')}</span>
                <span aria-hidden="true">↖</span>
              </Link>
              <Link to="/journal" className="notfound__btn" data-cursor="Read">
                <span>{t('阅读手记', 'Read the journal')}</span>
                <span aria-hidden="true">↗</span>
              </Link>
              <button
                type="button"
                className="notfound__btn notfound__btn--ghost"
                data-cursor="Menu"
                onClick={() => toggleMenu()}
              >
                <span>{t('打开菜单', 'Open menu')}</span>
                <span aria-hidden="true">≡</span>
              </button>
            </div>
          </div>
        </div>

        <div className="notfound__foot">
          <span className="mono">{t('错误 404 — 页面未找到', 'Error 404 — Page not found')}</span>
          <span className="mono">{t('但信号仍在继续。', 'But the signal continues.')}</span>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
