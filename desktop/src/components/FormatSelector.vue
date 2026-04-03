<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { VideoFormat } from '@/types'

const props = defineProps<{
  formats: VideoFormat[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  download: [payload: { format: string; quality: string }]
}>()

const selectedFormatId = ref('')

const sortedFormats = computed(() =>
  [...props.formats].sort((left, right) => {
    const leftQuality = Number.parseInt(left.quality, 10) || 0
    const rightQuality = Number.parseInt(right.quality, 10) || 0
    return rightQuality - leftQuality
  }),
)

watch(
  () => sortedFormats.value,
  (formats) => {
    if (formats.length > 0 && !selectedFormatId.value) {
      selectedFormatId.value = formats[0].format_id
    }
  },
  { immediate: true },
)

const selectedFormat = computed(
  () => sortedFormats.value.find((item) => item.format_id === selectedFormatId.value) || sortedFormats.value[0],
)

const recommendedFormatId = computed(() => sortedFormats.value[0]?.format_id ?? '')

function handleDownload() {
  if (!selectedFormat.value) return
  emit('download', {
    format: selectedFormat.value.ext,
    quality: selectedFormat.value.quality.replace('p', ''),
  })
}
</script>

<template>
  <section class="panel">
    <div class="header">
      <div class="header-copy">
        <h3>选择下载格式</h3>
        <p>选择最适合您需求的格式和质量</p>
      </div>
      <button type="button" class="primary" :disabled="disabled || !selectedFormat" @click="handleDownload">
        <svg class="primary-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        开始下载
      </button>
    </div>

    <div class="formats">
      <label
        v-for="format in sortedFormats"
        :key="format.format_id"
        class="format-item"
        :class="{ selected: format.format_id === selectedFormatId }"
      >
        <input v-model="selectedFormatId" type="radio" :value="format.format_id" />
        <div class="main">
          <div class="title-line">
            <span v-if="selectedFormatId === format.format_id" class="selected-chip">已选中</span>
            <span v-else-if="recommendedFormatId === format.format_id" class="selected-chip subtle">推荐</span>
            <strong>{{ format.ext.toUpperCase() }} · {{ format.quality }}</strong>
          </div>
          <div class="meta-line">
            <span>{{ format.resolution || '未知分辨率' }}</span>
            <span>{{ format.fps_display || '未知 FPS' }}</span>
            <span class="filesize">{{ format.filesize_display || '未知大小' }}</span>
          </div>
        </div>
        <div class="indicator" :class="{ active: format.format_id === selectedFormatId }">
          <svg v-if="format.format_id === selectedFormatId" class="indicator-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </label>
    </div>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 22px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.header-copy {
  min-width: 0;
}

.header h3,
.header p {
  margin: 0;
}

.header h3 {
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.header p {
  margin-top: 5px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8 62%, #1e40af);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
  transition:
    transform 160ms ease,
    filter 160ms ease,
    box-shadow 220ms ease;
}

.primary:hover:not(:disabled) {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.primary-icon {
  width: 16px;
  height: 16px;
}

.primary:disabled {
  background: #cbd5e1;
  box-shadow: none;
  cursor: not-allowed;
}

.formats {
  display: grid;
  gap: 10px;
}

.format-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.9));
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 140ms ease,
    background-color 180ms ease;
}

.format-item.selected {
  border-color: #60a5fa;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.62));
}

.format-item:hover {
  transform: translateY(-1px);
}

.format-item input {
  margin: 0;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.main strong {
  color: #0f172a;
  font-size: 14px;
}

.meta-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.meta-line span {
  color: #64748b;
  font-size: 12px;
}

.filesize {
  color: #374151;
  font-weight: 600;
}

.selected-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.9);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.selected-chip.subtle {
  background: rgba(220, 252, 231, 0.92);
  color: #15803d;
}

.indicator {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 180ms ease,
    border-color 180ms ease;
}

.indicator.active {
  border-color: #3b82f6;
  background: #3b82f6;
}

.indicator-icon {
  width: 10px;
  height: 10px;
  color: #fff;
}

@media (max-width: 720px) {
  .header {
    flex-direction: column;
  }

  .primary {
    width: 100%;
    justify-content: center;
  }

  .format-item {
    grid-template-columns: 20px minmax(0, 1fr) 22px;
  }
}
</style>
