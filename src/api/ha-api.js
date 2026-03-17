/**
 * Home Assistant API 服务
 * 功能: 封装所有与 Home Assistant 的 REST API 和 WebSocket API 交互
 */
import { ref } from 'vue'

/**
 * API 配置类
 * 存储 Home Assistant 连接配置
 */
class ApiConfig {
  constructor() {
    this.baseUrl = ref('')
    this.accessToken = ref('')
    this.wsUrl = ref('')
  }

  /**
   * 设置配置
   * @param {string} url - Home Assistant URL
   * @param {string} token - Long-Lived Access Token
   */
  setConfig(url, token) {
    this.baseUrl.value = url
    this.accessToken.value = token
    this.wsUrl.value = url.replace('http', 'ws') + '/api/websocket'
  }
}

const apiConfig = new ApiConfig()

/**
 * REST API 请求封装
 * @param {string} endpoint - API 端点
 * @param {string} method - HTTP 方法
 * @param {object} data - 请求数据
 * @returns {Promise} 响应数据
 */
async function request(endpoint, method = 'GET', data = null) {
  // 判断是否使用代理
  const useProxy = apiConfig.baseUrl.value.includes('demo.example.com') || apiConfig.baseUrl.value.includes('localhost')
  const baseUrl = useProxy ? '' : apiConfig.baseUrl.value
  const url = `${baseUrl}/api${endpoint}`
  
  const options = {
    method,
    header: {
      'Authorization': `Bearer ${apiConfig.accessToken.value}`,
      'Content-Type': 'application/json'
    }
  }
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.data = data
  }
  
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      ...options,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          reject(new Error('认证失败,请检查 Token'))
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(`网络错误: ${err.errMsg}`))
      }
    })
  })
}

/**
 * WebSocket 连接管理
 */
class WebSocketManager {
  constructor() {
    this.ws = null
    this.messageId = 1
    this.isAuthenticated = false
    this.subscriptions = new Map()
    this.eventHandlers = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
    this.reconnectTimer = null
    this.isManualClose = false
  }

  /**
   * 连接 WebSocket
   * @returns {Promise} 连接结果
   */
  connect() {
    return new Promise((resolve, reject) => {
      this.isManualClose = false
      this.ws = uni.connectSocket({
        url: apiConfig.wsUrl.value,
        success: () => {
          console.log('WebSocket 连接成功')
        }
      })
      
      uni.onSocketOpen(() => {
        console.log('WebSocket 已打开')
        this.reconnectAttempts = 0
        resolve()
      })
      
      uni.onSocketMessage((res) => {
        const message = JSON.parse(res.data)
        this.handleMessage(message)
      })
      
      uni.onSocketError((err) => {
        console.error('WebSocket 错误:', err)
        reject(err)
      })
      
      uni.onSocketClose(() => {
        console.log('WebSocket 已关闭')
        this.isAuthenticated = false
        
        // 自动重连
        if (!this.isManualClose) {
          this.handleReconnect()
        }
      })
    })
  }

  /**
   * 处理重连
   */
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket 重连次数已达上限')
      uni.showToast({
        title: '连接已断开，请重新登录',
        icon: 'none',
        duration: 2000
      })
      
      // 清除认证信息并跳转到登录页
      setTimeout(() => {
        uni.removeStorageSync('ha_token')
        uni.removeStorageSync('ha_url')
        uni.redirectTo({
          url: '/pages/login/login'
        })
      }, 2000)
      
