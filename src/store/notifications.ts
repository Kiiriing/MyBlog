import { useSyncExternalStore } from 'react'
import { api, getToken, type NotificationItem } from '../lib/api'
import { lockScroll, unlockScroll } from '../composables/useSmoothScroll'

export type NotificationFilter = 'all' | 'unread' | 'read'

type NotificationState = {
  open: boolean
  filter: NotificationFilter
  items: NotificationItem[]
  unread: number
  page: number
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: string
}

const PAGE_SIZE = 20

let state: NotificationState = {
  open: false,
  filter: 'all',
  items: [],
  unread: 0,
  page: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: ''
}

const listeners = new Set<() => void>()

/* 抽屉滑入 / 滑出各 0.72s，动画期间锁住开关，避免连点让关闭打断展开 */
const INBOX_ANIMATION_MS = 760
let inboxLockedUntil = 0

function commit(patch: Partial<NotificationState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

if (typeof window !== 'undefined') {
  /* 登录态失效后清空缓存的通知，避免继续展示无法操作的旧数据 */
  window.addEventListener('luyu:unauthorized', () => {
    commit({ items: [], unread: 0, loading: false, error: '' })
  })
}

export function useNotifications() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export function getNotifications() {
  return state
}

/** 站内信抽屉动画是否还在进行中 */
function isInboxAnimating() {
  return performance.now() < inboxLockedUntil
}

export function openPanel() {
  if (state.open) return
  inboxLockedUntil = performance.now() + INBOX_ANIMATION_MS
  commit({ open: true, error: '' })
  lockScroll()
  void refreshNotifications()
}

export function closePanel() {
  if (!state.open) return
  inboxLockedUntil = performance.now() + INBOX_ANIMATION_MS
  commit({ open: false })
  unlockScroll()
}

export function togglePanel() {
  if (isInboxAnimating()) return
  if (state.open) closePanel()
  else openPanel()
}

export function setFilter(filter: NotificationFilter) {
  if (state.filter === filter) return
  commit({ filter })
  void refreshNotifications()
}

export async function refreshNotifications() {
  if (!getToken()) {
    commit({ items: [], unread: 0, loading: false })
    return
  }

  commit({ loading: true, error: '', page: 0, hasMore: false })
  try {
    const data = await api.notifications(state.filter, 0, PAGE_SIZE)
    commit({ items: data.items, unread: data.unread, hasMore: data.hasMore, loading: false })
  } catch {
    commit({ loading: false, error: '通知加载失败，请稍后再试。' })
  }
}

/** 抽屉里的「加载更多」：按页追加，不打断已展开的行 */
export async function loadMoreNotifications() {
  if (!getToken() || !state.hasMore || state.loadingMore) return

  commit({ loadingMore: true, error: '' })
  try {
    const data = await api.notifications(state.filter, state.page + 1, PAGE_SIZE)
    commit({
      items: [...state.items, ...data.items],
      unread: data.unread,
      page: state.page + 1,
      hasMore: data.hasMore,
      loadingMore: false
    })
  } catch {
    commit({ loadingMore: false, error: '通知加载失败，请稍后再试。' })
  }
}

export async function markRead(id: string) {
  try {
    await api.markRead(id)
    await refreshNotifications()
  } catch {
    commit({ error: '操作失败，请稍后再试。' })
  }
}

export async function markAllRead() {
  try {
    await api.markAllRead()
    await refreshNotifications()
  } catch {
    commit({ error: '操作失败，请稍后再试。' })
  }
}

export async function togglePin(id: string) {
  try {
    await api.togglePin(id)
    await refreshNotifications()
  } catch {
    commit({ error: '操作失败，请稍后再试。' })
  }
}

export async function removeNotification(id: string) {
  try {
    await api.remove(id)
    await refreshNotifications()
  } catch {
    commit({ error: '操作失败，请稍后再试。' })
  }
}
