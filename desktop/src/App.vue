<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AuthPanel from '@/components/AuthPanel.vue'
import DownloadForm from '@/components/DownloadForm.vue'
import ResolverHostPanel from '@/components/ResolverHostPanel.vue'
import { useAuth } from '@/composables/useAuth'
import { useMembership } from '@/composables/useMembership'

const {
  authenticated,
  currentUser,
  debugVerifyUrl,
  error: authError,
  fetchCurrentUser,
  loading: authLoading,
  login,
  logout,
  register,
  registerMessage,
  submitting: authSubmitting,
} = useAuth()

const {
  clearMembership,
  error: membershipError,
  fetchMembership,
  loading: membershipLoading,
  membership,
} = useMembership()

const paymentClosedNotice = '支付服务暂未开放，敬请期待'
const accountDrawerOpen = ref(false)
const diagnosticsDrawerOpen = ref(false)
const accountDrawerMode = ref<'login' | 'register'>('login')

const authActionLabel = computed(() => {
  if (authenticated.value && currentUser.value) return currentUser.value.email
  return '账号中心'
})

async function syncSession() {
  const user = await fetchCurrentUser()
  if (user) {
    try {
      await fetchMembership()
    } catch {
      // 会员状态失败不阻断主路径
    }
  } else {
    clearMembership()
  }
}

function resetInitialViewport() {
  if (typeof window === 'undefined') return
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }
  if (window.location.hash) {
    window.history.replaceState({}, '', window.location.pathname + window.location.search)
  }
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  })
}

async function handleLogin(payload: { email: string; password: string }) {
  await login(payload)
  try {
    await fetchMembership()
  } catch {
    // ignore membership sync failure here
  }
}

async function handleRegister(payload: { email: string; password: string }) {
  await register(payload)
}

async function handleLogout() {
  await logout()
  clearMembership()
}

