<template>
  <view class="page-shell login-page">
    <WeatherBackdrop />
    <view class="page-content login-content">
      <view class="login-header">
        <view class="logo-wrap">
          <view class="logo-badge">
            <text class="iconfont icon-house"></text>
          </view>
          <text class="logo-text gradient-text">智慧家居</text>
          <text class="logo-subtitle">把 Home Assistant 的连接、控制和联动，收进一个更顺手的移动端界面。</text>
        </view>
      </view>

      <view class="glass-card login-panel">
        <view class="panel-header">
          <text class="panel-title">{{ showMFA ? '双因子认证' : '连接 Home Assistant' }}</text>
          <text class="panel-desc">
            {{ showMFA ? '输入验证码以完成安全验证。' : '服务器地址可留空，应用会优先扫描同一局域网中的 Home Assistant。' }}
          </text>
        </view>

        <view v-if="!showMFA" class="form-list">
          <view class="form-item">
            <text class="form-label">长期访问令牌（可选）</text>
            <input
              id="accessToken"
              v-model="accessToken"
              class="form-input"
              data-tv-focus
              type="text"
              placeholder="可用 token 直接连接，也可继续使用账号密码"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">用户名</text>
            <input
              id="username"
              v-model="username"
              class="form-input"
              data-tv-focus
              type="text"
              placeholder="请输入用户名"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">密码</text>
            <input
              id="password"
              v-model="password"
              class="form-input"
              data-tv-focus
              type="password"
              placeholder="请输入密码"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="advanced-block">
            <view class="advanced-toggle" data-tv-focus @click="toggleAdvancedSettings">
              <view>
                <text class="advanced-title">高级设置</text>
                <text class="advanced-desc">可不填，自动扫描同一局域网；填写后可加快探测。</text>
              </view>
              <text :class="['iconfont', 'icon-chevron-right', { expanded: showAdvancedSettings }]"></text>
            </view>

            <view v-if="showAdvancedSettings" class="advanced-fields">
              <view class="form-item">
                <text class="form-label">服务器地址 / IP</text>
                <input
                  id="serverHost"
                  v-model="serverHost"
                  class="form-input"
                  data-tv-focus
                  type="text"
                  placeholder="如 192.168.1.100 或 http://192.168.1.100"
                  placeholder-class="input-placeholder"
                />
              </view>

              <view class="form-item">
                <text class="form-label">端口</text>
                <input
                  id="serverPort"
                  v-model="serverPort"
                  class="form-input"
                  data-tv-focus
                  type="number"
                  placeholder="8123"
                  placeholder-class="input-placeholder"
                />
              </view>
            </view>
          </view>
        </view>

        <view v-else class="form-list">
          <view class="mfa-banner">
            <view class="mfa-icon">
              <text class="iconfont icon-shield-halved"></text>
            </view>
            <view class="mfa-copy">
              <text class="mfa-title">安全验证中</text>
              <text class="mfa-desc">{{ mfaType === 'totp' ? '请输入认证器中的 6 位验证码。' : '请输入收到的验证码。' }}</text>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">验证码</text>
            <input
              id="mfaCode"
              v-model="mfaCode"
              class="form-input"
              data-tv-focus
              type="text"
              maxlength="6"
              :placeholder="mfaType === 'totp' ? '6位数字验证码' : '请输入验证码'"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view v-if="discoveryMessage || discoveredServers.length > 0 || currentAttemptUrl" class="discovery-card" data-tv-focus>
          <text class="discovery-title">{{ discoveryRunning ? '局域网扫描中' : '连接状态' }}</text>
          <text v-if="discoveryMessage" class="discovery-desc">{{ discoveryMessage }}</text>
          <text v-if="discoveredServers.length > 0" class="discovery-desc">
            已发现 {{ discoveredServers.length }} 个 Home Assistant 地址
          </text>
          <text v-if="currentAttemptUrl" class="discovery-desc">
            正在尝试 {{ formatServerLabel(currentAttemptUrl) }}
          </text>
          <text class="discovery-hint">手动填写地址可跳过局域网扫描；自动探测失败时可作为兜底。</text>
        </view>

        <view v-if="errorMsg" class="error-card">
          <text class="iconfont icon-circle-xmark"></text>
          <text>{{ errorMsg }}</text>
        </view>

        <button class="primary-btn" data-tv-focus :disabled="loading" @click="handleLogin">
          {{ primaryButtonText }}
        </button>

        <button v-if="showMFA" class="ghost-btn" data-tv-focus :disabled="loading" @click="cancelMFA">
          返回账号登录
        </button>
      </view>

      <view class="glass-card helper-card">
        <view class="helper-row">
          <text class="helper-title">连接提示</text>
          <text class="glass-pill">安全连接</text>
        </view>
        <text class="helper-text">服务器地址通常是 `http://IP:8123`，首次登录后地址和令牌会自动缓存，后续可直接重连。</text>
        <view class="helper-tags">
          <text class="helper-tag">
            <text class="iconfont icon-circle-info"></text>
            建议同局域网调试
          </text>
          <text class="helper-tag">
            <text class="iconfont icon-lock"></text>
            支持 MFA
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 登录页面
   * 功能: 账号密码登录与 MFA 验证
   */
  import { computed, ref, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'
  import WeatherBackdrop from '../../components/WeatherBackdrop.vue'
  import {
    buildHaUrl,
    discoverHaServers,
    getIpv4NetworkPrefix,
    normalizeDiscoveryPort,
    normalizeHaUrl
  } from '../../utils/ha-discovery.js'

  export default {
    components: {
      WeatherBackdrop
    },

    setup() {
      const store = useHAStore()
      const serverHost = ref('')
      const serverPort = ref('8123')
      const accessToken = ref('')
      const username = ref('')
      const password = ref('')
      const showAdvancedSettings = ref(false)
      const showMFA = ref(false)
      const mfaType = ref('')
      const mfaCode = ref('')
      const authFlowId = ref('')
      const mfaServerUrl = ref('')
      const loading = ref(false)
      const errorMsg = ref('')
      const discoveryRunning = ref(false)
      const discoveryMessage = ref('')
      const discoveredServers = ref([])
      const currentAttemptUrl = ref('')

      const primaryButtonText = computed(() => {
        if (loading.value) {
          if (showMFA.value) {
            return '验证中...'
          }

          return discoveryRunning.value ? '自动探测中...' : '连接中...'
        }

        return showMFA.value ? '验证并进入' : '连接到家庭'
      })

      function formatServerLabel(url = '') {
        try {
          return new URL(url).host
        } catch {
          return url
        }
      }

      function toggleAdvancedSettings() {
        showAdvancedSettings.value = !showAdvancedSettings.value
      }

      function buildManualUrl() {
        if (!serverHost.value.trim()) {
          return ''
        }

        return buildHaUrl(serverHost.value, normalizeDiscoveryPort(serverPort.value))
      }

      async function resolveLoginCandidates() {
        const manualUrl = buildManualUrl()
        const customPrefix = manualUrl ? getIpv4NetworkPrefix(manualUrl) : ''
        const discoveryOptions = {
          host: serverHost.value,
          port: normalizeDiscoveryPort(serverPort.value),
          networkPrefixes: customPrefix ? [customPrefix] : [],
          restrictToDerivedSubnet: Boolean(customPrefix)
        }

        if (manualUrl) {
          discoveryMessage.value = customPrefix
            ? `已优先使用高级设置地址，并将扫描范围缩小到 ${customPrefix}.*。`
            : '已优先使用高级设置地址；如失败会继续短时间扫描同一局域网。'
        }

        discoveryRunning.value = true
        if (!manualUrl) {
          discoveryMessage.value = '正在扫描同一局域网中的 Home Assistant，高级设置可加快探测。'
        }
        discoveredServers.value = []

        try {
          const result = await discoverHaServers({
            ...discoveryOptions,
            onFound: (url, urls) => {
              discoveredServers.value = urls
              discoveryMessage.value = `已发现 ${urls.length} 个 Home Assistant 地址，继续短时间确认更多候选。`
            },
            onProgress: (progress) => {
              if (progress.phase === 'probing') {
                discoveryMessage.value = `正在扫描同一局域网：已检查 ${progress.checked}/${progress.total}，已发现 ${progress.found} 个。`
              }
            }
          })

          discoveredServers.value = result.discovered

          if (result.discovered.length === 0 && !manualUrl) {
            throw new Error('未发现可用 Home Assistant。请确认电视与 Home Assistant 在同一局域网，或手动填写地址；H5 预览可能受浏览器 CORS/网络策略限制。')
          }

          discoveryMessage.value = result.timedOut
            ? `已发现 ${result.discovered.length} 个地址；为避免卡住界面，本轮探测已按时间上限收敛。`
            : `已完成探测，发现 ${result.discovered.length} 个地址。`

          return manualUrl
            ? [manualUrl, ...result.discovered.filter((url) => url !== manualUrl)]
            : result.discovered
        } finally {
          discoveryRunning.value = false
        }
      }

      async function tryConnectWithCandidate(url) {
        const token = accessToken.value.trim()

        if (token) {
          await store.initConnection(url, token)
          return {
            requireMFA: false
          }
        }

        return store.loginWithPassword(url, username.value, password.value)
      }

      async function handleLogin() {
        errorMsg.value = ''
        loading.value = true

        try {
          if (showMFA.value) {
            if (!mfaCode.value) {
              errorMsg.value = '请输入验证码'
              loading.value = false
              return
            }

            await store.loginWithMFA(mfaServerUrl.value || normalizeHaUrl(buildManualUrl()), authFlowId.value, mfaCode.value)
            uni.switchTab({
              url: '/pages/home/home'
            })
            return
          }

          if (!accessToken.value.trim() && !username.value) {
            errorMsg.value = '请输入用户名'
            loading.value = false
            return
          }

          if (!accessToken.value.trim() && !password.value) {
            errorMsg.value = '请输入密码'
            loading.value = false
            return
          }

          const candidates = await resolveLoginCandidates()
          let lastError = null

          for (const candidate of candidates) {
            currentAttemptUrl.value = candidate
            discoveryMessage.value = `正在尝试 ${formatServerLabel(candidate)} 登录。`

            try {
              const result = await tryConnectWithCandidate(candidate)

              if (result.requireMFA) {
                showMFA.value = true
                mfaType.value = result.mfaType || 'totp'
                authFlowId.value = result.flowId
                mfaServerUrl.value = candidate
                serverHost.value = candidate
                loading.value = false
                discoveryMessage.value = `${formatServerLabel(candidate)} 需要 MFA 验证。`
                return
              }

              uni.switchTab({
                url: '/pages/home/home'
              })
              return
            } catch (error) {
              lastError = error
            }
          }

          throw new Error(`已尝试 ${candidates.length} 个地址仍无法登录。${lastError?.message || '请检查账号、密码、token 或网络。'} H5 预览可能受 CORS 限制，APK/电视内访问内网 HA 通常更可靠。`)
        } catch (error) {
          errorMsg.value = error.message || '连接失败，请检查配置'
          loading.value = false
        } finally {
          currentAttemptUrl.value = ''
        }
      }

      function cancelMFA() {
        showMFA.value = false
        mfaCode.value = ''
        authFlowId.value = ''
        mfaServerUrl.value = ''
        loading.value = false
      }

      onMounted(() => {
        serverHost.value = ''
      })

      return {
        serverHost,
        serverPort,
        accessToken,
        username,
        password,
        showAdvancedSettings,
        showMFA,
        mfaType,
        mfaCode,
        loading,
        errorMsg,
        discoveryRunning,
        discoveryMessage,
        discoveredServers,
        currentAttemptUrl,
        primaryButtonText,
        formatServerLabel,
        toggleAdvancedSettings,
        handleLogin,
        cancelMFA
      }
    }
  }
</script>

<style scoped>
  .login-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
    padding-top: 28px;
    padding-bottom: 28px;
  }

  .login-header {
    text-align: center;
  }

  .logo-wrap {
    max-width: 420px;
    margin: 0 auto;
  }

  .logo-badge {
    width: 84px;
    height: 84px;
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 30px;
    background: rgba(255, 194, 133, 0.16);
    border: 1px solid rgba(255, 194, 133, 0.3);
    color: #ffc285;
    font-size: 36px;
    box-shadow: 0 20px 36px rgba(0, 0, 0, 0.28);
  }

  .logo-text {
    display: block;
    font-size: 34px;
    font-weight: 600;
  }

  .logo-subtitle {
    display: block;
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.68);
  }

  .login-panel {
    max-width: 420px;
    width: 100%;
    margin: 0 auto;
    padding: 24px 20px 20px;
  }

  .panel-header {
    margin-bottom: 18px;
  }

  .panel-title {
    display: block;
    font-size: 22px;
    font-weight: 600;
  }

  .panel-desc {
    display: block;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.62);
  }

  .form-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.78);
  }

  .form-input {
    width: 100%;
    height: 48px;
    padding: 0 16px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-size: 14px;
    box-sizing: border-box;
  }

  .input-placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  .mfa-banner {
    display: flex;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .mfa-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: rgba(181, 228, 255, 0.14);
    color: #b5e4ff;
  }

  .mfa-copy {
    flex: 1;
  }

  .mfa-title {
    display: block;
    font-size: 15px;
    font-weight: 600;
  }

  .mfa-desc {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.62);
  }

  .advanced-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .advanced-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .advanced-title {
    display: block;
    font-size: 15px;
    font-weight: 600;
  }

  .advanced-desc {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.62);
  }

  .advanced-toggle .iconfont {
    color: rgba(255, 255, 255, 0.58);
    transition: transform 0.2s ease;
  }

  .advanced-toggle .iconfont.expanded {
    transform: rotate(90deg);
  }

  .advanced-fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .error-card {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 122, 122, 0.12);
    border: 1px solid rgba(255, 122, 122, 0.16);
    color: #ffb4b4;
    font-size: 13px;
  }

  .discovery-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 16px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(181, 228, 255, 0.08);
    border: 1px solid rgba(181, 228, 255, 0.14);
  }

  .discovery-title {
    font-size: 14px;
    font-weight: 600;
    color: #b5e4ff;
  }

  .discovery-desc,
  .discovery-hint {
    font-size: 12px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.68);
  }

  .discovery-hint {
    color: rgba(255, 216, 170, 0.82);
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
    margin-top: 16px;
    border: none;
    border-radius: 18px;
    font-size: 15px;
    font-weight: 600;
  }

  .primary-btn {
    height: 48px;
    background: linear-gradient(135deg, #ffc285, #ff9d7a);
    color: #24160d;
    box-shadow: 0 16px 28px rgba(255, 155, 102, 0.28);
  }

  .primary-btn[disabled] {
    opacity: 0.7;
  }

  .ghost-btn {
    height: 44px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .helper-card {
    max-width: 420px;
    width: 100%;
    margin: 0 auto;
  }

  .helper-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .helper-title {
    font-size: 16px;
    font-weight: 600;
  }

  .helper-text {
    display: block;
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.64);
  }

  .helper-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .helper-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }
</style>
