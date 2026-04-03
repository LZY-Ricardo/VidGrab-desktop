<script setup lang="ts">
import { reactive, ref } from 'vue'

import type { MembershipStatus, UserProfile } from '@/types'

const props = defineProps<{
  authenticated: boolean
  currentUser: UserProfile | null
  membership: MembershipStatus | null
  authLoading: boolean
  authSubmitting: boolean
  membershipLoading: boolean
  error: string | null
  registerMessage: string | null
  debugVerifyUrl: string | null
}>()

const emit = defineEmits<{
  login: [payload: { email: string; password: string }]
  register: [payload: { email: string; password: string }]
  logout: []
  refreshMembership: []
}>()

const mode = ref<'login' | 'register'>('login')
const localError = ref<string | null>(null)
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showRegisterConfirmPassword = ref(false)

const loginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

function submitLogin() {
  localError.value = null
  emit('login', { ...loginForm })
}

function submitRegister() {
  localError.value = null
  if (registerForm.password !== registerForm.confirmPassword) {
    localError.value = '两次输入的密码不一致'
    return
  }
  emit('register', {
    email: registerForm.email,
    password: registerForm.password,
  })
}

function switchMode(nextMode: 'login' | 'register') {
  mode.value = nextMode
  localError.value = null
}

function switchToLoginWithPrefill() {
  loginForm.email = registerForm.email
  loginForm.password = registerForm.password
  mode.value = 'login'
  localError.value = null
}
</script>

<template>
  <section class="panel auth-panel">
    <div class="heading">
      <div>
        <span class="eyebrow">Cloud Account</span>
        <h2>账号与会员</h2>
      </div>
      <span class="state" :class="{ active: authenticated }">
        {{ authenticated ? '已登录' : '未登录' }}
      </span>
    </div>

    <template v-if="authenticated && currentUser">
      <div class="account-card">
        <div>
          <p class="label">当前账号</p>
          <strong>{{ currentUser.email }}</strong>
        </div>
        <div>
          <p class="label">邮箱状态</p>
          <strong>{{ currentUser.email_verified ? '已验证' : '待验证' }}</strong>
        </div>
        <div>
          <p class="label">会员状态</p>
          <strong>
            {{ membership?.is_member ? `VIP 剩余 ${membership.remaining_days} 天` : '免费版' }}
          </strong>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="secondary" :disabled="membershipLoading" @click="$emit('refreshMembership')">
          {{ membershipLoading ? '刷新中...' : '刷新会员状态' }}
        </button>
        <button type="button" class="ghost" :disabled="authSubmitting" @click="$emit('logout')">
          {{ authSubmitting ? '退出中...' : '退出登录' }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button>
      </div>

      <div class="form">
        <template v-if="mode === 'login'">
          <div class="field">
            <label>邮箱</label>
            <input v-model="loginForm.email" type="email" placeholder="you@example.com" />
          </div>
          <div class="field">
            <label>密码</label>
            <div class="password-wrap">
              <input v-model="loginForm.password" :type="showLoginPassword ? 'text' : 'password'" placeholder="至少 8 位" @keyup.enter="submitLogin" />
              <button type="button" class="password-toggle" @click="showLoginPassword = !showLoginPassword">
                {{ showLoginPassword ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <button type="button" class="primary" :disabled="authSubmitting || authLoading" @click="submitLogin">
            {{ authSubmitting ? '登录中...' : '登录账号' }}
          </button>
        </template>

        <template v-else>
          <div class="field">
            <label>邮箱</label>
            <input v-model="registerForm.email" type="email" placeholder="you@example.com" />
          </div>
          <div class="field">
            <label>密码</label>
            <div class="password-wrap">
              <input v-model="registerForm.password" :type="showRegisterPassword ? 'text' : 'password'" placeholder="至少 8 位密码" />
              <button type="button" class="password-toggle" @click="showRegisterPassword = !showRegisterPassword">
                {{ showRegisterPassword ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <div class="field">
            <label>确认密码</label>
            <div class="password-wrap">
              <input
                v-model="registerForm.confirmPassword"
                :type="showRegisterConfirmPassword ? 'text' : 'password'"
                placeholder="再次输入密码"
                @keyup.enter="submitRegister"
              />
              <button type="button" class="password-toggle" @click="showRegisterConfirmPassword = !showRegisterConfirmPassword">
                {{ showRegisterConfirmPassword ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <button type="button" class="primary" :disabled="authSubmitting" @click="submitRegister">
            {{ authSubmitting ? '注册中...' : '注册账号' }}
          </button>
        </template>
      </div>
    </template>

    <p v-if="localError || error" class="message error">{{ localError || error }}</p>
    <div v-if="registerMessage" class="message success">
      <p>{{ registerMessage }}</p>
      <button type="button" class="ghost inline-action" @click="switchToLoginWithPrefill">
        验证完成后点此登录
      </button>
      <a
        v-if="debugVerifyUrl"
        :href="debugVerifyUrl"
        target="_blank"
        rel="noreferrer noopener"
      >
        开发环境验证邮箱
      </a>
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

.heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
}

.state {
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.state.active {
  background: #ecfdf5;
  color: #15803d;
}

.account-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.label {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 12px;
}

.account-card strong {
  color: #0f172a;
  font-size: 14px;
}

.actions,
.tabs {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.tabs button,
.primary,
.secondary,
.ghost {
  border-radius: 14px;
  padding: 11px 14px;
  font-weight: 700;
  font-size: 14px;
}

.tabs button {
  border: 1px solid #dbe4f0;
  background: #fff;
  color: #475569;
  flex: 1;
}

.tabs button.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.form {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.field {
  display: grid;
  gap: 6px;
}

.field label {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.form input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  background: rgba(255, 255, 255, 0.98);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 58px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.primary {
  border: 0;
  background: linear-gradient(135deg, #2563eb, #1d4ed8 62%, #1e40af);
  color: #fff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
  transition:
    transform 160ms ease,
    filter 160ms ease;
}

.secondary {
  border: 0;
  background: #eff6ff;
  color: #1d4ed8;
  flex: 1;
}

.ghost {
  border: 1px solid #dbe4f0;
  background: #fff;
  color: #475569;
  flex: 1;
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

.message.success {
  background: #ecfdf5;
  color: #166534;
}

.message.success a {
  display: inline-flex;
  margin-top: 8px;
  color: #2563eb;
}

.inline-action {
  width: 100%;
  margin-top: 12px;
}

@media (max-width: 720px) {
  .actions {
    flex-direction: column;
  }
}
</style>
