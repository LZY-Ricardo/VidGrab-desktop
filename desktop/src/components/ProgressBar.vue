<script setup lang="ts">
defineProps<{
  progress: number
  speed: string
  status: 'downloading' | 'completed'
}>()

defineEmits<{
  openFile: []
}>()
</script>

<template>
  <section class="panel">
    <div class="header">
      <div class="title-group">
        <div class="status-icon" :class="{ done: status === 'completed' }">
          <svg v-if="status === 'completed'" class="status-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else class="status-svg spinning" fill="none" viewBox="0 0 24 24">
            <circle class="ring" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="segment" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
        <h3>{{ status === 'completed' ? '下载完成' : '下载进度' }}</h3>
        <p>{{ speed }}</p>
      </div>
      <div class="percent-group">
        <strong>{{ progress.toFixed(1) }}%</strong>
        <span>{{ status === 'completed' ? '文件已就绪' : '正在写入本地文件' }}</span>
      </div>
    </div>

    <div class="progress-shell">
      <div class="track">
        <div class="bar" :class="{ done: status === 'completed' }" :style="{ width: `${progress}%` }" />
      </div>
      <div class="progress-meta">
        <span>{{ status === 'completed' ? '已完成下载，可立即保存到本地' : '下载过程中可继续浏览分析结果' }}</span>
        <span>{{ speed }}</span>
      </div>
    </div>

    <div v-if="status === 'completed'" class="completed-card">
      <div>
        <p class="completed-label">下一步</p>
        <strong>将下载好的文件保存到本地目录</strong>
      </div>
      <button type="button" class="file-button" @click="$emit('openFile')">
        下载到本地
      </button>
    </div>
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

.header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.title-group {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.header h3,
.header p,
.header strong,
.percent-group span,
.completed-label,
.progress-meta span {
  margin: 0;
}

.status-icon {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(219, 234, 254, 0.92);
  color: #2563eb;
}

.status-icon.done {
  background: rgba(220, 252, 231, 0.94);
  color: #15803d;
}

.status-svg {
  width: 18px;
  height: 18px;
}

.spinning {
  animation: spin 1s linear infinite;
}

.ring {
  opacity: 0.24;
}

.segment {
  opacity: 0.88;
}

.header h3 {
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.header p {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}

.percent-group {
  min-width: 88px;
  text-align: right;
}

.header strong {
  color: #0f172a;
  font-size: 24px;
}

.percent-group span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.progress-shell {
  border-radius: 18px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}

.bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 220ms ease;
}

.bar.done {
  background: linear-gradient(90deg, #16a34a, #15803d);
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.progress-meta span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.completed-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background:
    radial-gradient(420px 140px at 100% 0%, rgba(22, 163, 74, 0.08), transparent 55%),
    linear-gradient(180deg, rgba(240, 253, 244, 0.92), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(187, 247, 208, 0.92);
}

.completed-label {
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.completed-card strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 15px;
}

.file-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 12px 24px rgba(22, 163, 74, 0.2);
  transition:
    transform 160ms ease,
    filter 160ms ease;
}

.file-button:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .header,
  .completed-card,
  .progress-meta {
    flex-direction: column;
    align-items: stretch;
  }

  .percent-group {
    text-align: left;
  }

  .file-button {
    width: 100%;
  }
}
</style>
