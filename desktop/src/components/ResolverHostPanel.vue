<script setup lang="ts">
import { computed } from 'vue'

import { useResolverHost } from '@/composables/useResolverHost'

const {
  actionLoading,
  error,
  hostStatus,
  lastRefreshSource,
  lastUpdatedAt,
  loading,
  refreshHostStatus,
  startHostedResolver,
  stopHostedResolver,
} = useResolverHost()

const stateLabel = computed(() => {
  if (hostStatus.value.running && hostStatus.value.service_ready) return 'resolver 运行中且健康'
  if (hostStatus.value.running) return 'resolver 进程已启动，等待健康检查'
  if (hostStatus.value.supported) return '可由 Tauri 宿主管理'
  return '当前未启用 Tauri 宿主'
})

const refreshHint = computed(() => {
  if (!lastUpdatedAt.value) return '尚未完成状态同步'
  if (lastRefreshSource.value === 'manual') return `已手动刷新：${lastUpdatedAt.value}`
  if (lastRefreshSource.value === 'action') return `已更新状态：${lastUpdatedAt.value}`
  return `自动轮询更新：${lastUpdatedAt.value}`
})

async function handleStart() {
  try {
    await startHostedResolver()
  } catch {
    // error is exposed by composable
  }
}

async function handleStop() {
  try {
    await stopHostedResolver()
  } catch {
    // error is exposed by composable
  }
}
</script>

<template>
  <section class="panel">
    <div class="heading">
      <div>
        <span class="eyebrow">Host Runtime</span>
        <h2>Resolver 宿主管理</h2>
        <p>{{ stateLabel }}</p>
      </div>
      <span class="badge" :class="{ active: hostStatus.running }">
        {{ hostStatus.mode }}
      </span>
    </div>

    <div class="summary-strip">
      <div class="summary-chip" :class="{ success: hostStatus.service_ready, warn: hostStatus.running && !hostStatus.service_ready }">
        <span class="chip-label">运行状态</span>
        <strong>{{ hostStatus.running ? '已启动' : '未启动' }}</strong>
      </div>
      <div class="summary-chip" :class="{ success: hostStatus.service_ready }">
        <span class="chip-label">健康检查</span>
        <strong>{{ hostStatus.service_ready ? '已通过' : '未通过' }}</strong>
      </div>
      <div class="summary-chip">
        <span class="chip-label">最近同步</span>
        <strong>{{ lastUpdatedAt || '尚未同步' }}</strong>
      </div>
    </div>

    <div class="status-card">
      <div class="status-row">
        <span class="line-label">状态说明</span>
        <p class="line-value">{{ hostStatus.message }}</p>
      </div>
      <div class="status-grid">
        <div class="detail-card">
          <span class="detail-label">PID</span>
          <strong>{{ hostStatus.pid ?? '无' }}</strong>
        </div>
        <div class="detail-card">
          <span class="detail-label">同步来源</span>
          <strong>{{ refreshHint }}</strong>
        </div>
        <div class="detail-card">
          <span class="detail-label">工作目录</span>
          <strong>{{ hostStatus.workdir ?? '无' }}</strong>
        </div>
        <div class="detail-card">
          <span class="detail-label">配置目录</span>
          <strong>{{ hostStatus.config_dir ?? '无' }}</strong>
        </div>
      </div>

      <div class="log-card">
        <span class="detail-label">日志文件</span>
        <strong>{{ hostStatus.log_file ?? '无' }}</strong>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="primary" :disabled="actionLoading || !hostStatus.supported || hostStatus.running" @click="handleStart">
        {{ actionLoading ? '处理中...' : '应用内启动 resolver' }}
      </button>
      <button type="button" class="ghost" :disabled="actionLoading || !hostStatus.supported || !hostStatus.running" @click="handleStop">
        停止 resolver
      </button>
      <button type="button" class="secondary" :disabled="loading" @click="refreshHostStatus">
        {{ loading ? '刷新中...' : '刷新状态' }}
      </button>
    </div>

    <p v-if="error" class="message error">{{ error }}</p>
    <p v-else-if="!hostStatus.supported" class="message info">
      当前还是浏览器/Vite 模式。真正的应用内托管需要通过 `npm run tauri:dev` 在 Tauri 宿主中运行。
    </p>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.heading h2,
.heading p {
  margin: 0;
}

.heading h2 {
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
}

.heading p {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.badge.active {
  background: #ecfdf5;
  color: #15803d;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-chip {
  padding: 12px 13px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.summary-chip.success {
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.94), rgba(255, 255, 255, 0.98));
  border-color: rgba(187, 247, 208, 0.92);
}

.summary-chip.warn {
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.94), rgba(255, 255, 255, 0.98));
  border-color: rgba(253, 186, 116, 0.72);
}

.chip-label,
.detail-label,
.line-label {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.summary-chip strong,
.detail-card strong,
.log-card strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

.status-card {
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.status-row {
  margin-bottom: 14px;
}

.line-value {
  margin: 7px 0 0;
  color: #334155;
  line-height: 1.75;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.detail-card,
.log-card {
  padding: 12px 13px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.log-card {
  margin-top: 10px;
}

.actions {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.primary,
.secondary,
.ghost {
  border-radius: 14px;
  padding: 11px 14px;
  font-weight: 700;
  font-size: 14px;
}

.primary {
  border: 0;
  background: linear-gradient(135deg, #2563eb, #1d4ed8 62%, #1e40af);
  color: #fff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
}

.secondary {
  border: 0;
  background: #eff6ff;
  color: #1d4ed8;
}

.ghost {
  border: 1px solid #dbe4f0;
  background: #fff;
  color: #475569;
}

.primary:disabled,
.secondary:disabled,
.ghost:disabled {
  background: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
}

.primary:hover:not(:disabled),
.secondary:hover:not(:disabled),
.ghost:hover:not(:disabled) {
  transform: translateY(-1px);
}

.message {
  margin: 14px 0 0;
  border-radius: 16px;
  padding: 12px 14px;
  line-height: 1.7;
}

.message.error {
  background: #fff7ed;
  color: #9a3412;
}

.message.info {
  background: #eff6ff;
  color: #1d4ed8;
}

@media (max-width: 720px) {
  .summary-strip,
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
