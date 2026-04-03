<script setup lang="ts">
import { computed, watch } from 'vue'

import MindMapTree from '@/components/MindMapTree.vue'
import { useVideoAI, type TranscriptFormat } from '@/composables/useVideoAI'
import type { MembershipStatus, UserProfile } from '@/types'

const props = defineProps<{
  url: string
  authenticated: boolean
  currentUser: UserProfile | null
  membership: MembershipStatus | null
  membershipLoading: boolean
}>()

const {
  analysisError,
  analysisResult,
  analyzeVideo,
  analyzing,
  askQuestion,
  asking,
  chatHistory,
  downloadingTranscriptFormat,
  downloadTranscript,
  question,
  resetAI,
} = useVideoAI()

const canUseAi = computed(() => props.authenticated)
const aiStatus = computed(() => {
  if (!props.authenticated) return '请先登录后使用 AI'
  if (props.membership?.is_member) return `VIP 已开通，剩余 ${props.membership.remaining_days} 天`
  return '当前为免费体验模式，每日 2 次 AI 分析'
})

const transcriptActions: { key: TranscriptFormat; label: string }[] = [
  { key: 'srt', label: 'SRT' },
  { key: 'vtt', label: 'VTT' },
  { key: 'txt', label: 'TXT' },
]

watch(
  () => props.url,
  (nextUrl, previousUrl) => {
    if (previousUrl && nextUrl !== previousUrl) {
      resetAI()
    }
  },
)
</script>

<template>
  <section class="panel ai-panel">
    <div class="heading">
      <div>
        <span class="eyebrow">Cloud AI</span>
        <h2>AI 学习助手</h2>
        <p>{{ aiStatus }}</p>
      </div>
      <button type="button" class="primary" :disabled="!canUseAi || analyzing || !url.trim()" @click="analyzeVideo(url)">
        {{ analyzing ? '分析中...' : analysisResult ? '重新分析' : '开始 AI 分析' }}
      </button>
    </div>

    <div v-if="analysisError" class="message error">{{ analysisError }}</div>

    <div v-if="!authenticated" class="placeholder">
      <div class="placeholder-icon">AI</div>
      <h3>登录后使用 AI 学习助手</h3>
      <p>完成登录后即可生成总结、字幕、思维导图和问答上下文。</p>
    </div>
    <div v-else-if="membershipLoading" class="placeholder">正在加载会员状态...</div>
    <div v-else-if="analyzing" class="placeholder">云端正在分析视频内容，请稍候...</div>
    <div v-else-if="!analysisResult" class="placeholder">
      <div class="placeholder-icon">✦</div>
      <h3>准备开始 AI 分析</h3>
      <p>解析视频后，点击右上角按钮即可生成 AI 总结、字幕和问答上下文。</p>
    </div>
    <div v-else class="stack">
      <section class="block intro-block">
        <div class="intro-row">
          <div>
            <span class="mini-label">视频标题</span>
            <h3>{{ analysisResult.video_title }}</h3>
          </div>
          <div class="stat-badges">
            <span class="stat-badge">{{ analysisResult.transcript.length }} 段字幕</span>
            <span class="stat-badge">{{ membership?.is_member ? 'VIP 已开通' : '免费体验' }}</span>
          </div>
        </div>
        <p class="overview">{{ analysisResult.summary.overview }}</p>
      </section>

      <section class="block">
        <div class="subhead">
          <h3>核心要点</h3>
          <span>自动提炼关键信息</span>
        </div>
        <ul class="list">
          <li v-for="(point, index) in analysisResult.summary.key_points" :key="`${index}-${point}`">
            {{ point }}
          </li>
        </ul>
      </section>

      <section class="block">
        <div class="subhead">
          <h3>章节结构</h3>
          <span>适合快速复盘</span>
        </div>
        <div class="sections">
          <article v-for="(section, index) in analysisResult.summary.sections" :key="`${section.start}-${index}`">
            <span>{{ section.start }}</span>
            <strong>{{ section.title }}</strong>
            <p>{{ section.summary }}</p>
          </article>
        </div>
      </section>

      <section class="block">
        <div class="subhead">
          <h3>字幕下载</h3>
          <div class="chips">
            <button
              v-for="item in transcriptActions"
              :key="item.key"
              type="button"
              class="chip"
              :disabled="downloadingTranscriptFormat !== null"
              @click="downloadTranscript(item.key)"
            >
              {{ downloadingTranscriptFormat === item.key ? `${item.label}...` : item.label }}
            </button>
          </div>
        </div>
        <div class="transcript">
          <article v-for="segment in analysisResult.transcript.slice(0, 12)" :key="`${segment.timestamp}-${segment.start}`">
            <span>{{ segment.timestamp }}</span>
            <p>{{ segment.text }}</p>
          </article>
        </div>
      </section>

      <section class="block">
        <h3>思维导图</h3>
        <MindMapTree :node="analysisResult.mind_map" />
      </section>

      <section class="block">
        <div class="subhead">
          <h3>AI 问答</h3>
          <span>基于当前分析结果</span>
        </div>
        <div class="ask-row">
          <input
            v-model="question"
            type="text"
            placeholder="例如：这个视频的核心方法是什么？"
            @keyup.enter="askQuestion"
          />
          <button type="button" class="secondary" :disabled="asking || !question.trim()" @click="askQuestion">
            {{ asking ? '发送中...' : '提问' }}
          </button>
        </div>
        <div class="chat-list">
          <article v-for="(item, index) in chatHistory" :key="index" class="chat-item">
            <strong>问：{{ item.question }}</strong>
            <p>答：{{ item.answer }}</p>
            <div v-if="item.citations.length" class="citations">
              <span v-for="(citation, citationIndex) in item.citations" :key="citationIndex">
                [{{ citation.timestamp }}] {{ citation.text }}
              </span>
            </div>
          </article>
        </div>
      </section>
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

