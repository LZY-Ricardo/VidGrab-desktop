import type {
  AnalyzeRequest,
  CurrentUserResponse,
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

function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string | null) {
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    return
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const headers = new Headers(init?.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${cloudApiBase}${path}`, {
    ...init,
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
    throw new Error(detail)
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
