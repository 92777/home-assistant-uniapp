/**
 * Home Assistant 状态管理
 * 功能: 管理实体状态、设备、房间等数据缓存
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '../api/ha-api.js'

export const useHAStore = defineStore('homeAssistant', () => {
  /**
   * 状态定义
   */
  
  // 连接状态
  const isConnected = ref(false)
  const config = ref(null)
  
  // 实体状态缓存
  const entities = ref(new Map())
  
  // 设备列表 (按房间分组)
  const devices = ref([])
  
  // 房间列表
  const rooms = ref([])
  
  // 场景列表
  const scenes = ref([])
  
  // 用户信息
  const userInfo = ref(null)
  
  /**
   * 计算属性
   */
  
  /**
   * 获取所有灯光实体
   */
  const lights = computed(() => {
    const lightEntities = []
    entities.value.forEach((entity, entityId) => {
      if (entityId.startsWith('light.')) {
        lightEntities.push({
          entityId,
          ...entity
        })
      }
    })
    return lightEntities
  })
  
  /**
   * 获取所有开关实体
   */
  const switches = computed(() => {
    const switchEntities = []
    entities.value.forEach((entity, entityId) => {
      if (entityId.startsWith('switch.')) {
        switchEntities.push({
          entityId,
          ...entity
        })
      }
    })
    return switchEntities
  })
  
  /**
   * 获取所有传感器实体
   */
  const sensors = computed(() => {
    const sensorEntities = []
    entities.value.forEach((entity, entityId) => {
      if (entityId.startsWith('sensor.')) {
        sensorEntities.push({
          entityId,
          ...entity
        })
      }
    })
    return sensorEntities
  })
  
  /**
   * 获取正在运行的设备
   */
  const runningDevices = computed(() => {
    const running = []
    entities.value.forEach((entity, entityId) => {
      if (entity.state === 'on' || entity.state === 'running') {
        running.push({
          entityId,
          ...entity
        })
      }
    })
    return running
  })
  
  /**
   * 方法
   */
  
  /**
   * 初始化连接
   * @param {string} url - Home Assistant URL
   * @param {string} token - Access Token
   */
  async function initConnection(url, token) {
    try {
      await apiService.init(url, token)
      isConnected.value = true
      
      // 加载配置
      config.value = await apiService.getConfig()
      
      // 加载所有实体状态
      await loadAllStates()
      
      // 注册状态变化监听
      apiService.ws.onStateChanged((event) => {
        updateEntityState(event.data.entity_id, event.data.new_state)
      })
      
      return true
    } catch (error) {
      console.error('初始化连接失败:', error)
      isConnected.value = false
      throw error
    }
  }
  
  /**
   * 加载保存的配置
   * @returns {boolean} 是否有保存的配置
   */
  function loadConfig() {
    return apiService.loadConfig()
  }
  
  /**
   * 账号密码登录
   * @param {string} url - Home Assistant URL
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {object} 登录结果
   */
  async function loginWithPassword(url, username, password) {
    try {
      const result = await apiService.loginWithPassword(url, username, password)
      
      // 如果需要 MFA，返回 MFA 信息
      if (result.requireMFA) {
        return {
          requireMFA: true,
          mfaType: result.mfaType,
          flowId: result.flowId
        }
      }
      
      // 登录成功，初始化连接
      await initConnection(url, result.token)
      
      return {
        requireMFA: false
      }
    } catch (error) {
      console.error('账号密码登录失败:', error)
      throw error
    }
  }
  
  /**
   * MFA 验证
   * @param {string} url - Home Assistant URL
   * @param {string} flowId - 认证流程 ID
   * @param {string} code - 验证码
   */
  async function loginWithMFA(url, flowId, code) {
    try {
      const result = await apiService.loginWithMFA(url, flowId, code)
      
      // 登录成功，初始化连接
      await initConnection(url, result.token)
      
      return true
    } catch (error) {
      console.error('MFA 验证失败:', error)
      throw error
    }
  }
  
  /**
   * 加载所有实体状态
   */
  async function loadAllStates() {
    try {
      const states = await apiService.getStates()
      
      // 清空现有缓存
      entities.value.clear()
      
      // 缓存所有实体状态
      states.forEach(state => {
        entities.value.set(state.entity_id, state)
      })
      
      console.log(`已加载 ${states.length} 个实体状态`)
    } catch (error) {
      console.error('加载实体状态失败:', error)
      throw error
    }
  }
  
  /**
   * 更新实体状态
   * @param {string} entityId - 实体 ID
   * @param {object} newState - 新状态
   */
  function updateEntityState(entityId, newState) {
    // Vue 3 对 Map 的响应式更新需要重新赋值
    const newEntities = new Map(entities.value)
    newEntities.set(entityId, newState)
    entities.value = newEntities
    console.log(`实体 ${entityId} 状态已更新:`, newState.state)
  }
  
  /**
   * 获取实体状态
   * @param {string} entityId - 实体 ID
   * @returns {object|null} 实体状态
   */
  function getEntity(entityId) {
    return entities.value.get(entityId)
  }
  
  /**
   * 控制灯光
   * @param {string} entityId - 灯光实体 ID
   * @param {object} params - 控制参数
   */
  async function controlLight(entityId, params) {
    try {
      const data = {
        entity_id: entityId,
        ...params
      }
      
      if (params.state === 'on') {
        await apiService.callService('light', 'turn_on', data)
      } else if (params.state === 'off') {
        await apiService.callService('light', 'turn_off', { entity_id: entityId })
      }
    } catch (error) {
      console.error('控制灯光失败:', error)
      throw error
    }
  }
  
  /**
   * 控制开关
   * @param {string} entityId - 开关实体 ID
   * @param {string} state - 状态 ('on' 或 'off')
   */
  async function controlSwitch(entityId, state) {
    try {
      const service = state === 'on' ? 'turn_on' : 'turn_off'
      await apiService.callService('switch', service, { entity_id: entityId })
    } catch (error) {
      console.error('控制开关失败:', error)
      throw error
    }
  }
  
  /**
   * 执行场景
   * @param {string} sceneId - 场景 ID
   */
  async function executeScene(sceneId) {
    try {
      await apiService.callService('scene', 'turn_on', { entity_id: sceneId })
    } catch (error) {
      console.error('执行场景失败:', error)
      throw error
    }
  }
  
  /**
   * 按房间获取设备
   * @param {string} roomId - 房间 ID
   * @returns {array} 设备列表
   */
  function getDevicesByRoom(roomId) {
    return devices.value.filter(device => device.roomId === roomId)
  }
  
  /**
   * 清空缓存
   */
  function clearCache() {
    entities.value.clear()
    devices.value = []
    rooms.value = []
    scenes.value = []
    config.value = null
    isConnected.value = false
  }
  
  return {
    // 状态
    isConnected,
    config,
    entities,
    devices,
    rooms,
    scenes,
    userInfo,
    
    // 计算属性
    lights,
    switches,
    sensors,
    runningDevices,
    
    // 方法
    initConnection,
    loadConfig,
    loginWithPassword,
    loginWithMFA,
    loadAllStates,
    updateEntityState,
    getEntity,
    controlLight,
    controlSwitch,
    executeScene,
    getDevicesByRoom,
    clearCache
  }
})
