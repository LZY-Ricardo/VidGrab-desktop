<script setup lang="ts">
import { computed } from 'vue'

import type { VideoInfo } from '@/types'

const props = defineProps<{
  info: VideoInfo
}>()

const thumbnailUrl = computed(() => props.info.thumbnail_proxy_url || props.info.thumbnail || null)

function getPlatformIcon(platform?: string) {
  const normalized = (platform || '').toLowerCase()
  const icons: Record<string, string> = {
    bilibili: '📺',
    youtube: '▶',
    tiktok: '♪',
    instagram: '◎',
  }
  return icons[normalized] || '▶'
}

function getPlatformClass(platform?: string) {
  const normalized = (platform || '').toLowerCase()
  if (normalized === 'bilibili') return 'platform-bilibili'
  if (normalized === 'youtube') return 'platform-youtube'
  if (normalized === 'tiktok') return 'platform-tiktok'
  if (normalized === 'instagram') return 'platform-instagram'
  return 'platform-default'
}

function formatDuration(seconds?: number) {
  if (!seconds) return '未知时长'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatViews(value?: number) {
  if (!value) return '未知播放'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return `${value}`
}
</script>

<template>
  <section class="panel video-panel">
    <div class="media-wrap">
      <div class="media">
        <img v-if="thumbnailUrl" :src="thumbnailUrl" :alt="info.title" />
        <div v-else class="media-fallback" :class="getPlatformClass(info.platform)">
          <span class="fallback-icon">{{ getPlatformIcon(info.platform) }}</span>
          <span>{{ info.platform || 'video' }}</span>
        </div>
      </div>

      <div class="media-overlay">
        <span class="overlay-chip">
          {{ formatDuration(info.duration) }}
        </span>
        <span class="overlay-chip">
          {{ formatViews(info.view_count) }} 次观看
        </span>
      </div>
    </div>

    <div class="content">
      <div class="title-row">
        <div class="title-block">
          <h2>{{ info.title }}</h2>
          <p v-if="info.uploader" class="meta">{{ info.uploader }}</p>
        </div>

        <span class="badge" :class="getPlatformClass(info.platform)">
          <span class="badge-icon">{{ getPlatformIcon(info.platform) }}</span>
          {{ info.platform }}
        </span>
      </div>

      <div class="stats">
        <span>{{ formatDuration(info.duration) }}</span>
        <span>{{ formatViews(info.view_count) }} views</span>
        <span>{{ info.formats.length }} formats</span>
      </div>

      <p v-if="info.note" class="note">{{ info.note }}</p>
      <p v-if="info.error" class="warning">{{ info.error }}</p>

      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">平台</span>
          <strong>{{ info.platform || '未知' }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">时长</span>
          <strong>{{ formatDuration(info.duration) }}</strong>
        </div>
        <div class="summary-card">
          <span class="summary-label">可选格式</span>
          <strong>{{ info.formats.length }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.video-panel {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 22px;
  padding: 22px;
}

.media-wrap {
  position: relative;
}

.media {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(145deg, #dbeafe, #f8fafc);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #1d4ed8;
  font-size: 15px;
  font-weight: 700;
  text-transform: capitalize;
}

.fallback-icon {
  font-size: 34px;
  line-height: 1;
}

.media-overlay {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.overlay-chip {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.title-block {
  min-width: 0;
}

.title-row h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.4;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
  border: 1px solid transparent;
}

.badge-icon {
  line-height: 1;
}

.meta,
.note,
.warning {
  margin: 0;
  line-height: 1.6;
}

.meta {
  color: #475569;
  font-size: 14px;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.stats span {
  padding: 8px 10px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff, #f1f5f9);
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.note {
  color: #2563eb;
  font-size: 14px;
  line-height: 1.7;
}

.warning {
  color: #b45309;
  font-size: 14px;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 14px 14px 13px;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.95));
}

.summary-card strong {
  display: block;
  margin-top: 6px;
  color: #0f172a;
  font-size: 15px;
}

.summary-label {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.platform-bilibili {
  background: rgba(252, 231, 243, 0.9);
  color: #be185d;
  border-color: rgba(244, 114, 182, 0.22);
}

.platform-youtube {
  background: rgba(254, 242, 242, 0.92);
  color: #b91c1c;
  border-color: rgba(248, 113, 113, 0.22);
}

.platform-tiktok {
  background: rgba(241, 245, 249, 0.92);
  color: #334155;
  border-color: rgba(148, 163, 184, 0.2);
}

.platform-instagram {
  background: rgba(243, 232, 255, 0.92);
  color: #7e22ce;
  border-color: rgba(192, 132, 252, 0.22);
}

.platform-default {
  background: rgba(239, 246, 255, 0.92);
  color: #1d4ed8;
  border-color: rgba(96, 165, 250, 0.22);
}

@media (max-width: 840px) {
  .video-panel {
    grid-template-columns: 1fr;
  }

  .title-row {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
