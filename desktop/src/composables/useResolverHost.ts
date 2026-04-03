import { onMounted, onUnmounted, ref } from 'vue'

import {
  getResolverHostStatus,
  startResolverHost,
  stopResolverHost,
} from '@/api/hostBridge'

type HostStatus = {
  supported: boolean
  running: boolean
  service_ready: boolean
  mode: 'tauri' | 'external'
  pid?: number | null
  message: string
  workdir?: string | null
  config_dir?: string | null
  log_file?: string | null
}

const hostStatus = ref<HostStatus>({
  supported: false,
  running: false,
  service_ready: false,
  mode: 'external',
  pid: null,
  message: '尚未检测 resolver 宿主状态',
  workdir: null,
  config_dir: null,
  log_file: null,
})
const loading = ref(false)
const actionLoading = ref(false)
const error = ref<string | null>(null)
const lastUpdatedAt = ref<string | null>(null)
const lastRefreshSource = ref<'auto' | 'manual' | 'action' | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

export function useResolverHost() {
  function markUpdated(source: 'auto' | 'manual' | 'action') {
    lastUpdatedAt.value = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
    })
    lastRefreshSource.value = source
  }

  async function refreshHostStatus(source: 'auto' | 'manual' = 'manual') {
    loading.value = true
    error.value = null
    try {
      hostStatus.value = await getResolverHostStatus()
      markUpdated(source)
      return hostStatus.value
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '获取宿主状态失败'
      return hostStatus.value
    } finally {
      loading.value = false
    }
  }

  async function startHostedResolver() {
    actionLoading.value = true
    error.value = null
    try {
      hostStatus.value = await startResolverHost()
      markUpdated('action')
      return hostStatus.value
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '启动 resolver 失败'
      throw requestError
    } finally {
      actionLoading.value = false
    }
  }

  async function stopHostedResolver() {
    actionLoading.value = true
    error.value = null
    try {
      hostStatus.value = await stopResolverHost()
      markUpdated('action')
      return hostStatus.value
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '停止 resolver 失败'
      throw requestError
    } finally {
      actionLoading.value = false
    }
  }

  function startPolling() {
    if (pollTimer) return
    pollTimer = setInterval(() => {
      void refreshHostStatus('auto')
    }, 3000)
  }

  function stopPolling() {
    if (!pollTimer) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  onMounted(() => {
    void refreshHostStatus('auto')
    startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    actionLoading,
    error,
    hostStatus,
    lastRefreshSource,
    lastUpdatedAt,
    loading,
    refreshHostStatus,
    startHostedResolver,
    stopHostedResolver,
  }
}
