export type Role = 'USER' | 'ADMIN'
export type NotificationCategory = 'SYSTEM' | 'FEEDBACK' | 'DIRECT'

export type AuthUser = {
  id: number
  username: string
  email: string
  displayName: string
  role: Role
}

export type NotificationItem = {
  id: number
  category: NotificationCategory
  title: string
  body: string
  link?: string
  createdAt: string
  read: boolean
  pinned: boolean
  senderName?: string
}

export type NotificationList = {
  items: NotificationItem[]
  unread: number
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type CodeScene = 'REGISTER' | 'RESET_PASSWORD'

/** 图片人机验证码，image 为可直接放进 img.src 的 data URI */
export type Captcha = {
  id: string
  image: string
  expiresInSeconds: number
}

/** 验证码已通过邮件发送，返回有效期、可重发时间与脱敏后的接收邮箱 */
export type CodeTicket = {
  expiresInSeconds: number
  resendAfterSeconds: number
  sentTo: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const TOKEN_KEY = 'luyu.auth.token'

export function getToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data.message === 'string' ? data.message : '请求失败，请稍后再试。'
    throw new ApiError(message, response.status)
  }

  return data as T
}

export const api = {
  me: () => request<AuthUser>('/auth/me'),

  login: (account: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account, password })
    }),

  captcha: () => request<Captcha>('/auth/captcha'),

  sendCode: (payload: {
    account: string
    scene: CodeScene
    captchaId: string
    captchaCode: string
  }) =>
    request<CodeTicket>('/auth/code', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  register: (payload: { username: string; email: string; password: string; code: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  resetPassword: (payload: { account: string; code: string; newPassword: string }) =>
    request<void>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  notifications: (filter: 'all' | 'unread' | 'read' = 'all') =>
    request<NotificationList>(`/notifications?filter=${filter}`),

  markRead: (id: number) =>
    request<NotificationItem>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => request<{ unread: number }>('/notifications/read-all', { method: 'POST' }),

  togglePin: (id: number) =>
    request<NotificationItem>(`/notifications/${id}/pin`, { method: 'POST' }),

  remove: (id: number) =>
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),

  submitFeedback: (content: string) =>
    request<void>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ content })
    })
}