async function handleRefreshMembership() {
  if (!authenticated.value) return
  await fetchMembership()
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleTopAction() {
  accountDrawerMode.value = 'login'
  accountDrawerOpen.value = true
}

function handleStartCheckout() {
  scrollToSection('pricing')
}

function openDiagnosticsDrawer() {
  diagnosticsDrawerOpen.value = true
}

function openAuthDrawer(mode: 'login' | 'register') {
  accountDrawerMode.value = mode
  accountDrawerOpen.value = true
}

function closeDrawers() {
  accountDrawerOpen.value = false
  diagnosticsDrawerOpen.value = false
}

onMounted(async () => {
  resetInitialViewport()
  await syncSession()
})
</script>

<template>
  <div id="app" class="app-shell flex flex-col min-h-screen">
    <nav class="top-nav border-b border-white/40">
      <div class="nav-inner max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="nav-brand flex items-center gap-6">
          <div class="flex items-center gap-3">
            <div class="brand-logo w-9 h-9 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span class="text-lg font-bold text-gray-900">VidGrab</span>
          </div>
          <span class="brand-pill px-2.5 py-1 text-xs font-medium rounded-md">
            万能视频下载
          </span>
        </div>

        <div class="nav-links flex items-center gap-8">
          <button type="button" class="nav-link" @click="scrollToSection('features')">功能特性</button>
          <button type="button" class="nav-link" @click="scrollToSection('pricing')">套餐价格</button>
          <button type="button" class="nav-link" @click="scrollToSection('platforms')">支持平台</button>
        </div>

        <div class="nav-actions flex items-center gap-3">
          <template v-if="authenticated">
            <button class="nav-link" type="button" @click="handleTopAction">
              {{ authActionLabel }}
            </button>
            <button class="vg-btn-soft flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm" type="button" @click="handleStartCheckout">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              敬请期待
            </button>
          </template>
          <template v-else>
            <button class="nav-link" type="button" @click="openAuthDrawer('login')">登录</button>
            <button class="nav-link" type="button" @click="openAuthDrawer('register')">注册</button>
            <button class="vg-btn-soft flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm" type="button" @click="handleStartCheckout">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              敬请期待
            </button>
          </template>
        </div>
      </div>
    </nav>

    <main class="main-stage relative flex-1">
      <DownloadForm
        :authenticated="authenticated"
        :current-user="currentUser"
        :membership="membership"
        :membership-loading="membershipLoading"
      />
    </main>

    <section id="features" class="section-soft border-t border-white/60">
      <div class="max-w-4xl mx-auto px-6 py-14 md:py-16">
        <div class="text-center mb-10">
          <h2 class="section-title text-2xl font-bold text-gray-900">功能特性</h2>
          <p class="section-subtitle text-sm text-gray-500 mt-2">简单三步，完成下载与 AI 分析</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="feature-card rounded-2xl border border-gray-200 bg-white p-6">
            <div class="icon-tile icon-tile-blue w-10 h-10 rounded-xl flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-gray-900 mb-2">视频下载</h3>
            <p class="text-sm text-gray-600 leading-6">粘贴链接即可解析，支持 MP4 / MP3 / WebM 等格式，多清晰度自由选择，实时进度显示。</p>
          </div>
          <div class="feature-card rounded-2xl border border-gray-200 bg-white p-6">
            <div class="icon-tile icon-tile-purple w-10 h-10 rounded-xl flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636 6.364l.707-.707M12 21v-1m-6.364-1.636l.707-.707" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-gray-900 mb-2">AI 视频总结</h3>
            <p class="text-sm text-gray-600 leading-6">自动生成摘要、章节要点和思维导图，字幕支持 SRT / VTT / TXT 导出，AI 问答流式回答。</p>
          </div>
          <div class="feature-card rounded-2xl border border-gray-200 bg-white p-6">
            <div class="icon-tile icon-tile-emerald w-10 h-10 rounded-xl flex items-center justify-center mb-4">
              <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-gray-900 mb-2">安全可靠</h3>
            <p class="text-sm text-gray-600 leading-6">文件下载后服务器立即清理，不留存任何用户数据，邮箱验证保障账号与安全。</p>
          </div>
        </div>
      </div>
    </section>

    <section id="platforms" class="section-plain border-t border-white/70">
      <div class="max-w-4xl mx-auto px-6 py-14 md:py-16">
        <div class="text-center mb-10">
          <h2 class="section-title text-2xl font-bold text-gray-900">支持平台</h2>
          <p class="section-subtitle text-sm text-gray-500 mt-2">基于 yt-dlp，支持全球 1000+ 视频网站</p>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          <div
            v-for="platform in ['YouTube', 'Bilibili', 'TikTok', 'Instagram', 'Twitter / X', 'Facebook', 'Vimeo', '更多 1000+ 平台']"
            :key="platform"
            class="platform-chip rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 text-center transition-colors"
          >
            {{ platform }}
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="section-plain border-t border-white/70">
      <div class="max-w-4xl mx-auto px-6 py-14 md:py-16">
        <div class="text-center mb-10">
          <h2 class="section-title text-2xl font-bold text-gray-900">套餐价格</h2>
          <p class="pricing-subtitle text-sm text-gray-500 mt-2">下载功能永久免费，AI 学习助手开通 VIP 后无限使用</p>
        </div>

        <div class="pricing-grid grid md:grid-cols-2 gap-6">
          <div class="plan-card plan-free rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col">
            <div class="mb-4">
              <span class="text-xs font-semibold tracking-wide text-gray-500 uppercase">免费版</span>
              <div class="mt-2 flex items-end gap-1">
                <span class="text-3xl font-bold text-gray-900">¥0</span>
                <span class="text-sm text-gray-500 mb-1">永久免费</span>
              </div>
              <p class="plan-hint mt-2 text-xs text-gray-500">适合轻量下载与日常临时使用</p>
            </div>
            <ul class="space-y-3 text-sm flex-1">
              <li class="plan-item">视频下载（无限次）</li>
              <li class="plan-item">支持 100+ 平台（YouTube / Bilibili / TikTok 等）</li>
              <li class="plan-item">多格式 / 多清晰度选择</li>
              <li class="plan-item muted">AI 视频总结（每日限 2 次）</li>
              <li class="plan-item muted">字幕导出（SRT / VTT / TXT）</li>
              <li class="plan-item muted">思维导图浏览与导出</li>
              <li class="plan-item muted">AI 流式问答</li>
            </ul>
            <div class="mt-6">
              <button class="plan-btn-secondary w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors" type="button" @click="openAuthDrawer('register')">
                免费注册
              </button>
            </div>
          </div>

          <div class="plan-card plan-vip rounded-2xl border-2 border-blue-500 p-6 relative flex flex-col">
            <span class="plan-badge absolute z-10 -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white">推荐</span>
            <div class="mb-4">
              <span class="text-xs font-semibold tracking-wide text-blue-600 uppercase">VIP 会员</span>
              <div class="plan-price-row mt-2 flex items-end gap-1">
                <span class="plan-price-main text-3xl font-bold text-gray-900">¥19.9</span>
                <span class="text-sm text-gray-500 mb-1">/ 30天</span>
              </div>
              <div class="value-chips mt-3">
                <span class="value-chip">不限 AI 总结</span>
                <span class="value-chip">字幕导出</span>
                <span class="value-chip">思维导图</span>
              </div>
            </div>
            <ul class="space-y-3 text-sm flex-1">
              <li class="plan-item">免费版全部功能</li>
              <li class="plan-item">AI 视频总结（无限次）</li>
              <li class="plan-item">字幕导出（SRT / VTT / TXT）</li>
              <li class="plan-item">思维导图浏览与高清导出（PNG / SVG）</li>
              <li class="plan-item">AI 流式问答（无限次）</li>
              <li class="plan-item">优先客服支持</li>
            </ul>
            <div class="mt-6">
              <button class="plan-btn-primary w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors" type="button" @click="handleStartCheckout">
                {{ paymentClosedNotice }}
              </button>
              <p class="plan-note mt-2 text-center text-xs text-blue-700/80">
                支付功能暂未开放，现有会员账号权益不受影响
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="section-plain border-t border-white/60">
      <div class="max-w-6xl mx-auto px-6 py-8">
        <div class="grid gap-4 md:grid-cols-3 mb-8">
          <section class="footer-card rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <h2 class="footer-title text-base font-semibold text-gray-900 mb-2">视频下载与字幕整理</h2>
            <p class="footer-desc text-sm leading-6 text-gray-600">
              用 VidGrab 解析公开视频链接后，可以继续完成下载、字幕导出和音频保存，适合课程复盘与素材归档。
            </p>
          </section>
          <section class="footer-card rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <h2 class="footer-title text-base font-semibold text-gray-900 mb-2">AI 视频总结</h2>
            <p class="footer-desc text-sm leading-6 text-gray-600">
              AI 学习助手会输出总览、章节要点、思维导图和流式问答，把长视频转换成更容易复盘的知识结构。
            </p>
          </section>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="text-sm text-gray-500">
            © 2026 VidGrab. 仅供学习与研究，请遵守当地法律法规
          </div>
          <div class="flex items-center gap-6 text-sm text-gray-500">
            <button type="button" class="footer-link" @click="handleTopAction">登录</button>
            <button type="button" class="footer-link" @click="openAuthDrawer('register')">注册</button>
            <button type="button" class="footer-link" @click="scrollToSection('pricing')">套餐价格</button>
            <button type="button" class="footer-link" @click="scrollToSection('features')">功能特性</button>
          </div>
        </div>
      </div>
    </footer>

    <transition name="drawer-fade">
      <div v-if="accountDrawerOpen || diagnosticsDrawerOpen" class="drawer-backdrop" @click="closeDrawers"></div>
    </transition>

    <transition name="drawer-slide">
      <aside v-if="accountDrawerOpen" class="drawer-shell" aria-label="账号中心">
        <div class="drawer-header">
          <div>
            <p class="drawer-eyebrow">Account Center</p>
            <h2>账号中心</h2>
            <p class="drawer-subtitle">登录账号、查看会员状态和同步云端权限。</p>
          </div>
          <button type="button" class="drawer-close" @click="accountDrawerOpen = false">关闭</button>
        </div>

        <div class="drawer-body">
          <AuthPanel
            :authenticated="authenticated"
            :current-user="currentUser"
            :membership="membership"
            :initial-mode="accountDrawerMode"
            :auth-loading="authLoading"
            :auth-submitting="authSubmitting"
            :membership-loading="membershipLoading"
            :error="authError || membershipError"
            :register-message="registerMessage"
            :debug-verify-url="debugVerifyUrl"
            @login="handleLogin"
            @register="handleRegister"
            @logout="handleLogout"
            @refresh-membership="handleRefreshMembership"
          />
        </div>
      </aside>
    </transition>

    <transition name="drawer-slide">
      <aside v-if="diagnosticsDrawerOpen" class="drawer-shell" aria-label="设置与诊断">
        <div class="drawer-header">
          <div>
            <p class="drawer-eyebrow">Settings & Diagnostics</p>
            <h2>设置与诊断</h2>
            <p class="drawer-subtitle">这里保留桌面版专属的 resolver 宿主状态与排障入口，普通使用时不需要频繁操作。</p>
          </div>
          <button type="button" class="drawer-close" @click="diagnosticsDrawerOpen = false">关闭</button>
        </div>

        <div class="drawer-body">
          <ResolverHostPanel />
        </div>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
button {
  border: 0;
  background: transparent;
}

.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.16), transparent 26%),
    linear-gradient(180deg, #eef4ff 0%, #f8fbff 50%, #f4f8fc 100%);
  color: #0f172a;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.top-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  backdrop-filter: saturate(140%) blur(12px);
  background: rgba(255, 255, 255, 0.72);
}

