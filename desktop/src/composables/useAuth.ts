import { computed, ref } from 'vue'

import { ApiError, cloudClient, setAccessToken } from '@/api/cloudClient'
import type { RegisterRequest, RegisterResponse, UserProfile } from '@/types'

const currentUser = ref<UserProfile | null>(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const registerMessage = ref<string | null>(null)
const debugVerifyUrl = ref<string | null>(null)

const authenticated = computed(() => Boolean(currentUser.value))

export function useAuth() {
  async function fetchCurrentUser() {
    loading.value = true
    error.value = null
    try {
      const response = await cloudClient.getCurrentUser()
      currentUser.value = response.authenticated ? response.user || null : null
      error.value = null
      return currentUser.value
    } catch (requestError) {
      currentUser.value = null
      const message = requestError instanceof Error ? requestError.message : '获取登录状态失败'

      // 应用启动时探测登录态，未登录本身不是错误，不应在界面上残留“请先登录”提示。
      if (requestError instanceof ApiError && requestError.status === 401) {
        error.value = null
        return null
      }

      error.value = message
      return null
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterRequest): Promise<RegisterResponse> {
    submitting.value = true
    error.value = null
    registerMessage.value = null
    debugVerifyUrl.value = null

    try {
      const response = await cloudClient.register(payload)
      registerMessage.value = response.message
      debugVerifyUrl.value = response.debug_verify_url || null
      return response
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '注册失败'
      throw requestError
    } finally {
      submitting.value = false
    }
  }

  async function login(payload: { email: string; password: string }) {
    submitting.value = true
    error.value = null
    registerMessage.value = null
    debugVerifyUrl.value = null
    try {
      const response = await cloudClient.login(payload)
      setAccessToken(response.access_token)
      currentUser.value = response.user
      error.value = null
      return response.user
    } catch (requestError) {
      setAccessToken(null)
      currentUser.value = null
      error.value = requestError instanceof Error ? requestError.message : '登录失败'
      throw requestError
    } finally {
      submitting.value = false
    }
  }

  async function logout() {
    submitting.value = true
    error.value = null
    try {
      await cloudClient.logout()
    } catch (requestError) {
      error.value = requestError instanceof Error ? requestError.message : '退出登录失败'
      throw requestError
    } finally {
      setAccessToken(null)
      currentUser.value = null
      registerMessage.value = null
      debugVerifyUrl.value = null
      submitting.value = false
    }
  }

  function clearFeedback() {
    error.value = null
    registerMessage.value = null
    debugVerifyUrl.value = null
  }

  return {
    authenticated,
    clearFeedback,
    currentUser,
    debugVerifyUrl,
    error,
    fetchCurrentUser,
    loading,
    login,
    logout,
    register,
    registerMessage,
    submitting,
  }
}
