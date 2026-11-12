/* 全站搜索索引：把页面、手记、作品、更新与履历摊平成同一张表。
   新增内容时只要往这里补一条，搜索框就能搜到。 */

import { chapters } from './chapters'
import { posts } from './posts'
import { works } from './works'
import type { ChangelogEntry } from '../lib/api'
import { awards, certificates, experience } from './profile'

export type SearchKind = 'page' | 'journal' | 'work' | 'update' | 'profile'

export type SearchItem = {
  id: string
  kind: SearchKind
  /** 结果行左侧的类型标签 */
  label: string
  title: string
  /** 结果行右侧的补充信息 */
  meta: string
  /** 点击后的跳转地址，可带 #section */
  path: string
  /** 只参与匹配、不展示的长文本 */
  text: string
}

export type SearchResult = SearchItem & { score: number }

const pageItems: SearchItem[] = chapters.map((chapter) => ({
  id: `page-${chapter.id}`,
  kind: 'page',
  label: '页面',
  title: `${chapter.label} / ${chapter.cn}`,
  meta: `${chapter.act} · ${chapter.actCn}`,
  path: chapter.path,
  text: `${chapter.label} ${chapter.cn} ${chapter.caption} ${chapter.captionCn}`
}))

const journalItems: SearchItem[] = posts.map((post) => ({
  id: `journal-${post.slug}`,
  kind: 'journal',
  label: '手记',
  title: post.title,
  meta: `${post.category} · ${post.date}`,
  path: `/journal/${post.slug}`,
  text: [post.en, post.excerpt, post.category, ...post.tags].join(' ')
}))

const workItems: SearchItem[] = works.map((work) => ({
  id: `work-${work.slug}`,
  kind: 'work',
  label: '作品',
  title: `${work.title} · ${work.cn}`,
  meta: work.year,
  path: `/work/${work.slug}`,
  text: [work.category, work.tagline, work.summary, work.role, work.status].join(' ')
}))

/** 更新记录存在后端，搜索面板打开时拉取并补进索引 */
export function buildUpdateItems(entries: ChangelogEntry[]): SearchItem[] {
  return entries.map((entry) => ({
    id: `update-${entry.version}`,
    kind: 'update',
    label: '更新',
    title: entry.title,
    meta: `${entry.version} · ${entry.date}`,
    path: '/updates',
    text: [entry.version, entry.title, ...entry.items].join(' ')
  }))
}

const profileItems: SearchItem[] = [
  ...experience.map((job, index) => ({
    id: `experience-${index}`,
    kind: 'profile' as const,
    label: '经历',
    title: `${job.org} · ${job.role}`,
    meta: job.period,
    path: '/#experience',
    text: [job.cn, job.summary, ...job.bullets, ...job.stack].join(' ')
  })),
  ...awards.map((award, index) => ({
    id: `award-${index}`,
    kind: 'profile' as const,
    label: '荣誉',
    title: award.title,
    meta: `${award.date} · ${award.level}`,
    path: '/#credentials',
    text: `${award.title} ${award.level} ${award.date}`
  })),
  ...certificates.map((cert, index) => ({
    id: `cert-${index}`,
    kind: 'profile' as const,
    label: '证书',
    title: cert.title,
    meta: `${cert.date}`,
    path: '/#credentials',
    text: `${cert.title} ${cert.issuer} ${cert.date}`
  }))
]

export const searchIndex: SearchItem[] = [
  ...pageItems,
  ...workItems,
  ...journalItems,
  ...profileItems
]

/** 搜索框为空时的默认建议：先把访客带到几个主页面 */
export const suggestions: SearchItem[] = pageItems.slice(0, 6)

export function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function splitTokens(raw: string) {
  return raw.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

export function searchSite(raw: string, limit = 12, extras: SearchItem[] = []): SearchResult[] {
  const tokens = splitTokens(raw)
  if (!tokens.length) return []

  const results: SearchResult[] = []

  for (const item of [...searchIndex, ...extras]) {
    const title = item.title.toLowerCase()
    const body = item.text.toLowerCase()
    let score = 0

    for (const token of tokens) {
      const inTitle = title.indexOf(token)
      const inBody = body.indexOf(token)
      if (inTitle < 0 && inBody < 0) {
        score = 0
        break
      }
      score += inTitle >= 0 ? 14 - Math.min(inTitle, 8) : 4
      if (title.startsWith(token)) score += 6
    }

    if (score > 0) results.push({ ...item, score })
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.length - b.title.length)
    .slice(0, limit)
}
