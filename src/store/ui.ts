import { useSyncExternalStore } from 'react'
import { lockScroll, unlockScroll } from '../composables/useSmoothScroll'

export type UiState = {
  menuOpen: boolean
  introDone: boolean
  booting: boolean
  isTouch: boolean
}

let state: UiState = {
  menuOpen: false,
  introDone: false,
  booting: true,
  isTouch: typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches
}

const listeners = new Set<() => void>()

const MENU_ANIMATION_MS = 1000
let menuLockedUntil = 0

function commit(patch: Partial<UiState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getUi = () => state

export function useUi() {
  return useSyncExternalStore(subscribe, getUi, getUi)
}

export function setUi(patch: Partial<UiState>) {
  commit(patch)
}

export function setMenuOpen(open: boolean) {
  if (state.menuOpen === open) return
  // 菜单展开 / 收起动画约 1s，期间锁住，避免重复点击把状态来回切换
  menuLockedUntil = performance.now() + MENU_ANIMATION_MS
  commit({ menuOpen: open })
  if (state.booting) return
  if (open) lockScroll()
  else unlockScroll()
}

export function toggleMenu() {
  if (isMenuAnimating()) return
  setMenuOpen(!state.menuOpen)
}

/** 菜单动画是否还在进行中 */
export function isMenuAnimating() {
  return performance.now() < menuLockedUntil
}

export function finishBoot() {
  commit({ booting: false, introDone: true })
  unlockScroll()
}
