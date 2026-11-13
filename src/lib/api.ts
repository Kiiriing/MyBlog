export type Role = 'USER' | 'ADMIN'
export type NotificationCategory = 'SYSTEM' | 'FEEDBACK' | 'COMMENT' | 'DIRECT'

export type AuthUser = {
  id: string
  username: string
  email: string
  displayName: string
  role: Role
}

export type NotificationItem = {
  id: string
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
  hasMore: boolean
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type PostComment = {
  id: string
  content: string
  createdAt: string
  authorName: string
  authorId: string
  mine: boolean
  deleted: boolean
  likeCount: number
  likedByMe: boolean
  /** 楼中楼引用回复时，被回复人的昵称与评论摘要 */
  replyToName: string | null
  replyToExcerpt: string | null
  /** 楼中楼回复总数，replies 里只是前几条预览 */
  replyCount: number
  replies: PostComment[]
  /** 楼中楼是否还有未加载的回复（前端分页用） */
  repliesHasMore?: boolean
  /** 楼中楼是否已经是完整列表（而不是 3 条预览） */
  repliesLoaded?: boolean
}

export type CommentList = {
  items: PostComment[]
  total: number
  hasMore: boolean
  /** 实际返回的页码（带 anchor 时是目标所在页） */
  page: number
  /** 一级评论总数，评论区的虚拟滚动按它计算总高度 */
  rootTotal: number
}

export type ReplyList = {
  items: PostComment[]
  total: number
  hasMore: boolean
}

/** 更新页的一条版本记录，字段与后端 ChangelogEntryDto 对应 */
export type ChangelogEntry = {
  version: string
  date: string
  dateTime: string
  title: string
  items: string[]
}

export type PostStats = {
  slug: string
  views: number
  likes: number
  favorites: number
  liked: boolean
  favorited: boolean
}

export type ReactionResult = {
  active: boolean
  count: number
}

export type CodeScene = 'REGISTER' | 'RESET_PASSWORD'

/** 反馈提交结果：remaining 为当天剩余条数，0 表示今天已用完 */
export type FeedbackResult = {
  remaining: number
  limit: number
}

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

  if (response.status === 401) {
    /* 令牌失效（过期或服务端重置）时立即清掉本地登录态，避免界面继续展示旧数据 */
    setToken(null)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('luyu:unauthorized'))
  }

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

  verifyCode: (payload: { account: string; scene: CodeScene; code: string }) =>
    request<void>('/auth/code/verify', {
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

  notifications: (filter: 'all' | 'unread' | 'read' = 'all', page = 0, size = 20) =>
    request<NotificationList>(`/notifications?filter=${filter}&page=${page}&size=${size}`),

  markRead: (id: string) =>
    request<NotificationItem>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => request<{ unread: number }>('/notifications/read-all', { method: 'POST' }),

  togglePin: (id: string) =>
    request<NotificationItem>(`/notifications/${id}/pin`, { method: 'POST' }),

  remove: (id: string) =>
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),

  submitFeedback: (content: string) =>
    request<FeedbackResult>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ content })
    }),

  comments: (slug: string, sort: 'recent' | 'likes' = 'recent', page = 0, size = 20, anchor?: string) =>
    request<CommentList>(
      `/posts/${slug}/comments?sort=${sort}&page=${page}&size=${size}${anchor ? `&anchor=${anchor}` : ''}`
    ),

  replies: (commentId: string, sort: 'recent' | 'likes' = 'recent', page = 0, size = 20) =>
    request<ReplyList>(`/posts/comments/${commentId}/replies?sort=${sort}&page=${page}&size=${size}`),

  changelog: () => request<ChangelogEntry[]>('/changelog'),

  addComment: (slug: string, content: string, parentId?: string | null) =>
    request<PostComment>(`/posts/${slug}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId: parentId ?? null })
    }),

  deleteComment: (id: string) =>
    request<void>(`/posts/comments/${id}`, { method: 'DELETE' }),

  likeComment: (id: string) =>
    request<{ active: boolean; count: number }>(`/posts/comments/${id}/like`, { method: 'POST' }),

  postStats: (slug: string) => request<PostStats>(`/posts/${slug}/stats`),

  postStatsList: (slugs: string[]) =>
    request<PostStats[]>(`/posts/stats?slugs=${encodeURIComponent(slugs.join(','))}`),

  recordView: (slug: string) =>
    request<PostStats>(`/posts/${slug}/view`, { method: 'POST' }),

  toggleLike: (slug: string) =>
    request<ReactionResult>(`/posts/${slug}/like`, { method: 'POST' }),

  toggleFavorite: (slug: string) =>
    request<ReactionResult>(`/posts/${slug}/favorite`, { method: 'POST' })
}
