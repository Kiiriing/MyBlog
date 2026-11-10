import { useSyncExternalStore } from 'react'
import { api, getToken, setToken, type AuthResponse, type AuthUser } from '../lib/api'

type AuthState = {
  user: AuthUser | null
  ready: boolean
}

let state: AuthState = { user: null, ready: false }

const listeners = new Set<() => void>()

function commit(patch: Partial<AuthState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export function getAuth() {
  return state
}

export async function restoreSession() {
  if (!getToken()) {
    commit({ user: null, ready: true })
    return
  }

  try {
    const user = await api.me()
    commit({ user, ready: true })
  } catch {
    setToken(null)
    commit({ user: null, ready: true })
  }
}

/** 登录 / 注册成功后写入令牌与用户信息 */
export function signIn(result: AuthResponse) {
  setToken(result.token)
  commit({ user: result.user, ready: true })
}

export function signOut() {
  setToken(null)
  commit({ user: null })
}
