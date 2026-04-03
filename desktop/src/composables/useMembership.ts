import { ref } from 'vue'

import { ApiError, cloudClient } from '@/api/cloudClient'
import type { MembershipStatus } from '@/types'

const membership = ref<MembershipStatus | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useMembership() {
  async function fetchMembership() {
    loading.value = true
    error.value = null
    try {
      const response = await cloudClient.getMembership()
      membership.value = response
      error.value = null
      return response
    } catch (requestError) {
      membership.value = null

      // 登录态切换时，会员接口偶发 401 不应把界面误导成“请先登录”。
      if (requestError instanceof ApiError && requestError.status === 401) {
        error.value = null
        return null
      }

      error.value = requestError instanceof Error ? requestError.message : '获取会员状态失败'
      throw requestError
    } finally {
      loading.value = false
    }
  }

  function clearMembership() {
    membership.value = null
    error.value = null
  }

  return {
    clearMembership,
    error,
    fetchMembership,
    loading,
    membership,
  }
}
