type ResolverHostStatus = {
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

declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

async function getInvoke() {
  const module = await import('@tauri-apps/api/core')
  if (!module.isTauri()) {
    return null
  }
  return module.invoke
}

export async function getResolverHostStatus(): Promise<ResolverHostStatus> {
  const invoke = await getInvoke()
  if (!invoke) {
    return {
      supported: false,
      running: false,
      service_ready: false,
      mode: 'external',
      pid: null,
      message: '当前为浏览器/Vite 模式，请使用 npm run dev:hosted 或手工启动 resolver。',
      workdir: null,
      config_dir: null,
      log_file: null,
    }
  }

  return invoke<ResolverHostStatus>('resolver_status')
}

export async function startResolverHost(): Promise<ResolverHostStatus> {
  const invoke = await getInvoke()
  if (!invoke) {
    throw new Error('当前不是 Tauri 宿主环境，无法由应用内拉起 resolver。')
  }
  return invoke<ResolverHostStatus>('start_resolver')
}

export async function stopResolverHost(): Promise<ResolverHostStatus> {
  const invoke = await getInvoke()
  if (!invoke) {
    throw new Error('当前不是 Tauri 宿主环境，无法由应用内停止 resolver。')
  }
  return invoke<ResolverHostStatus>('stop_resolver')
}