.heading,
.subhead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
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
.heading p,
.subhead h3,
.subhead span {
  margin: 0;
}

.heading h2 {
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
}

.heading p,
.subhead span {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.primary,
.secondary,
.chip {
  border: 0;
  border-radius: 14px;
  padding: 11px 14px;
  font-weight: 700;
  font-size: 14px;
}

.primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8 62%, #1e40af);
  color: #fff;
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

.secondary {
  background: #eff6ff;
  color: #1d4ed8;
}

.primary:disabled,
.secondary:disabled,
.chip:disabled {
  background: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
}

.message {
  margin-top: 14px;
  border-radius: 16px;
  padding: 12px 14px;
  line-height: 1.7;
}

.message.error {
  background: #fff7ed;
  color: #9a3412;
}

.placeholder {
  margin-top: 16px;
  border-radius: 22px;
  padding: 28px 22px;
  background:
    radial-gradient(520px 180px at 100% 0%, rgba(59, 130, 246, 0.08), transparent 58%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.96));
  color: #475569;
  line-height: 1.7;
  text-align: center;
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.placeholder h3,
.placeholder p {
  margin: 0;
}

.placeholder h3 {
  color: #0f172a;
  font-size: 18px;
  margin-bottom: 8px;
}

.placeholder-icon {
  width: 46px;
  height: 46px;
  margin: 0 auto 14px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.96), rgba(191, 219, 254, 0.72));
  color: #1d4ed8;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.stack {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.block {
  border-radius: 20px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.block h3 {
  margin: 0 0 10px;
  color: #0f172a;
  font-size: 17px;
}

.intro-block {
  background:
    radial-gradient(560px 170px at 100% 0%, rgba(59, 130, 246, 0.09), transparent 60%),
    linear-gradient(180deg, rgba(239, 246, 255, 0.92), rgba(255, 255, 255, 0.98));
}

.intro-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.mini-label {
  display: inline-flex;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stat-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.stat-badge {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(191, 219, 254, 0.82);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.overview,
.sections article p,
.chat-item p {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  line-height: 1.8;
}

.sections,
.transcript,
.chat-list {
  display: grid;
  gap: 10px;
}

.sections article,
.transcript article,
.chat-item {
  border-radius: 14px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.sections article span,
.transcript article span {
  display: block;
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.sections article strong,
.chat-item strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 8px 12px;
  font-size: 12px;
}

.ask-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 10px;
}

.ask-row input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  background: rgba(255, 255, 255, 0.96);
}

.citations {
  display: grid;
  gap: 6px;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .heading,
  .subhead,
  .ask-row {
    grid-template-columns: 1fr;
    display: grid;
  }

  .intro-row {
    flex-direction: column;
  }

  .stat-badges {
    justify-content: flex-start;
  }
}
</style>