.nav-inner {
  gap: 18px;
}

.nav-brand,
.nav-actions {
  min-width: 0;
}

.nav-actions {
  flex-shrink: 0;
}

.nav-links {
  min-width: 0;
}

.brand-logo {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 65%, #1d4ed8 100%);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.28);
}

.brand-pill {
  background: rgba(239, 246, 255, 0.86);
  color: #46607c;
  border: 1px solid rgba(147, 197, 253, 0.44);
}

.nav-link {
  padding: 0;
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 160ms ease;
}

.nav-link:hover {
  color: #111827;
}

.main-stage {
  background: transparent;
}

.section-soft {
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.4), rgba(241, 245, 249, 0.62));
}

.section-plain {
  background: rgba(255, 255, 255, 0.72);
}

.feature-card,
.footer-card,
.plan-card,
.platform-chip {
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease,
    transform 160ms ease,
    background-color 220ms ease;
}

.feature-card,
.footer-card {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(148, 163, 184, 0.24);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(8px);
}

.feature-card:hover,
.footer-card:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.34);
  box-shadow: 0 18px 34px rgba(30, 64, 175, 0.1);
}

.icon-tile {
  border: 1px solid rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.64);
}

.icon-tile-blue {
  background: linear-gradient(145deg, rgba(219, 234, 254, 0.95), rgba(191, 219, 254, 0.7));
}

