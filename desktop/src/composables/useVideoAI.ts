import { ref } from 'vue'

import { cloudClient } from '@/api/cloudClient'
import { localResolverClient } from '@/api/localResolverClient'
import type { ChatCitation, VideoAnalysisResponse } from '@/types'

export type TranscriptFormat = 'srt' | 'vtt' | 'txt'

export type ChatTurn = {
  question: string
  answer: string
  citations: ChatCitation[]
}

export function useVideoAI() {
  const analyzing = ref(false)
  const analysisError = ref<string | null>(null)
  const analysisResult = ref<VideoAnalysisResponse | null>(null)
  const asking = ref(false)
  const question = ref('')
  const chatHistory = ref<ChatTurn[]>([])
  const downloadingTranscriptFormat = ref<TranscriptFormat | null>(null)

  async function analyzeVideo(url: string) {
    if (!url.trim()) {
      analysisError.value = '请先输入或解析视频链接'
      return
    }

    analyzing.value = true
    analysisError.value = null
    analysisResult.value = null
    chatHistory.value = []

    try {
      const prepared = await localResolverClient.prepareAIAnalyze({ url: url.trim() })
      analysisResult.value = await cloudClient.analyzePreparedVideo({
        source_url: prepared.source_url,
        video_title: prepared.video_title,
        transcript: prepared.transcript,
        transcript_language: prepared.transcript_language,
      })
    } catch (requestError) {
      analysisError.value = requestError instanceof Error ? requestError.message : 'AI 分析失败'
    } finally {
      analyzing.value = false
    }
  }

  async function askQuestion() {
    if (!analysisResult.value?.analysis_id) {
      analysisError.value = '请先完成视频分析'
      return
    }
    if (!question.value.trim()) {
      return
    }

    const currentQuestion = question.value.trim()
    question.value = ''
    asking.value = true
    analysisError.value = null

    try {
      const response = await cloudClient.askVideoQuestion({
        analysis_id: analysisResult.value.analysis_id,
        question: currentQuestion,
      })
      chatHistory.value = [
        ...chatHistory.value,
        {
          question: currentQuestion,
          answer: response.answer,
          citations: response.citations || [],
        },
      ]
    } catch (requestError) {
      analysisError.value = requestError instanceof Error ? requestError.message : 'AI 问答失败'
    } finally {
      asking.value = false
    }
  }

  async function downloadTranscript(format: TranscriptFormat) {
    if (!analysisResult.value?.analysis_id) {
      analysisError.value = '请先完成视频分析'
      return
    }
    downloadingTranscriptFormat.value = format
    analysisError.value = null

    try {
      window.open(
        cloudClient.getTranscriptDownloadUrl(analysisResult.value.analysis_id, format),
        '_blank',
        'noopener,noreferrer',
      )
    } catch (requestError) {
      analysisError.value = requestError instanceof Error ? requestError.message : '字幕下载失败'
    } finally {
      downloadingTranscriptFormat.value = null
    }
  }

  function resetAI() {
    analyzing.value = false
    analysisError.value = null
    analysisResult.value = null
    asking.value = false
    question.value = ''
    chatHistory.value = []
    downloadingTranscriptFormat.value = null
  }

  return {
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
  }
}
