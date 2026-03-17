<template>
  <view class="login-page">
    <view class="login-container">
      <!-- Logo -->
      <view class="logo">
        <text class="logo-icon iconfont icon-house"></text>
        <text class="logo-text gradient-text">智慧家居</text>
      </view>

      <!-- 登录表单 -->
      <view class="glass-card login-form">
        <!-- 账号密码登录 -->
        <view v-if="!showMFA">
          <view class="form-title">连接 Home Assistant</view>
          
          <form @submit.prevent="handleLogin">
            <view class="form-item">
              <text class="form-label">服务器地址</text>
              <input 
                id="serverUrl"
                name="serverUrl"
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
                name="username"
                v-model="username"
                class="form-input"
                type="text"
                placeholder="用户名"
                placeholder-class="input-placeholder"
              />
            </view>

            <view class="form-item">
              <text class="form-label">密码</text>
              <input 
                id="password"
                name="password"
                v-model="password"
                class="form-input"
                type="password"
                placeholder="密码"
                placeholder-class="input-placeholder"
              />
            </view>
          </form>
        </view>

        <!-- MFA 验证 -->
        <view v-else-if="showMFA">
          <view class="mfa-header">
            <text class="iconfont icon-shield-halved"></text>
            <text class="mfa-title">双因子认证</text>
          </view>
          
          <form @submit.prevent="handleLogin">
            <view class="form-item">
              <text class="form-label">{{ mfaType === 'totp' ? '验证码' : '验证码' }}</text>
              <input 
                id="mfaCode"
                name="mfaCode"
                v-model="mfaCode"
                class="form-input"
                type="text"
                :placeholder="mfaType === 'totp' ? '6位数字验证码' : '验证码'"
                placeholder-class="input-placeholder"
                maxlength="6"
              />
            </view>

            <view class="form-tip">
              <text class="iconfont icon-circle-info"></text>
              <text>{{ mfaType === 'totp' ? '请输入认证器应用中的验证码' : '请输入收到的验证码' }}</text>
            </view>
          </form>
        </view>

        <button 
          class="login-btn"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '验证中...' : (showMFA ? '验证' : '连接') }}
        </button>

        <!-- MFA 返回按钮 -->
        <button 
          v-if="showMFA"
          class="back-btn"
          @click="cancelMFA"
        >
          返回
        </button>
      </view>

      <!-- 错误提示 -->
      <view v-if="errorMsg" class="error-msg">
        <text class="iconfont icon-circle-xmark"></text>
        <text>{{ errorMsg }}</text>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 登录页面组件
   * 功能: 账号密码登录（含 MFA）
   */
  import { ref } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()
      
      // 表单数据
      const serverUrl = ref('')
      const username = ref('')
      const password = ref('')
      
      // MFA 相关
      const showMFA = ref(false)
      const mfaType = ref('')
      const mfaCode = ref('')
      const authFlowId = ref('')
      
      // 状态
      const loading = ref(false)
      const errorMsg = ref('')
      
      /**
       * 处理登录
       */
      async function handleLogin() {
        // 验证输入
        if (!serverUrl.value) {
          errorMsg.value = '请输入服务器地址'
          return
        }
        
        // 清空错误信息
        errorMsg.value = ''
        loading.value = true
        
        try {
          if (showMFA.value) {
            // MFA 验证
            if (!mfaCode.value) {
              errorMsg.value = '请输入验证码'
              loading.value = false
              return
            }
            
            await store.loginWithMFA(serverUrl.value, authFlowId.value, mfaCode.value)
            
            // 登录成功,跳转到首页
            uni.switchTab({
              url: '/pages/home/home'
            })
          } else {
            // 账号密码登录
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
            
            // 检查是否需要 MFA
            if (result.requireMFA) {
              showMFA.value = true
              mfaType.value = result.mfaType || 'totp'
              authFlowId.value = result.flowId
              loading.value = false
            } else {
              // 登录成功,跳转到首页
              uni.switchTab({
                url: '/pages/home/home'
              })
            }
          }
        } catch (error) {
          errorMsg.value = error.message || '连接失败,请检查配置'
          loading.value = false
        }
      }
      
      /**
       * 取消 MFA
       */
      function cancelMFA() {
        showMFA.value = false
        mfaCode.value = ''
        authFlowId.value = ''
        loading.value = false
      }
      
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
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .login-container {
    width: 100%;
    max-width: 400px;
  }

  .logo {
    text-align: center;
    margin-bottom: 40px;
  }

  .logo-icon {
    font-size: 60px;
    color: #ffc285;
    display: block;
    margin-bottom: 16px;
  }

  .logo-text {
    font-size: 32px;
    font-weight: 600;
    display: block;
  }

  .login-form {
    padding: 24px;
  }

  .form-title {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 24px;
  }

  .form-item {
    margin-bottom: 20px;
  }

  .form-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 8px;
    display: block;
  }

  .form-input {
    width: 100%;
    height: 44px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 0 16px;
    color: #ffffff;
    font-size: 14px;
    box-sizing: border-box;
    outline: none;
    backdrop-filter: blur(4px);
  }

  .form-input:focus {
    border-color: rgba(255, 200, 150, 0.6);
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 2px rgba(255, 200, 150, 0.2);
  }

  .input-placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .form-tip {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 24px;
  }

  .form-tip .iconfont {
    font-size: 16px;
    color: #ffc285;
  }

  .mfa-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .mfa-header .iconfont {
    font-size: 32px;
    color: #ffc285;
  }

  .mfa-title {
    font-size: 20px;
    font-weight: 600;
  }

  .login-btn {
    width: 100%;
    height: 48px;
    background: linear-gradient(135deg, #ffc285, #ff9a85);
    border-radius: 24px;
    border: none;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 8px 20px rgba(255, 194, 133, 0.3);
  }

  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(255, 194, 133, 0.4);
  }

  .login-btn:active {
    transform: scale(0.98);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .back-btn {
    width: 100%;
    height: 44px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    margin-top: 12px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .error-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 16px;
    background: rgba(255, 100, 100, 0.15);
    border: 1px solid rgba(255, 100, 100, 0.4);
    border-radius: 12px;
    font-size: 14px;
    color: #ffaaaa;
    backdrop-filter: blur(8px);
  }

  .error-msg .iconfont {
    font-size: 18px;
  }
</style>
