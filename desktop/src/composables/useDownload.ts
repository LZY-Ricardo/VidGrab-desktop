import { computed, onUnmounted, ref } from 'vue'

import { LOCAL_RESOLVER_BASE, localResolverClient } from '@/api/localResolverClient'
import type { DownloadRequest, VideoInfo } from '@/types'

type DownloadUiStatus =
  | 'idle'
  | 'resolver-checking'
  | 'fetching'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'error'

export function useDownload() {
  const url = ref('')
  const videoInfo = ref<VideoInfo | null>(null)
  const taskId = ref<string | null>(null)
  const resolverHealthy = ref<boolean | null>(null)
  const status = ref<DownloadUiStatus>('idle')
  const progress = ref(0)
  const speed = ref('0KB/s')
  const error = ref<string | null>(null)
  const loading = ref(false)
  const extractedUrl = ref<string | null>(null)
  const polling = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let extractedUrlTimer: ReturnType<typeof setTimeout> | null = null

  const resolverBase = LOCAL_RESOLVER_BASE

  const canParse = computed(() => !loading.value && Boolean(url.value.trim()))
  const canStartDownload = computed(
    () => status.value === 'ready' && Boolean(videoInfo.value?.formats?.length),
  )

  function clearPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    polling.value = false
  }

  function clearExtractedUrlTimer() {
    if (extractedUrlTimer) {
      clearTimeout(extractedUrlTimer)
      extractedUrlTimer = null
    }
  }

  function extractUrl(input: string): string {
    const match = input.match(/(https?:\/\/[^\s\u4e00-\u9fa5]+)/)
    return match ? match[0] : input.trim()
  }

  function normalizeVideoInfo(info: VideoInfo): VideoInfo {
    const proxyUrl =
      info.thumbnail && !info.thumbnail_proxy_url
        ? localResolverClient.getProxyImageUrl(info.thumbnail, info.platform)
        : info.thumbnail_proxy_url

    return {
      ...info,
      thumbnail_proxy_url: proxyUrl,
    }
  }

  async function checkResolverHealth(): Promise<boolean> {
    status.value = status.value === 'idle' ? 'resolver-checking' : status.value
    try {
      const response = await localResolverClient.getHealth()
      resolverHealthy.value = response.status === 'ok'
      return resolverHealthy.value
    } catch {
      resolverHealthy.value = false
      return false
    }
  }

  async function getInfo() {
    const rawInput = url.value.trim()
    if (!rawInput) {
      error.value = '请输入视频链接'
      return
    }

    const resolvedUrl = extractUrl(rawInput)
    if (resolvedUrl !== rawInput) {
      extractedUrl.value = resolvedUrl
      clearExtractedUrlTimer()
      extractedUrlTimer = setTimeout(() => {
        extractedUrl.value = null
        extractedUrlTimer = null
      }, 5000)
      url.value = resolvedUrl
    } else {
      extractedUrl.value = null
      clearExtractedUrlTimer()
    }

    loading.value = true
    error.value = null
    status.value = 'fetching'
    videoInfo.value = null
    taskId.value = null
    progress.value = 0
    speed.value = '0KB/s'
    clearPolling()

    const healthy = await checkResolverHealth()
    if (!healthy) {
      error.value = [
        '本地解析服务不可用。',
        '请先在 `resolver/` 目录启动本地服务：',
        '1. `pip install -r requirements.txt`',
        '2. `python server.py`',
        `3. 确认本地地址可访问：${resolverBase}`,
      ].join('\n')
      status.value = 'error'
      loading.value = false
      return
    }

    try {
      const response = await localResolverClient.getInfo({ url: url.value })
      videoInfo.value = normalizeVideoInfo(response)
      status.value = 'ready'
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '解析失败'
      status.value = 'error'
    } finally {
      loading.value = false
    }
  }

  async function startDownload(options: Omit<DownloadRequest, 'url'>) {
    if (!url.value.trim()) {
      error.value = '请先输入视频链接'
      return
    }

    loading.value = true
    error.value = null
    status.value = 'downloading'
    progress.value = 0
    speed.value = '0KB/s'
    clearPolling()

    try {
      const response = await localResolverClient.createDownload({
        url: url.value.trim(),
        ...options,
      })
      taskId.value = response.task_id
      pollStatus(response.task_id)
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '创建下载任务失败'
      status.value = 'error'
      loading.value = false
    }
  }

  function pollStatus(id: string) {
    clearPolling()
    polling.value = true
    pollTimer = setInterval(async () => {
      try {
        const response = await localResolverClient.getTaskStatus(id)
        progress.value = response.progress
        speed.value = response.speed

        if (response.status === 'completed') {
          status.value = 'completed'
          loading.value = false
          clearPolling()
          return
        }

        if (response.status === 'failed') {
          error.value = response.error || '下载失败'
          status.value = 'error'
          loading.value = false
          clearPolling()
        }
      } catch (requestError) {
        error.value = requestError instanceof Error ? requestError.message : '获取下载状态失败'
        status.value = 'error'
        loading.value = false
        clearPolling()
      }
    }, 700)
  }

  function openDownloadedFile() {
    if (!taskId.value) {
      return
    }
    window.open(localResolverClient.getDownloadFileUrl(taskId.value), '_blank', 'noopener,noreferrer')
  }

  function reset() {
    clearPolling()
    clearExtractedUrlTimer()
    videoInfo.value = null
    taskId.value = null
    status.value = 'idle'
    progress.value = 0
    speed.value = '0KB/s'
    error.value = null
    loading.value = false
    extractedUrl.value = null
  }

  onUnmounted(() => {
    clearPolling()
    clearExtractedUrlTimer()
  })

  return {
    canParse,
    canStartDownload,
    error,
    extractedUrl,
    getInfo,
    loading,
    openDownloadedFile,
    progress,
    reset,
    resolverBase,
    resolverHealthy,
    speed,
    startDownload,
    status,
    taskId,
    url,
    videoInfo,
  }
}
