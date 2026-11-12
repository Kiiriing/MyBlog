import { useSyncExternalStore } from 'react'

/* 全站界面语言：默认中文，选择结果写入 localStorage。
   手记正文与项目长文属于内容，不随界面语言切换。 */

export type Lang = 'zh' | 'en'

const STORAGE_KEY = 'luyu.lang'

function readLang(): Lang {
  if (typeof window === 'undefined') return 'zh'
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

function applyDocumentLang(lang: Lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }
}

let state: Lang = readLang()
applyDocumentLang(state)

const listeners = new Set<() => void>()

function commit(lang: Lang) {
  if (state === lang) return
  state = lang
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* 隐私模式下 storage 不可用，仅当前会话生效 */
  }
  applyDocumentLang(lang)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state

export function getLang() {
  return state
}

export function useLang() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function setLang(lang: Lang) {
  commit(lang)
}

export function toggleLang() {
  commit(state === 'zh' ? 'en' : 'zh')
}

/** 组件内使用：t('中文', 'English') 取当前语言文案 */
export function useI18n() {
  const lang = useLang()
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en)
  return { lang, t, isZh: lang === 'zh' }
}
