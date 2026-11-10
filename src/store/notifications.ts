import { useSyncExternalStore } from 'react'
import { api, getToken, type NotificationItem } from '../lib/api'
import { lockScroll, unlockScroll } from '../composables/useSmoothScroll'

export type NotificationFilter = 'all' | 'unread' | 'read'

type NotificationState = {
  open: boolean
  filter: NotificationFilter
  items: NotificationItem[]
  unread: number
  loading: boolean
  error: string
}

let state: NotificationState = {
  open: false,
  filter: 'all',
  items: [],
  unread: 0,
  loading: false,
  error: ''
}

const listeners = new Set<() => void>()

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

export function openPanel() {
  if (state.open) return
  commit({ open: true, error: '' })
  lockScroll()
  void refreshNotifications()
}

export function closePanel() {
  if (!state.open) return
  commit({ open: false })
  unlockScroll()
}

export function togglePanel() {
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

  commit({ loading: true, error: '' })
  try {
    const data = await api.notifications(state.filter)
    commit({ items: data.items, unread: data.unread, loading: false })
  } catch {
    commit({ loading: false, error: '通知加载失败，请稍后再试。' })
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
