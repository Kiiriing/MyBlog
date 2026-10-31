import { reactive } from 'vue'
import { lockScroll, unlockScroll } from '../composables/useSmoothScroll'

export const ui = reactive({
  menuOpen: false,
  introDone: false,
  booting: true,
  isTouch: false
})

if (typeof window !== 'undefined') {
  ui.isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
}

export function setMenuOpen(open) {
  ui.menuOpen = open

  if (ui.booting) return
  if (open) lockScroll()
  else unlockScroll()
}

export function toggleMenu() {
  setMenuOpen(!ui.menuOpen)
}

export function finishBoot() {
  ui.booting = false
  ui.introDone = true
  unlockScroll()
}
