/**
 * Home Assistant API 服务
 * 功能: 封装所有与 Home Assistant 的 REST API 和 WebSocket API 交互
 */
import { ref } from 'vue'
import {
  normalizeChineseWeather,
  parseWeatherIndexResponse,
  parseWeatherObservationResponse,
  parseWeatherSearchResponse
} from '../utils/weather.js'

const H5_PROXY_TARGET = typeof import.meta !== 'undefined'
  ? (import.meta.env.VITE_HA_PROXY_TARGET || '')
  : ''

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
    if (shouldUseProxy(url) && isH5Runtime()) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      this.wsUrl.value = `${protocol}//${window.location.host}/api/websocket`
      return
    }

    this.wsUrl.value = url.replace('http', 'ws') + '/api/websocket'
  }
}

const apiConfig = new ApiConfig()
const wsConnectionStatus = ref('rest')
const WEATHER_CITY_CODE_MAP = {
  北京: '101010100',
  上海: '101020100',
  广州: '101280101',
  深圳: '101280601',
  杭州: '101210101',
  南京: '101190101',
  苏州: '101190401',
  成都: '101270101',
  重庆: '101040100',
  武汉: '101200101',
  西安: '101110101',
  郑州: '101180101',
  长沙: '101250101',
  合肥: '101220101',
  福州: '101230101',
  厦门: '101230201',
  青岛: '101120201',
  济南: '101120101',
  天津: '101030100',
  石家庄: '101090101',
  太原: '101100101',
  沈阳: '101070101',
  大连: '101070201',
  长春: '101060101',
  哈尔滨: '101050101',
  南昌: '101240101',
  南宁: '101300101',
  昆明: '101290101',
  贵阳: '101260101',
  海口: '101310101',
  三亚: '101310201',
  兰州: '101160101',
  银川: '101170101',
  西宁: '101150101',
  乌鲁木齐: '101130101',
  拉萨: '101140101',
  呼和浩特: '101080101'
}

function shouldUseProxy(url = '') {
  if (!isH5Runtime() || !H5_PROXY_TARGET) {
    return false
  }

  try {
    return new URL(url).origin === new URL(H5_PROXY_TARGET).origin
  } catch {
    return false
  }
}

function getRuntimeClientId(url = '', useProxy = false) {
  if (useProxy && isH5Runtime() && window.location?.origin) {
    return window.location.origin
  }

  return url
}

function isRuntimeCompatibleUrl(url = '') {
  if (!url) {
    return false
  }

  if (!isH5Runtime()) {
    return true
  }

  if (shouldUseProxy(url)) {
    return true
  }

  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * REST API 请求封装
 * @param {string} endpoint - API 端点
 * @param {string} method - HTTP 方法
 * @param {object} data - 请求数据
 * @returns {Promise} 响应数据
 */
async function request(endpoint, method = 'GET', data = null) {
  // 判断是否使用代理
  const useProxy = shouldUseProxy(apiConfig.baseUrl.value)
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
          const detail =
            res.data?.message ||
            res.data?.error ||
            (typeof res.data === 'string' ? res.data : '')
          reject(new Error(`请求失败: ${res.statusCode}${detail ? ` - ${detail}` : ''}`))
        }
      },
      fail: (err) => {
        reject(new Error(`网络错误: ${err.errMsg}`))
      }
    })
  })
}

function isH5Runtime() {
  return typeof window !== 'undefined'
}

function requestText(url, header = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(typeof res.data === 'string' ? res.data : JSON.stringify(res.data))
        } else {
          reject(new Error(`文本请求失败: ${res.statusCode}`))
        }
      },
      fail: (error) => {
        reject(new Error(`文本请求失败: ${error.errMsg}`))
      }
    })
  })
}