.icon-tile-purple {
  background: linear-gradient(145deg, rgba(233, 213, 255, 0.94), rgba(221, 214, 254, 0.68));
}

.icon-tile-emerald {
  background: linear-gradient(145deg, rgba(209, 250, 229, 0.95), rgba(167, 243, 208, 0.65));
}

.platform-chip {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(148, 163, 184, 0.24);
}

.platform-chip:hover {
  background: rgba(239, 246, 255, 0.95);
  border-color: rgba(96, 165, 250, 0.45);
  transform: translateY(-1px);
}

.plan-card {
  backdrop-filter: blur(10px);
  height: 100%;
}

.plan-free {
  background: rgba(248, 250, 252, 0.78);
  border-color: rgba(148, 163, 184, 0.28);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
}

.plan-vip {
  background:
    radial-gradient(680px 180px at 80% -30%, rgba(59, 130, 246, 0.14), transparent 65%),
    linear-gradient(155deg, rgba(239, 246, 255, 0.96), rgba(255, 255, 255, 0.92) 56%, rgba(238, 242, 255, 0.9));
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.16);
}

.plan-vip::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 12%, rgba(255, 255, 255, 0.44) 42%, transparent 78%);
  opacity: 0.45;
  pointer-events: none;
}

.plan-badge {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.3);
}

