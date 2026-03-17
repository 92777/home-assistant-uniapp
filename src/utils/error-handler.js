/**
 * 错误处理工具类
 * 功能: 统一处理应用中的错误,提供友好的错误提示
 */

/**
 * 错误类型枚举
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  API: 'API_ERROR',
  WEBSOCKET: 'WEBSOCKET_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
}

/**
 * 错误消息映射
 */
const ErrorMessages = {
  [ErrorTypes.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorTypes.AUTH]: '认证失败，请检查访问令牌',
  [ErrorTypes.API]: 'API 调用失败',
  [ErrorTypes.WEBSOCKET]: 'WebSocket 连接失败',
  [ErrorTypes.VALIDATION]: '数据验证失败',
  [ErrorTypes.UNKNOWN]: '未知错误'
}

/**
 * 错误处理类
 */
export class ErrorHandler {
  /**
   * 处理错误
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} type - 错误类型
   * @param {object} options - 配置选项
   * @returns {object} 错误信息对象
   */
  static handle(error, type = ErrorTypes.UNKNOWN, options = {}) {
    const {
      showToast = true,        // 是否显示提示
      duration = 2000,          // 提示持续时间
      log = true,               // 是否记录日志
      report = false            // 是否上报错误
    } = options

    // 解析错误信息
    const errorInfo = this.parseError(error, type)
    
    // 记录日志
    if (log) {
      console.error(`[${errorInfo.type}]`, errorInfo.message, errorInfo.details)
    }
    
    // 显示提示
    if (showToast) {
      uni.showToast({
        title: errorInfo.message,
        icon: 'none',
        duration
      })
    }
    
    // 上报错误
    if (report) {
      this.reportError(errorInfo)
    }
    
    return errorInfo
  }

  /**
   * 解析错误信息
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} type - 错误类型
   * @returns {object} 错误信息对象
   */
  static parseError(error, type) {
    let message = ErrorMessages[type] || ErrorMessages[ErrorTypes.UNKNOWN]
    let details = null
    
    if (typeof error === 'string') {
      message = error
    } else if (error instanceof Error) {
      message = error.message || message
      details = {
        name: error.name,
        stack: error.stack
      }
    } else if (typeof error === 'object') {
      message = error.message || message
      details = error
    }
    
    return {
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 上报错误
   * @param {object} errorInfo - 错误信息对象
   */
  static reportError(errorInfo) {
    // 这里可以集成错误上报服务
    // 例如: Sentry, BugSnag 等
    console.log('[Error Report]', errorInfo)
  }

  /**
   * 处理网络错误
   * @param {Error} error - 错误对象
   * @param {object} options - 配置选项
   */
  static handleNetworkError(error, options = {}) {
    return this.handle(error, ErrorTypes.NETWORK, options)
  }

  /**
   * 处理认证错误
   * @param {Error} error - 错误对象
   * @param {object} options - 配置选项
   */
  static handleAuthError(error, options = {}) {
    const defaultOptions = {
      ...options,
      onHandle: () => {
        // 清除认证信息
        uni.removeStorageSync('ha_token')
        uni.removeStorageSync('ha_url')
        
        // 跳转到登录页
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }, 1500)
      }
    }
    
    return this.handle(error, ErrorTypes.AUTH, defaultOptions)
  }

  /**
   * 处理 API 错误
   * @param {Error} error - 错误对象
   * @param {object} options - 配置选项
   */
  static handleApiError(error, options = {}) {
    return this.handle(error, ErrorTypes.API, options)
  }

  /**
   * 处理 WebSocket 错误
   * @param {Error} error - 错误对象
   * @param {object} options - 配置选项
   */
  static handleWebSocketError(error, options = {}) {
    return this.handle(error, ErrorTypes.WEBSOCKET, options)
  }
}

/**
 * 全局错误处理器
 */
export function setupGlobalErrorHandler() {
  // 捕获未处理的 Promise 拒绝
  uni.onUnhandledRejection((event) => {
    console.error('[Unhandled Rejection]', event)
    ErrorHandler.handle(event.reason, ErrorTypes.UNKNOWN, {
      showToast: true,
      report: true
    })
  })

  // 捕获未捕获的错误
  uni.onError((error) => {
    console.error('[Global Error]', error)
    ErrorHandler.handle(error, ErrorTypes.UNKNOWN, {
      showToast: false,  // 避免重复提示
      report: true
    })
  })
}
