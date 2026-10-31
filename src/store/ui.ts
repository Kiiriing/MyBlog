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
  commit({ menuOpen: open })
  if (state.booting) return
  if (open) lockScroll()
  else unlockScroll()
}

export function toggleMenu() {
  setMenuOpen(!state.menuOpen)
}

export function finishBoot() {
  commit({ booting: false, introDone: true })
  unlockScroll()
}