.plan-price-main {
  letter-spacing: -0.02em;
  color: #0f172a;
}

.plan-btn-secondary,
.plan-btn-primary {
  cursor: pointer;
}

.plan-btn-secondary {
  border-color: rgba(148, 163, 184, 0.46);
  background: rgba(255, 255, 255, 0.95);
  transition:
    background-color 220ms ease,
    border-color 220ms ease,
    transform 160ms ease;
}

.plan-btn-secondary:hover {
  background: rgba(248, 250, 252, 0.95);
}

.plan-btn-primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8 62%, #1e40af);
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.3);
  transition:
    transform 160ms ease,
    filter 160ms ease,
    box-shadow 220ms ease;
}

.plan-btn-primary:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.plan-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #374151;
  line-height: 1.6;
}

.plan-item::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #3b82f6;
  flex-shrink: 0;
}

.plan-item.muted {
  color: #9ca3af;
}

.plan-item.muted::before {
  background: #cbd5e1;
}

.pricing-subtitle,
.section-subtitle,
.footer-desc {
  color: #64748b;
  line-height: 1.6;
}

.value-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.value-chip {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.74);
  border: 1px solid rgba(147, 197, 253, 0.52);
}

.footer-title,
.section-title {
  color: #0f172a;
}

.footer-link {
  padding: 0;
  color: inherit;
  cursor: pointer;
  transition: color 160ms ease;
}

.footer-link:hover {
  color: #1d4ed8;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(6px);
}

.drawer-shell {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 60;
  width: min(560px, 100vw);
  height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(720px 240px at 100% 0%, rgba(59, 130, 246, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: -18px 0 48px rgba(15, 23, 42, 0.16);
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 24px 18px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.drawer-header h2,
.drawer-subtitle,
.drawer-eyebrow {
  margin: 0;
}

.drawer-header h2 {
  color: #0f172a;
  font-size: 28px;
  line-height: 1.2;
}

.drawer-eyebrow {
  margin-bottom: 10px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.drawer-subtitle {
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.drawer-close {
  min-width: 68px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(203, 213, 225, 0.95);
  color: #475569;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.drawer-close:hover {
  color: #0f172a;
  border-color: rgba(148, 163, 184, 0.9);
  transform: translateY(-1px);
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 22px 24px 28px;
}

.drawer-body :deep(.panel) {
  border-radius: 26px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active,
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 220ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

@media (max-width: 768px) {
  .nav-inner {
    padding-left: 1rem;
    padding-right: 1rem;
    gap: 12px;
  }

  .nav-links {
    display: none;
  }

  .brand-pill {
    display: none;
  }

  .nav-actions .vg-btn-soft {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }

  .nav-actions .nav-link {
    font-size: 0.8rem;
  }

  .section-title {
    font-size: 1.42rem;
  }

  .drawer-shell {
    width: 100vw;
  }

  .drawer-header,
  .drawer-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .drawer-header h2 {
    font-size: 24px;
  }
}

@media (max-width: 560px) {
  .nav-actions {
    gap: 10px;
  }

  .nav-actions .vg-btn-soft {
    min-width: auto;
  }

  .nav-actions .vg-btn-soft svg {
    display: none;
  }
}
</style>