function getWeatherRequestConfig(type, cityCodeOrKeyword) {
  const weatherHeaders = {
    Referer: 'https://www.weather.com.cn/',
    'User-Agent': 'Mozilla/5.0'
  }

  if (type === 'search') {
    return isH5Runtime()
      ? {
          url: `/weather-search?cityname=${encodeURIComponent(cityCodeOrKeyword)}`,
          header: {}
        }
      : {
          url: `https://toy1.weather.com.cn/search?cityname=${encodeURIComponent(cityCodeOrKeyword)}`,
          header: weatherHeaders
        }
  }

  if (type === 'now') {
    return isH5Runtime()
      ? {
          url: `/weather-now/${cityCodeOrKeyword}.html`,
          header: {}
        }
      : {
          url: `https://d1.weather.com.cn/sk_2d/${cityCodeOrKeyword}.html`,
          header: weatherHeaders
        }
  }

  return isH5Runtime()
    ? {
        url: `/weather-index/${cityCodeOrKeyword}.html`,
        header: {}
      }
    : {
        url: `https://d1.weather.com.cn/weather_index/${cityCodeOrKeyword}.html`,
        header: weatherHeaders
  }
}

function resolveWeatherCityCandidate(keyword = '', cityCandidates = []) {
  const normalizedKeyword = String(keyword || '').trim()
  const matchedCandidate = cityCandidates.find((item) => item.cityCode && !item.rawRef.includes('景点')) || cityCandidates[0]

  if (matchedCandidate?.cityCode) {
    return matchedCandidate
  }

  if (/^\d{9}$/.test(normalizedKeyword)) {
    return {
      rawRef: normalizedKeyword,
      cityCode: normalizedKeyword,
      province: '',
      cityName: normalizedKeyword,
      displayName: normalizedKeyword
    }
  }

  const mappedCode = WEATHER_CITY_CODE_MAP[normalizedKeyword]

  if (mappedCode) {
    return {
      rawRef: `${mappedCode}~${normalizedKeyword}`,
      cityCode: mappedCode,
      province: '',
      cityName: normalizedKeyword,
      displayName: normalizedKeyword
    }
  }

  return null
}

function createTransientSocket(url) {
  if (isH5Runtime() && typeof WebSocket !== 'undefined') {
    const nativeSocket = new WebSocket(url)

    return {
      onOpen(handler) {
        nativeSocket.addEventListener('open', handler)
      },
      onError(handler) {
        nativeSocket.addEventListener('error', handler)
      },
      onClose(handler) {
        nativeSocket.addEventListener('close', (event) => {
          handler({
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })
        })
      },
      onMessage(handler) {
        nativeSocket.addEventListener('message', (event) => {
          handler({
            data: event.data
          })
        })
      },
      send(payload) {
        nativeSocket.send(typeof payload === 'string' ? payload : payload.data)
      },
      close(payload = {}) {
        nativeSocket.close(payload.code || 1000, payload.reason || 'request complete')
      }
    }
  }

  const socketTask = uni.connectSocket({
    url
  })

  return {
    onOpen(handler) {
      if (typeof socketTask.onOpen === 'function') {
        socketTask.onOpen(handler)
        return
      }

      uni.onSocketOpen(handler)
    },
    onError(handler) {
      if (typeof socketTask.onError === 'function') {
        socketTask.onError(handler)
        return
      }

      uni.onSocketError(handler)
    },
    onClose(handler) {
      if (typeof socketTask.onClose === 'function') {
        socketTask.onClose(handler)
        return
      }

      uni.onSocketClose(handler)
    },
    onMessage(handler) {
      if (typeof socketTask.onMessage === 'function') {
        socketTask.onMessage(handler)
        return
      }

      uni.onSocketMessage(handler)
    },
    send(payload) {
      if (typeof socketTask.send === 'function') {
        socketTask.send(payload)
        return
      }

      uni.sendSocketMessage(payload)
    },
    close(payload) {
      if (typeof socketTask.close === 'function') {
        socketTask.close(payload)
        return
      }

      uni.closeSocket(payload)
    }
  }
}

