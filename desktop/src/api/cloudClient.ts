import type {
  AnalyzeRequest,
  CurrentUserResponse,
  LocalAnalyzeRequest,
  LoginRequest,
  LoginResponse,
  MembershipStatus,
  RegisterRequest,
  RegisterResponse,
  VideoAnalysisResponse,
  VideoChatResponse,
} from '@/types'

const cloudApiBase =
  (import.meta.env.VITE_CLOUD_API_BASE_URL as string | undefined)?.trim() ||
  'https://api.vidgrab.sunandyu.top/api'

const ACCESS_TOKEN_KEY = 'vidgrab.desktop.access-token'
let accessTokenCache: string | null = readPersistedAccessToken()

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readPersistedAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

function getAccessToken() {
  if (accessTokenCache) {
    return accessTokenCache
  }

  accessTokenCache = readPersistedAccessToken()
  return accessTokenCache
}

export function setAccessToken(token: string | null) {
  accessTokenCache = token

  if (token) {
    try {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } catch {
      // Tauri WebView / 隐私环境下本地持久化失败时，至少保留当前会话内存态。
    }
    return
  }

  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    // ignore persistence cleanup errors
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const headers = new Headers(init?.headers || {})
  if (init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await window.fetch(`${cloudApiBase}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    let detail = '请求失败'
    try {
      const payload = (await response.json()) as { detail?: string }
      detail = payload.detail || detail
    } catch {
      detail = response.statusText || detail
    }
    throw new ApiError(response.status, detail)
  }

  return (await response.json()) as T
}

export const CLOUD_API_BASE = cloudApiBase

export const cloudClient = {
  getCurrentUser() {
    return request<CurrentUserResponse>('/auth/me', { method: 'GET' })
  },
  register(payload: RegisterRequest) {
    return request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload: LoginRequest) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  logout() {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
    })
  },
  getMembership() {
    return request<MembershipStatus>('/membership/me', { method: 'GET' })
  },
  analyzeVideo(payload: AnalyzeRequest) {
    return request<VideoAnalysisResponse>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  analyzePreparedVideo(payload: LocalAnalyzeRequest) {
    return request<VideoAnalysisResponse>('/ai/analyze/local', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  askVideoQuestion(payload: { analysis_id: string; question: string }) {
    return request<VideoChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getTranscriptDownloadUrl(analysisId: string, format: 'srt' | 'vtt' | 'txt') {
    return `${cloudApiBase}/ai/transcript/download/${encodeURIComponent(analysisId)}?format=${encodeURIComponent(format)}`
  },
}
