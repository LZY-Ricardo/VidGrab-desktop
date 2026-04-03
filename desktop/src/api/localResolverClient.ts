import type { DownloadRequest, DownloadResponse, TaskStatus, VideoInfo } from '@shared/contracts'

const localResolverBase =
  (import.meta.env.VITE_LOCAL_RESOLVER_BASE_URL as string | undefined)?.trim() ||
  'http://127.0.0.1:61337/api'

type HttpMethod = 'GET' | 'POST'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${localResolverBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
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

function send<TResponse, TBody>(path: string, method: HttpMethod, body?: TBody): Promise<TResponse> {
  return request<TResponse>(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
}

export const LOCAL_RESOLVER_BASE = localResolverBase

export const localResolverClient = {
  getHealth() {
    return request<{ status: string }>('/health')
  },
  getInfo(payload: { url: string }) {
    return send<VideoInfo, { url: string }>('/info', 'POST', payload)
  },
  createDownload(payload: DownloadRequest) {
    return send<DownloadResponse, DownloadRequest>('/download', 'POST', payload)
  },
  getTaskStatus(taskId: string) {
    return request<TaskStatus>(`/download/status/${taskId}`)
  },
  getDownloadFileUrl(taskId: string) {
    return `${localResolverBase}/download/file/${taskId}`
  },
  getProxyImageUrl(url: string, platform?: string) {
    const params = new URLSearchParams({ url })
    if (platform) {
      params.set('platform', platform)
    }
    return `${localResolverBase}/proxy/image?${params.toString()}`
  },
}