function runSocketCommands(commands = []) {
  return new Promise((resolve, reject) => {
    const commandList = commands.map((command, index) => ({
      id: index + 1,
      ...command
    }))

    const socket = createTransientSocket(apiConfig.wsUrl.value)

    const resultMap = new Map()
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('WebSocket 请求超时'))
    }, 15000)

    let settled = false

    function cleanup() {
      clearTimeout(timeout)

      try {
        socket.close({
          code: 1000,
          reason: 'request complete'
        })
      } catch (error) {
        console.warn('关闭临时 WebSocket 失败:', error)
      }
    }

    function finish(callback) {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      callback()
    }

    socket.onOpen(() => {
      console.log('临时 WebSocket 已连接')
    })

    socket.onError((error) => {
      finish(() => reject(error))
    })

    socket.onClose(() => {
      if (!settled) {
        finish(() => reject(new Error('WebSocket 连接已关闭')))
      }
    })

    socket.onMessage(({ data }) => {
      const message = typeof data === 'string' ? JSON.parse(data) : JSON.parse(String(data || '{}'))

      if (message.type === 'auth_required') {
        socket.send({
          data: JSON.stringify({
            type: 'auth',
            access_token: apiConfig.accessToken.value
          })
        })
        return
      }

      if (message.type === 'auth_invalid') {
        finish(() => reject(new Error(message.message || 'WebSocket 认证失败')))
        return
      }

      if (message.type === 'auth_ok') {
        commandList.forEach((command) => {
          socket.send({
            data: JSON.stringify(command)
          })
        })
        return
      }

      if (message.type === 'result') {
        if (!message.success) {
          finish(() => reject(new Error(message.error?.message || 'WebSocket 请求失败')))
          return
        }

        resultMap.set(message.id, message.result)

        if (resultMap.size === commandList.length) {
          finish(() => {
            resolve(commandList.map((command) => resultMap.get(command.id)))
          })
        }
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
    this.pendingRequests = new Map()
    this.connectionVersion = 0
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 3000
    this.reconnectTimer = null
    this.connectPromise = null
    this.isManualClose = false
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null
    this.heartbeatInterval = 25000
    this.heartbeatTimeout = 12000
  }

  setStatus(status) {
    wsConnectionStatus.value = status
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  confirmHeartbeat() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }

    if (this.isAuthenticated) {
      this.setStatus('online')
    }
  }

  startHeartbeat() {
    this.clearHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || !this.isAuthenticated) {
        return
      }

      try {
        this.send({
          id: this.messageId++,
          type: 'ping'
        })
      } catch (error) {
        console.warn('发送 WebSocket 心跳失败:', error)
        this.forceReconnect('ping send failed')
        return
      }

      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer)
      }

      this.heartbeatTimeoutTimer = setTimeout(() => {
        console.warn('WebSocket 心跳超时，准备重连')
        this.forceReconnect('pong timeout')
      }, this.heartbeatTimeout)
    }, this.heartbeatInterval)
  }

  forceReconnect(reason = '') {
    if (this.isManualClose || !this.ws) {
      return
    }

    console.warn(`触发 WebSocket 重连${reason ? `: ${reason}` : ''}`)
    this.isManualClose = true
    this.closeSocketOnly()
    this.isManualClose = false
    this.handleReconnect(reason)
  }

  /**
   * 连接 WebSocket
   * @returns {Promise} 连接结果
   */
  connect() {
    if (this.isAuthenticated && this.ws) {
      this.setStatus('online')
      return Promise.resolve()
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    const pendingPromise = new Promise((resolve, reject) => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')
      this.isManualClose = true
      this.closeSocketOnly()
      this.clearHeartbeat()
      this.isAuthenticated = false

      const connectionVersion = ++this.connectionVersion
      const socket = createTransientSocket(apiConfig.wsUrl.value)
      this.ws = socket
      this.isManualClose = false

      let settled = false

      const finish = (callback) => {
        if (settled) {
          return
        }

        settled = true
        callback()
      }

      socket.onOpen(() => {
        if (this.connectionVersion !== connectionVersion || this.ws !== socket) {
          return
        }

        console.log('WebSocket 已打开')
      })

      socket.onMessage(({ data }) => {
        if (this.connectionVersion !== connectionVersion || this.ws !== socket) {
          return
        }

        try {
          const message = typeof data === 'string' ? JSON.parse(data) : JSON.parse(String(data || '{}'))

          if (message.type === 'auth_required') {
            this.authenticate()
            return
          }

          if (message.type === 'pong') {
            this.confirmHeartbeat()
            return
          }

          if (message.type === 'ping') {
            this.send({
              id: message.id,
              type: 'pong'
            })
            return
          }

          if (message.type === 'auth_ok') {
            this.isAuthenticated = true
            this.reconnectAttempts = 0
            this.setStatus('online')
            this.startHeartbeat()
            console.log('WebSocket 认证成功')
            this.onAuthenticated()
            finish(() => resolve())
            return
          }

          if (message.type === 'auth_invalid') {
            finish(() => reject(new Error(message.message || 'WebSocket 认证失败')))
            return
          }

          this.handleMessage(message)
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error)
        }
      })

      socket.onError((error) => {
        if (this.connectionVersion !== connectionVersion || this.ws !== socket) {
          return
        }

        this.clearHeartbeat()
        this.setStatus('reconnecting')
        console.error('WebSocket 错误:', error)
        finish(() => reject(error instanceof Error ? error : new Error('WebSocket 连接失败')))
      })

      socket.onClose((event) => {
        if (this.connectionVersion !== connectionVersion || this.ws !== socket) {
          return
        }

        this.clearHeartbeat()
        console.log('WebSocket 已关闭', event)
        this.isAuthenticated = false
        this.rejectPendingRequests(new Error('WebSocket 连接已关闭'))
        this.ws = null

        if (!settled) {
          finish(() => reject(new Error('WebSocket 连接已关闭')))
        }

        if (!this.isManualClose) {
          this.handleReconnect(event?.reason || '')
        } else if (!this.connectPromise) {
          this.setStatus('rest')
        }
      })
    })

    this.connectPromise = pendingPromise
    pendingPromise.finally(() => {
      if (this.connectPromise === pendingPromise) {
        this.connectPromise = null
      }
    })

    return pendingPromise
  }

  /**
   * 处理重连
   */
  handleReconnect(reason = '') {
    if (this.reconnectTimer) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket 重连次数已达上限')
      this.setStatus('rest')
      return
    }

    this.reconnectAttempts++
    this.setStatus('reconnecting')
    const delay = Math.min(this.reconnectInterval * Math.pow(1.6, this.reconnectAttempts - 1), 12000)
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, reason)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(err => {
        console.error('重连失败:', err)
      })
    }, delay)
  }

  /**
   * 处理 WebSocket 消息
   * @param {object} message - 消息对象
   */
  handleMessage(message) {
    switch (message.type) {
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
    this.subscribeEvents('state_changed').catch((error) => {
      console.error('订阅状态变化事件失败:', error)
    })
  }

  /**
   * 发送消息
   * @param {object} message - 消息对象
   */
  send(message) {
    if (!this.ws) {
      throw new Error('WebSocket 未连接')
    }

    this.ws.send({
      data: JSON.stringify(message)
    })
  }

  sendRequest(message) {
    return new Promise((resolve, reject) => {
      if (!this.isAuthenticated) {
        reject(new Error('WebSocket 尚未认证'))
        return
      }

      this.pendingRequests.set(message.id, {
        resolve,
        reject
      })

      try {
        this.send(message)
      } catch (error) {
        this.pendingRequests.delete(message.id)
        reject(error)
      }
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

    return this.sendRequest(message).then((result) => {
      this.subscriptions.set(message.id, eventType)
      return result
    })
  }

  /**
   * 处理事件
   * @param {object} message - 事件消息
   */
  handleEvent(message) {
    const eventType = message.event?.event_type
    if (eventType && this.eventHandlers.has(eventType)) {
      this.eventHandlers.get(eventType).forEach((handler) => {
        try {
          handler(message.event)
        } catch (error) {
          console.error(`处理 ${eventType} 事件失败:`, error)
        }
      })
    }
  }

  /**
   * 处理结果
   * @param {object} message - 结果消息
   */
  handleResult(message) {
    if (this.pendingRequests.has(message.id)) {
      const pendingRequest = this.pendingRequests.get(message.id)
      this.pendingRequests.delete(message.id)

      if (message.success === false) {
        pendingRequest.reject(new Error(message.error?.message || 'WebSocket 请求失败'))
        return
      }

      pendingRequest.resolve(message.result)
      return
    }

    console.log('命令结果:', message)
  }

  /**
   * 注册事件处理器
   * @param {string} eventType - 事件类型
   * @param {function} handler - 处理函数
   */
  onEvent(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }

    this.eventHandlers.get(eventType).add(handler)

    return () => {
      const handlers = this.eventHandlers.get(eventType)

      if (!handlers) {
        return
      }

      handlers.delete(handler)

      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType)
      }
    }
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

    return this.sendRequest(message)
  }

  /**
   * 获取所有状态
   * @returns {Promise} 状态列表
   */
  getStates() {
    return this.sendRequest({
      id: this.messageId++,
      type: 'get_states'
    })
  }

  getRegistrySnapshot() {
    return Promise.all([
      this.sendRequest({
        id: this.messageId++,
        type: 'config/area_registry/list'
      }),
      this.sendRequest({
        id: this.messageId++,
        type: 'config/device_registry/list'
      }),
      this.sendRequest({
        id: this.messageId++,
        type: 'config/entity_registry/list'
      })
    ]).then(([areas, devices, entities]) => ({
      areas,
      devices,
      entities
    }))
  }

  isReady() {
    return Boolean(this.ws) && this.isAuthenticated
  }

  rejectPendingRequests(error) {
    this.pendingRequests.forEach((requestEntry) => {
      requestEntry.reject(error)
    })
    this.pendingRequests.clear()
  }

  closeSocketOnly() {
    if (!this.ws) {
      return
    }

    const socket = this.ws
    this.ws = null

    try {
      socket.close({
        code: 1000,
        reason: 'manual close'
      })
    } catch (error) {
      console.warn('关闭 WebSocket 失败:', error)
    }
  }

  /**
   * 关闭连接
   */
  close() {
    this.isManualClose = true
    this.connectionVersion++

    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.clearHeartbeat()
    this.rejectPendingRequests(new Error('WebSocket 已手动关闭'))
    this.closeSocketOnly()
    this.isAuthenticated = false
    this.connectPromise = null
    this.setStatus('rest')
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
    
    try {
      await wsManager.connect()

      return {
        websocketEnabled: true
      }
    } catch (error) {
      wsManager.close()
      console.warn('WebSocket 初始化失败，回退到 REST 模式:', error)
    }

    return {
      websocketEnabled: false
    }
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

  clearSavedConfig() {
    uni.removeStorageSync('ha_url')
    uni.removeStorageSync('ha_token')
  },

  isRuntimeCompatibleUrl,

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
      const useProxy = shouldUseProxy(url)
      const baseUrl = useProxy ? '' : url
      const clientId = getRuntimeClientId(url, useProxy)
      
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
      const useProxy = shouldUseProxy(url)
      const baseUrl = useProxy ? '' : url
      const clientId = getRuntimeClientId(url, useProxy)
      
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
   * 获取房间、设备、实体注册表快照
   * @returns {Promise<object>} 注册表数据
   */
  async getRegistrySnapshot() {
    if (wsManager.isReady()) {
      try {
        return await wsManager.getRegistrySnapshot()
      } catch (error) {
        console.warn('主 WebSocket 获取注册表失败，回退到临时连接:', error)
      }
    }

    const [areas, devices, entities] = await runSocketCommands([
      { type: 'config/area_registry/list' },
      { type: 'config/device_registry/list' },
      { type: 'config/entity_registry/list' }
    ])

    return {
      areas,
      devices,
      entities
    }
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
    if (wsManager.isReady()) {
      try {
        return await wsManager.callService(domain, service, data)
      } catch (error) {
        console.warn(`WebSocket 调用 ${domain}.${service} 失败，回退到 REST:`, error)
      }
    }

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
   * 获取中国天气网天气
   * @param {string} keyword - 城市关键字
   * @returns {Promise<object>} 归一化天气数据
   */
  async getChineseWeather(keyword) {
    const searchConfig = getWeatherRequestConfig('search', keyword)
    const searchText = await requestText(searchConfig.url, searchConfig.header)
    const cityCandidates = parseWeatherSearchResponse(searchText)
    const city = resolveWeatherCityCandidate(keyword, cityCandidates)

    if (!city?.cityCode) {
      throw new Error(`未找到天气城市: ${keyword}`)
    }

    const nowConfig = getWeatherRequestConfig('now', city.cityCode)
    const indexConfig = getWeatherRequestConfig('index', city.cityCode)
    const [nowText, indexText] = await Promise.all([
      requestText(nowConfig.url, nowConfig.header),
      requestText(indexConfig.url, indexConfig.header)
    ])

    return normalizeChineseWeather({
      city,
      observation: parseWeatherObservationResponse(nowText),
      indexData: parseWeatherIndexResponse(indexText)
    })
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
      return wsManager.onEvent('state_changed', handler)
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

    status: wsConnectionStatus,

    /**
     * 关闭连接
     */
    close() {
      wsManager.close()
    }
  }
}
