<script setup lang="ts">
import { computed, watch } from 'vue'

import AIAssistant from '@/components/AIAssistant.vue'
import FormatSelector from '@/components/FormatSelector.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import VideoInfo from '@/components/VideoInfo.vue'
import { useDownload } from '@/composables/useDownload'
import type { MembershipStatus, UserProfile } from '@/types'

const props = defineProps<{
  authenticated: boolean
  currentUser: UserProfile | null
  membership: MembershipStatus | null
  membershipLoading: boolean
}>()

const {
  canParse,
  canStartDownload,
  error,
  extractedUrl,
  getInfo,
  loading,
  openDownloadedFile,
  progress,
  speed,
  startDownload,
  status,
  url,
  videoInfo,
} = useDownload()

const emit = defineEmits<{
  urlChange: [value: string]
}>()

const hasVideoInfo = computed(() => Boolean(videoInfo.value) && status.value !== 'fetching')

watch(
  () => url.value,
  (nextValue) => {
    emit('urlChange', nextValue)
  },
  { immediate: true },
)
</script>

<template>
  <div class="download-shell max-w-7xl mx-auto px-4 sm:px-6" :class="hasVideoInfo ? 'py-4 sm:py-5' : 'py-6 sm:py-8'">
    <div :class="hasVideoInfo ? 'max-w-7xl mx-auto' : 'max-w-3xl mx-auto'">
      <div v-if="!hasVideoInfo" class="text-center mb-7 sm:mb-8">
        <h1 class="hero-title text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
          万能视频下载器
        </h1>
        <p class="hero-subtitle text-gray-500 text-xs sm:text-base">
          支持 YouTube、Bilibili、TikTok 等 100+ 平台
        </p>
      </div>

      <div :class="hasVideoInfo ? 'mb-3' : 'mb-6'">
        <div class="hero-input-wrap flex flex-col sm:flex-row gap-2">
          <div class="flex-1 relative">
            <input
              v-model="url"
              type="text"
              placeholder="粘贴视频链接..."
              :class="[
                'vg-input w-full rounded-lg focus:outline-none',
                hasVideoInfo ? 'px-4 py-2 text-sm' : 'px-5 py-3.5',
              ]"
              @keyup.enter="getInfo"
            />
          </div>
          <button
            type="button"
            :disabled="!canParse"
            :class="[
              'vg-btn-primary w-full sm:w-auto font-medium rounded-lg whitespace-nowrap',
              hasVideoInfo ? 'px-4 py-2 text-sm' : 'px-6 sm:px-8',
            ]"
            @click="getInfo"
          >
            {{ loading && status === 'fetching' ? '解析中...' : '解析视频' }}
          </button>
        </div>

        <p v-if="!hasVideoInfo" class="hero-helper mt-2 text-xs text-slate-500">
          支持公开可访问视频链接，解析与下载完成后服务器自动清理临时文件
        </p>

        <div v-if="error" class="vg-alert vg-alert-error mt-2 p-2.5 text-sm whitespace-pre-line">
          {{ error }}
        </div>

        <div v-if="extractedUrl" class="vg-alert vg-alert-success mt-2 p-2.5 text-sm flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="flex-1 truncate">已自动提取链接：{{ extractedUrl }}</span>
        </div>
      </div>
    </div>

    <div v-if="hasVideoInfo && videoInfo" class="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
      <div class="flex flex-col gap-3">
        <VideoInfo :info="videoInfo" />

        <FormatSelector
          v-if="status === 'ready' && videoInfo.formats.length > 0"
          :formats="videoInfo.formats"
          :disabled="!canStartDownload || loading"
          @download="startDownload"
        />

        <ProgressBar
          v-if="status === 'downloading' || status === 'completed'"
          :progress="progress"
          :speed="speed"
          :status="status === 'completed' ? 'completed' : 'downloading'"
          @open-file="openDownloadedFile"
        />
      </div>

      <div class="relative min-w-0">
        <div class="lg:absolute lg:inset-0 lg:overflow-auto">
          <AIAssistant
            :url="url"
            :authenticated="authenticated"
            :current-user="currentUser"
            :membership="membership"
            :membership-loading="membershipLoading"
          />
        </div>
      </div>
    </div>

    <div v-if="!hasVideoInfo" class="mt-10 sm:mt-12 text-center max-w-3xl mx-auto">
      <h3 class="text-sm font-medium text-gray-500 mb-5 uppercase tracking-wide">支持平台</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="platform-mini-card vg-card-soft px-5 py-3 rounded-lg">
          <span class="font-medium text-gray-700">YouTube</span>
        </div>
        <div class="platform-mini-card vg-card-soft px-5 py-3 rounded-lg">
          <span class="font-medium text-gray-700">Bilibili</span>
        </div>
        <div class="platform-mini-card vg-card-soft px-5 py-3 rounded-lg">
          <span class="font-medium text-gray-700">TikTok</span>
        </div>
        <div class="platform-mini-card vg-card-soft px-5 py-3 rounded-lg">
          <span class="font-medium text-gray-700">Instagram</span>
        </div>
      </div>
      <p class="text-sm text-gray-400 mt-4">以及 100+ 其他视频平台</p>
    </div>
  </div>
</template>

<style scoped>
input::placeholder {
  color: #9ca3af;
}

.download-shell {
  position: relative;
}

.hero-title {
  letter-spacing: -0.02em;
}

.hero-subtitle {
  line-height: 1.6;
}

.hero-helper {
  line-height: 1.5;
  padding-left: 0.25rem;
}

.hero-input-wrap {
  padding: 0.36rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: saturate(145%) blur(10px);
  transition:
    box-shadow 220ms ease,
    border-color 220ms ease,
    background-color 220ms ease;
}

.platform-mini-card {
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease,
    transform 160ms ease;
}

.platform-mini-card:hover {
  border-color: rgba(96, 165, 250, 0.44);
  box-shadow: 0 10px 22px rgba(30, 64, 175, 0.1);
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .hero-input-wrap {
    padding: 0.44rem;
    border-radius: 13px;
  }

  .platform-mini-card {
    padding: 0.65rem 0.75rem;
  }

  .hero-helper {
    font-size: 0.72rem;
    padding-left: 0.1rem;
    padding-right: 0.1rem;
  }
}
</style>
