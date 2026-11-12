import { useEffect } from 'react'

/** 站点线上地址；部署域名不同时用 VITE_SITE_URL 覆盖 */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://luyu.me'
).replace(/\/$/, '')

type JsonLd = Record<string, unknown> | Record<string, unknown>[]

type SeoProps = {
  title: string
  path: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  jsonLd?: JsonLd
  noindex?: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 单页应用没有服务端渲染，这里在路由渲染后补齐 canonical、OG 与 JSON-LD。
 * 每个页面只挂一个，卸载时清掉结构化数据，避免带到下一个页面。
 */
export default function Seo({
  title,
  path,
  description,
  image,
  type = 'website',
  jsonLd,
  noindex
}: SeoProps) {
  const json = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    document.title = title
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
      upsertMeta('name', 'twitter:description', description)
    }

    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:type', type)
    upsertMeta('name', 'twitter:title', title)

    const url = `${SITE_URL}${path}`
    upsertMeta('property', 'og:url', url)
    if (image) {
      upsertMeta('property', 'og:image', image.startsWith('http') ? image : `${SITE_URL}${image}`)
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = noindex ? 'noindex, nofollow' : 'index, follow'

    document.head.querySelectorAll('script[data-seo-jsonld]').forEach((node) => node.remove())
    if (json) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.seoJsonld = 'true'
      script.textContent = json
      document.head.appendChild(script)
    }
  }, [title, path, description, image, type, json, noindex])

  useEffect(
    () => () => {
      document.head.querySelectorAll('script[data-seo-jsonld]').forEach((node) => node.remove())
    },
    []
  )

  return null
}
