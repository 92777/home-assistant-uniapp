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
            {{ showMFA ? '输入验证码以完成安全验证。' : '输入服务器地址和账号，完成首次连接。' }}
          </text>
        </view>

        <view v-if="!showMFA" class="form-list">
          <view class="form-item">
            <text class="form-label">服务器地址</text>
            <input
              id="serverUrl"
              v-model="serverUrl"
              class="form-input"
              type="text"
              placeholder="http://192.168.1.100:8123"
              placeholder-class="input-placeholder"
            />
          </view>

          <view class="form-item">
            <text class="form-label">用户名</text>
            <input
              id="username"
              v-model="username"
              class="form-input"
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
              type="password"
              placeholder="请输入密码"
              placeholder-class="input-placeholder"
            />
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
              type="text"
              maxlength="6"
              :placeholder="mfaType === 'totp' ? '6位数字验证码' : '请输入验证码'"
              placeholder-class="input-placeholder"
            />
          </view>
        </view>

        <view v-if="errorMsg" class="error-card">
          <text class="iconfont icon-circle-xmark"></text>
          <text>{{ errorMsg }}</text>
        </view>

        <button class="primary-btn" :disabled="loading" @click="handleLogin">
          {{ loading ? '处理中...' : (showMFA ? '验证并进入' : '连接到家庭') }}
        </button>

        <button v-if="showMFA" class="ghost-btn" :disabled="loading" @click="cancelMFA">
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
  import { ref, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'
  import WeatherBackdrop from '../../components/WeatherBackdrop.vue'
  import { apiService } from '../../api/ha-api.js'

  export default {
    components: {
      WeatherBackdrop
    },

    setup() {
      const store = useHAStore()
      const serverUrl = ref('')
      const username = ref('')
      const password = ref('')
      const showMFA = ref(false)
      const mfaType = ref('')
      const mfaCode = ref('')
      const authFlowId = ref('')
      const loading = ref(false)
      const errorMsg = ref('')

      async function handleLogin() {
        if (!serverUrl.value) {
          errorMsg.value = '请输入服务器地址'
          return
        }

        errorMsg.value = ''
        loading.value = true

        try {
          if (showMFA.value) {
            if (!mfaCode.value) {
              errorMsg.value = '请输入验证码'
              loading.value = false
              return
            }

            await store.loginWithMFA(serverUrl.value, authFlowId.value, mfaCode.value)
            uni.switchTab({
              url: '/pages/home/home'
            })
            return
          }

          if (!username.value) {
            errorMsg.value = '请输入用户名'
            loading.value = false
            return
          }

          if (!password.value) {
            errorMsg.value = '请输入密码'
            loading.value = false
            return
          }

          const result = await store.loginWithPassword(
            serverUrl.value,
            username.value,
            password.value
          )

          if (result.requireMFA) {
            showMFA.value = true
            mfaType.value = result.mfaType || 'totp'
            authFlowId.value = result.flowId
            loading.value = false
            return
          }

          uni.switchTab({
            url: '/pages/home/home'
          })
        } catch (error) {
          errorMsg.value = error.message || '连接失败，请检查配置'
          loading.value = false
        }
      }

      function cancelMFA() {
        showMFA.value = false
        mfaCode.value = ''
        authFlowId.value = ''
        loading.value = false
      }

      onMounted(() => {
        serverUrl.value = ''
      })

      return {
        serverUrl,
        username,
        password,
        showMFA,
        mfaType,
        mfaCode,
        loading,
        errorMsg,
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
