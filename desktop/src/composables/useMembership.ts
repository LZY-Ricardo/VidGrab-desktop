import { ref } from 'vue'

import { cloudClient } from '@/api/cloudClient'
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
      return response
    } catch (requestError) {
      membership.value = null
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