      return
    }
    
    this.reconnectAttempts++
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    uni.showToast({
      title: `正在重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      icon: 'none',
      duration: 1500
    })
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        console.error('重连失败:', err)
      })
    }, this.reconnectInterval)
  }

  /**
   * 处理 WebSocket 消息
   * @param {object} message - 消息对象
   */
  handleMessage(message) {
    switch (message.type) {
      case 'auth_required':
        this.authenticate()
        break
      case 'auth_ok':
        this.isAuthenticated = true
        console.log('WebSocket 认证成功')
        this.onAuthenticated()
        break
      case 'auth_invalid':
        console.error('WebSocket 认证失败:', message.message)
        break
      case 'event':
        this.handleEvent(message)
        break
      case 'result':
        this.handleResult(message)
        break
    }
  }

  /**
   * 认证
   */
  authenticate() {
    const authMessage = {
      type: 'auth',
      access_token: apiConfig.accessToken.value
    }
    this.send(authMessage)
  }

  /**
   * 认证成功后的回调
   */
  onAuthenticated() {
    // 订阅状态变化事件
    this.subscribeEvents('state_changed')
  }

  /**
   * 发送消息
   * @param {object} message - 消息对象
   */
  send(message) {
    uni.sendSocketMessage({
      data: JSON.stringify(message)
    })
  }

  /**
   * 订阅事件
   * @param {string} eventType - 事件类型
   */
  subscribeEvents(eventType) {
    const message = {
      id: this.messageId++,
      type: 'subscribe_events',
      event_type: eventType
    }
    this.subscriptions.set(message.id, eventType)
    this.send(message)
  }

  /**
   * 处理事件
   * @param {object} message - 事件消息
   */
  handleEvent(message) {
    const eventType = message.event?.event_type
    if (eventType && this.eventHandlers.has(eventType)) {
      const handler = this.eventHandlers.get(eventType)
      handler(message.event)
    }
  }

  /**
   * 处理结果
   * @param {object} message - 结果消息
   */
  handleResult(message) {
    console.log('命令结果:', message)
  }

  /**
   * 注册事件处理器
   * @param {string} eventType - 事件类型
   * @param {function} handler - 处理函数
   */
  onEvent(eventType, handler) {
    this.eventHandlers.set(eventType, handler)
  }

  /**
   * 调用服务
   * @param {string} domain - 服务域
   * @param {string} service - 服务名称
   * @param {object} data - 服务数据
   */
  callService(domain, service, data) {
    const message = {
      id: this.messageId++,
      type: 'call_service',
      domain,
      service,
      service_data: data
    }
    this.send(message)
  }

  /**
   * 获取所有状态
   * @returns {Promise} 状态列表
   */
  getStates() {
    return new Promise((resolve) => {
      const id = this.messageId++
      const message = {
        id,
        type: 'get_states'
      }
      
      const handler = (res) => {
        const data = JSON.parse(res.data)
        if (data.id === id && data.type === 'result') {
          uni.offSocketMessage(handler)
          resolve(data.result)
        }
      }
      
      uni.onSocketMessage(handler)
      this.send(message)
    })
  }

  /**
   * 关闭连接
   */
  close() {
    this.isManualClose = true
    
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      uni.closeSocket()
      this.ws = null
      this.isAuthenticated = false
    }
  }
}

const wsManager = new WebSocketManager()

/**
 * API 服务对象
 */
export const apiService = {
  /**
   * 初始化 API
   * @param {string} url - Home Assistant URL
   * @param {string} token - Access Token
   */
  async init(url, token) {
    apiConfig.setConfig(url, token)
    
    // 保存配置到本地存储
    uni.setStorageSync('ha_url', url)
    uni.setStorageSync('ha_token', token)
    
    // 连接 WebSocket
    await wsManager.connect()
  },

  /**
   * 加载保存的配置
   * @returns {boolean} 是否有保存的配置
   */
  loadConfig() {
    const url = uni.getStorageSync('ha_url')
    const token = uni.getStorageSync('ha_token')
    
    if (url && token) {
      apiConfig.setConfig(url, token)
      return true
    }
    return false
  },

  /**
   * 账号密码登录
   * @param {string} url - Home Assistant URL
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise} 登录结果
   */
  async loginWithPassword(url, username, password) {
    try {
      // 判断是否使用代理
      const useProxy = url.includes('demo.example.com') || url.includes('localhost')
      const baseUrl = useProxy ? '' : url
      const clientId = useProxy ? 'http://localhost:8080' : url
      
      // 1. 初始化认证流程
      const initResponse = await uni.request({
        url: `${baseUrl}/auth/login_flow`,
        method: 'POST',
        data: {
          client_id: clientId,
          handler: ['homeassistant', null],
          redirect_uri: `${clientId}/?auth_callback=1`
        },
        header: {
          'Content-Type': 'application/json'
        }
      })
      
      if (initResponse.statusCode !== 200) {
        throw new Error('初始化认证流程失败')
      }
      
      const flowId = initResponse.data.flow_id
      
      // 2. 提交用户名密码
      const loginResponse = await uni.request({
        url: `${baseUrl}/auth/login_flow/${flowId}`,
        method: 'POST',
        data: {
          username,
          password,
          client_id: clientId
        },
        header: {
          'Content-Type': 'application/json'
        }
      })
      
      if (loginResponse.statusCode !== 200) {
        throw new Error(loginResponse.data.message || '登录失败')
      }
      
      // 3. 检查是否需要 MFA
      if (loginResponse.data.type === 'form') {
        // 需要 MFA 验证
        return {
          requireMFA: true,
          mfaType: loginResponse.data.step_id,
          flowId: flowId
        }
      }
      
      // 4. 获取 access token
      const tokenResponse = await uni.request({
        url: `${baseUrl}/auth/token`,
        method: 'POST',
        data: {
          grant_type: 'authorization_code',
          code: loginResponse.data.result,
          client_id: clientId
        },
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      if (tokenResponse.statusCode !== 200) {
        throw new Error('获取访问令牌失败')
      }
      
      return {
        requireMFA: false,
        token: tokenResponse.data.access_token
      }
    } catch (error) {
      console.error('账号密码登录失败:', error)
      throw error
    }
  },

  /**
   * MFA 验证
   * @param {string} url - Home Assistant URL
   * @param {string} flowId - 认证流程 ID
   * @param {string} code - 验证码
   * @returns {Promise} 验证结果
   */
  async loginWithMFA(url, flowId, code) {
    try {
      // 判断是否使用代理
      const useProxy = url.includes('demo.example.com') || url.includes('localhost')
      const baseUrl = useProxy ? '' : url
      const clientId = useProxy ? 'http://localhost:8080' : url
      
      // 1. 提交 MFA 验证码
      const mfaResponse = await uni.request({
        url: `${baseUrl}/auth/login_flow/${flowId}`,
        method: 'POST',
        data: {
          code,
          client_id: clientId
        },
        header: {
          'Content-Type': 'application/json'
        }
      })
      
      if (mfaResponse.statusCode !== 200) {
        throw new Error(mfaResponse.data.message || 'MFA 验证失败')
      }
      
      // 2. 获取 access token
      const tokenResponse = await uni.request({
        url: `${baseUrl}/auth/token`,
        method: 'POST',
        data: {
          grant_type: 'authorization_code',
          code: mfaResponse.data.result,
          client_id: clientId
        },
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      if (tokenResponse.statusCode !== 200) {
        throw new Error('获取访问令牌失败')
      }
      
      return {
        token: tokenResponse.data.access_token
      }
    } catch (error) {
      console.error('MFA 验证失败:', error)
      throw error
    }
  },

  /**
   * 检查 API 是否运行
   * @returns {Promise} 检查结果
   */
  async checkApi() {
    return await request('/')
  },

  /**
   * 获取配置信息
   * @returns {Promise} 配置信息
   */
  async getConfig() {
    return await request('/config')
  },

  /**
   * 获取所有实体状态
   * @returns {Promise} 状态列表
   */
  async getStates() {
    return await request('/states')
  },

  /**
   * 获取特定实体状态
   * @param {string} entityId - 实体 ID
   * @returns {Promise} 实体状态
   */
  async getState(entityId) {
    return await request(`/states/${entityId}`)
  },

  /**
   * 调用服务
   * @param {string} domain - 服务域
   * @param {string} service - 服务名称
   * @param {object} data - 服务数据
   * @returns {Promise} 调用结果
   */
  async callService(domain, service, data) {
    return await request(`/services/${domain}/${service}`, 'POST', data)
  },

  /**
   * 获取所有服务
   * @returns {Promise} 服务列表
   */
  async getServices() {
    return await request('/services')
  },

  /**
   * 获取事件列表
   * @returns {Promise} 事件列表
   */
  async getEvents() {
    return await request('/events')
  },

  /**
   * 获取历史数据
   * @param {string} entityId - 实体 ID
   * @param {string} timestamp - 开始时间
   * @param {object} params - 查询参数
   * @returns {Promise} 历史数据
   */
  async getHistory(entityId, timestamp, params = {}) {
    let url = `/history/period/${timestamp}?filter_entity_id=${entityId}`
    
    if (params.endTime) {
      url += `&end_time=${params.endTime}`
    }
    if (params.minimalResponse) {
      url += '&minimal_response'
    }
    
    return await request(url)
  },

  /**
   * WebSocket 相关方法
   */
  ws: {
    /**
     * 订阅状态变化事件
     * @param {function} handler - 处理函数
     */
    onStateChanged(handler) {
      wsManager.onEvent('state_changed', handler)
    },

    /**
     * 通过 WebSocket 调用服务
     * @param {string} domain - 服务域
     * @param {string} service - 服务名称
     * @param {object} data - 服务数据
     */
    callService(domain, service, data) {
      wsManager.callService(domain, service, data)
    },

    /**
     * 获取所有状态
     * @returns {Promise} 状态列表
     */
    async getStates() {
      return await wsManager.getStates()
    },

    /**
     * 关闭连接
     */
    close() {
      wsManager.close()
    }
  }
}
