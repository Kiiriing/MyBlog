import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type PostStats } from '../lib/api'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7.2-4.4-7.2-9.4A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.2 3.2C19.2 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10v16l-5-3.4L7 20V4Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 12S6.8 6.5 12 6.5 20.5 12 20.5 12 17.2 17.5 12 17.5 3.5 12 3.5 12Z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export default function EngagementBar({ slug }: { slug: string }) {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [stats, setStats] = useState<PostStats | null>(null)
  const [pending, setPending] = useState<'like' | 'favorite' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setStats(null)
    setError('')

    api
      .postStats(slug)
      .then((result) => {
        if (alive) setStats(result)
      })
      .catch(() => {})

    const key = `luyu.viewed.${slug}`
    let seen = false
    try {
      seen = sessionStorage.getItem(key) === '1'
      if (!seen) sessionStorage.setItem(key, '1')
    } catch {
      /* 隐私模式下 storage 不可用，仍然记录一次浏览 */
    }

    if (!seen) {
      api
        .recordView(slug)
        .then((result) => {
          if (alive) setStats((prev) => (prev ? { ...prev, views: result.views } : result))
        })
        .catch(() => {})
    }

    return () => {
      alive = false
    }
  }, [slug])

  async function toggle(kind: 'like' | 'favorite') {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/journal/${slug}`)}`)
      return
    }
    if (!stats || pending) return

    setPending(kind)
    setError('')
    try {
      const result =
        kind === 'like' ? await api.toggleLike(slug) : await api.toggleFavorite(slug)
      setStats((prev) => {
        if (!prev) return prev
        return kind === 'like'
          ? { ...prev, likes: result.count, liked: result.active }
          : { ...prev, favorites: result.count, favorited: result.active }
      })
    } catch {
      setError(t('操作失败', 'Action failed'))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="post-engage">
      <span className="post-engage__views mono" title={t('阅读量', 'Views')}>
        <EyeIcon />
        <span className="post-engage__count">{stats ? stats.views : '—'}</span>
        <span className="post-engage__label">{t('次阅读', 'views')}</span>
      </span>

      <button
        type="button"
        className={`post-engage__btn${stats?.liked ? ' is-active' : ''}`}
        aria-pressed={Boolean(stats?.liked)}
        title={user ? t('点赞', 'Like') : t('登录后可点赞', 'Sign in to like')}
        onClick={() => toggle('like')}
        disabled={pending === 'like'}
      >
        <HeartIcon />
        <span className="post-engage__count">{stats ? stats.likes : 0}</span>
        <span className="post-engage__label">{t('点赞', 'Like')}</span>
      </button>

      <button
        type="button"
        className={`post-engage__btn${stats?.favorited ? ' is-active' : ''}`}
        aria-pressed={Boolean(stats?.favorited)}
        title={user ? t('收藏', 'Save') : t('登录后可收藏', 'Sign in to save')}
        onClick={() => toggle('favorite')}
        disabled={pending === 'favorite'}
      >
        <BookmarkIcon />
        <span className="post-engage__count">{stats ? stats.favorites : 0}</span>
        <span className="post-engage__label">{t('收藏', 'Save')}</span>
      </button>

      {error ? <span className="post-engage__error mono">{error}</span> : null}
    </div>
  )
}
