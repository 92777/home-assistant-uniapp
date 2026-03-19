/**
 * Home Assistant 状态管理
 * 功能: 管理实体状态、房间-设备-实体目录与天气数据
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiService } from '../api/ha-api.js'
import {
  buildRoomTree,
  extractIndoorEnvironment,
  flattenRoomDevices,
  getDomainIcon,
  getDomainTone,
  getHumanEntityState,
  getQuickControlDevices,
  getRunningDeviceCards
} from '../utils/device-catalog.js'
import { formatTime, getEntityDomain } from '../utils/index.js'
import {
  buildDeviceHealth,
  buildExecutionCenter,
  buildTrendCard,
  classifyNotification,
  getIndoorTrendTargets
} from '../utils/insights.js'
import { createDefaultWeather } from '../utils/weather.js'

const DEFAULT_WEATHER_CITY = '兰州'
const GENERIC_LOCATION_PATTERN = /^(我的家|我家|家|home|my home)$/i
const CONTROL_CONFIRM_TIMEOUT = 9000
const TREND_HISTORY_HOURS = 24
const MAX_NOTIFICATION_ITEMS = 30
const NOTIFIABLE_DOMAINS = new Set([
  'light',
  'switch',
  'fan',
  'climate',
  'cover',
  'lock',
  'media_player',
  'binary_sensor'
])

function getEntitiesByDomain(entitiesMap, domain) {
  const result = []

  entitiesMap.forEach((entity, entityId) => {
    if (entityId.startsWith(`${domain}.`)) {
      result.push({
        entityId,
        ...entity
      })
    }
  })

  return result
}

function uniqueKeywords(list = []) {
  return [...new Set(list.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))]
}

export const useHAStore = defineStore('homeAssistant', () => {
  const isConnected = ref(false)
  const config = ref(null)
  const websocketEnabled = ref(false)
  const entities = ref(new Map())
  const registry = ref({
    areas: [],
    devices: [],
    entities: []
  })
  const scenes = ref([])
  const scripts = ref([])
  const userInfo = ref(null)
  const weather = ref(createDefaultWeather())
  const weatherLoading = ref(false)
  const registryLoading = ref(false)
  const notifications = ref([])
  const pendingControls = ref(new Map())
  const trendCards = ref([])
  const trendLoading = ref(false)
  const actionExecutions = ref(new Map())
  const pendingActions = ref(new Map())
  let unsubscribeStateChanged = null

  const lights = computed(() => getEntitiesByDomain(entities.value, 'light'))
  const switches = computed(() => getEntitiesByDomain(entities.value, 'switch'))
  const sensors = computed(() => getEntitiesByDomain(entities.value, 'sensor'))

  const rooms = computed(() => buildRoomTree(entities.value, registry.value))
  const devices = computed(() => flattenRoomDevices(rooms.value))
  const runningDevices = computed(() => getRunningDeviceCards(rooms.value))
  const quickControlDevices = computed(() => getQuickControlDevices(rooms.value))
  const indoorClimate = computed(() => extractIndoorEnvironment(rooms.value, entities.value))
  const unreadNotificationCount = computed(() => notifications.value.filter((item) => !item.read).length)
  const alertHighlights = computed(() => {
    return notifications.value.filter((item) => ['critical', 'high'].includes(item.priority)).slice(0, 3)
  })
  const deviceHealth = computed(() => buildDeviceHealth(rooms.value))
  const executionCenter = computed(() => buildExecutionCenter(rooms.value, entities.value))

  function formatClockLabel(date = Date.now()) {
    return formatTime(date, 'HH:mm')
  }

  function formatHistorySince(hours = TREND_HISTORY_HOURS) {
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  }

  function setActionPending(actionId, payload = null) {
    const nextMap = new Map(pendingActions.value)

    if (payload) {
      nextMap.set(actionId, payload)
    } else {
      nextMap.delete(actionId)
    }

    pendingActions.value = nextMap
  }

  function isActionPending(actionId) {
    return pendingActions.value.has(actionId)
  }

  function getActionExecution(actionId) {
    return actionExecutions.value.get(actionId) || null
  }

  function recordActionExecution(actionId, payload = {}) {
    const nextMap = new Map(actionExecutions.value)
    nextMap.set(actionId, {
      status: payload.status || 'success',
      message: payload.message || '',
      timeLabel: formatClockLabel(),
      timestamp: Date.now()
    })
    actionExecutions.value = nextMap
  }

  function findEntityContext(entityId) {
    for (const room of rooms.value) {
      for (const device of room.devices || []) {
        const entity = device.entities.find((item) => item.entity_id === entityId)

        if (entity) {
          return {
            room,
            device,
            entity
          }
        }
      }
    }

    return null
  }

  function shouldNotifyStateChange(entityId, oldState, newState) {
    if (!entityId || !oldState || !newState) {
      return false
    }

    if (oldState.state === newState.state) {
      return false
    }

    const domain = getEntityDomain(entityId)

    if (!NOTIFIABLE_DOMAINS.has(domain)) {
      return false
    }

    if (registry.value.entities.length > 0 && !findEntityContext(entityId)) {
      return false
    }

    return true
  }

  function pushNotification(notification) {
    const nextList = [...notifications.value]
    const latestItem = nextList[0]

    if (
      latestItem &&
      latestItem.entityId === notification.entityId &&
      notification.timestamp - latestItem.timestamp < 4000
    ) {
      nextList[0] = {
        ...latestItem,
        ...notification,
        id: latestItem.id
      }
      notifications.value = nextList.slice(0, MAX_NOTIFICATION_ITEMS)
      return
    }

    notifications.value = [notification, ...nextList].slice(0, MAX_NOTIFICATION_ITEMS)
  }

  function createStateNotification(entityId, oldState, newState) {
    if (!shouldNotifyStateChange(entityId, oldState, newState)) {
      return
    }

    const context = findEntityContext(entityId)
    const domain = getEntityDomain(entityId)
    const deviceClass = newState.attributes?.device_class || ''
    const entityName = context?.entity?.name || newState.attributes?.friendly_name || entityId
    const deviceName = context?.device?.name || entityName
    const roomName = context?.room?.name || '未分区'
    const stateLabel = getHumanEntityState({
      ...newState,
      domain,
      deviceClass
    })
    const detail = context?.entity && context.entity.name !== deviceName
      ? `${roomName} · ${context.entity.name} ${stateLabel}`
      : `${roomName} · ${stateLabel}`
    const noticeMeta = classifyNotification({
      entityId,
      deviceClass,
      newState: newState.state
    })

    pushNotification({
      id: `${Date.now()}-${entityId}`,
      entityId,
      deviceId: context?.device?.id || '',
      title: deviceName,
      description: detail,
      timeLabel: formatClockLabel(),
      timestamp: Date.now(),
      icon: context?.device?.icon || getDomainIcon(domain, { deviceClass }),
      tone: noticeMeta.priority === 'critical' || noticeMeta.priority === 'high'
        ? 'danger'
        : (context?.device?.tone || getDomainTone(domain)),
      priority: noticeMeta.priority,
      tag: noticeMeta.tag,
      read: false
    })
  }

  function markNotificationsRead() {
    notifications.value = notifications.value.map((item) => ({
      ...item,
      read: true
    }))
  }

  function clearNotifications() {
    notifications.value = []
  }

  function isEntityPending(entityId) {
    return pendingControls.value.has(entityId)
  }

  function getPendingControlLabel(entityId) {
    return pendingControls.value.get(entityId)?.label || '同步中...'
  }

  function buildControlPendingLabel(entity = {}, targetState = '') {
    const domain = getEntityDomain(entity.entity_id)

    if (domain === 'cover') {
      return targetState === 'closed' ? '关闭中...' : '打开中...'
    }

    if (domain === 'lock') {
      return targetState === 'locked' ? '上锁中...' : '解锁中...'
    }

    if (domain === 'media_player') {
      return '同步中...'
    }

    return ['off', 'closed'].includes(targetState) ? '关闭中...' : '开启中...'
  }

  function buildControlMatcher(entity = {}, targetState = '') {
    const domain = getEntityDomain(entity.entity_id)

    if (domain === 'light' || domain === 'switch' || domain === 'fan') {
      return (stateObject = {}) => stateObject.state === targetState
    }

    if (domain === 'climate') {
      return targetState === 'off'
        ? (stateObject = {}) => stateObject.state === 'off'
        : (stateObject = {}) => Boolean(stateObject.state) && !['off', 'unknown', 'unavailable'].includes(stateObject.state)
    }

    if (domain === 'cover') {
      return targetState === 'closed'
        ? (stateObject = {}) => ['closed', 'closing'].includes(stateObject.state)
        : (stateObject = {}) => ['open', 'opening'].includes(stateObject.state)
    }

    if (domain === 'lock') {
      return (stateObject = {}) => stateObject.state === targetState
    }

    if (domain === 'media_player') {
      return (stateObject = {}, previousState = null) => {
        return previousState ? stateObject.state !== previousState.state : Boolean(stateObject.state)
      }
    }

    return (stateObject = {}, previousState = null) => {
      return previousState ? stateObject.state !== previousState.state : Boolean(stateObject.state)
    }
  }

  function settlePendingControl(entityId, payload = {}) {
    const currentMap = pendingControls.value
    const entry = currentMap.get(entityId)

    if (!entry || entry.settled) {
      return false
    }

    entry.settled = true
    clearTimeout(entry.timeoutId)

    const nextMap = new Map(currentMap)
    nextMap.delete(entityId)
    pendingControls.value = nextMap

    if (payload.error) {
      entry.reject(payload.error)
      return true
    }

    entry.resolve(payload.state || null)
    return true
  }

  function queuePendingControl(entity, targetState) {
    if (isEntityPending(entity.entity_id)) {
      return Promise.reject(new Error('设备状态同步中，请稍候'))
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        settlePendingControl(entity.entity_id, {
          error: new Error('等待设备状态确认超时')
        })
      }, CONTROL_CONFIRM_TIMEOUT)

      const nextMap = new Map(pendingControls.value)
      nextMap.set(entity.entity_id, {
        entityId: entity.entity_id,
        label: buildControlPendingLabel(entity, targetState),
        matcher: buildControlMatcher(entity, targetState),
        timeoutId,
        resolve,
        reject,
        settled: false
      })
      pendingControls.value = nextMap
    })
  }

  async function runControlledAction(entity, targetState, executor) {
    if (!entity?.entity_id) {
      throw new Error('实体不存在')
    }

    if (isEntityPending(entity.entity_id)) {
      throw new Error('设备状态同步中，请稍候')
    }

    const waitForConfirmation = websocketEnabled.value ? queuePendingControl(entity, targetState) : null

    try {
      await executor()

      if (waitForConfirmation) {
        await waitForConfirmation
        return true
      }

      await loadAllStates()
      return true
    } catch (error) {
      if (waitForConfirmation) {
        try {
          await loadAllStates()
          const latestEntity = getEntity(entity.entity_id)
          const pendingEntry = pendingControls.value.get(entity.entity_id)

          if (pendingEntry?.matcher(latestEntity, entity)) {
            settlePendingControl(entity.entity_id, {
              state: latestEntity
            })
            return true
          }
        } catch (syncError) {
          console.warn('控制失败后回读状态失败:', syncError)
        }

        settlePendingControl(entity.entity_id, {
          error
        })
      }

      throw error
    }
  }

  async function initConnection(url, token) {
    try {
      const initResult = await apiService.init(url, token)

      isConnected.value = true
      websocketEnabled.value = Boolean(initResult?.websocketEnabled)
      config.value = await apiService.getConfig()
      await loadAllStates()
      await loadRegistrySnapshot().catch((error) => {
        console.error('加载设备注册表失败:', error)
      })

      loadWeather().catch((error) => {
        console.warn('加载天气失败，已使用默认天气展示:', error)
      })

      if (websocketEnabled.value) {
        if (typeof unsubscribeStateChanged === 'function') {
          unsubscribeStateChanged()
        }

        unsubscribeStateChanged = apiService.ws.onStateChanged((event) => {
          const eventData = event?.data || {}

          updateEntityState(eventData.entity_id, eventData.new_state, {
            oldState: eventData.old_state,
            notify: true
          })
        })
      } else if (typeof unsubscribeStateChanged === 'function') {
        unsubscribeStateChanged()
        unsubscribeStateChanged = null
      }

      return true
    } catch (error) {
      console.error('初始化连接失败:', error)
      isConnected.value = false
      throw error
    }
  }

  function loadConfig() {
    return apiService.loadConfig()
  }

  async function loginWithPassword(url, username, password) {
    try {
      const result = await apiService.loginWithPassword(url, username, password)

      if (result.requireMFA) {
        return {
          requireMFA: true,
          mfaType: result.mfaType,
          flowId: result.flowId
        }
      }

      await initConnection(url, result.token)

      return {
        requireMFA: false
      }
    } catch (error) {
      console.error('账号密码登录失败:', error)
      throw error
    }
  }

  async function loginWithMFA(url, flowId, code) {
    try {
      const result = await apiService.loginWithMFA(url, flowId, code)
      await initConnection(url, result.token)
      return true
    } catch (error) {
      console.error('MFA 验证失败:', error)
      throw error
    }
  }

  async function loadAllStates() {
    try {
      const states = await apiService.getStates()
      const nextEntities = new Map()

      states.forEach((state) => {
        nextEntities.set(state.entity_id, state)
      })

      entities.value = nextEntities
      scenes.value = states.filter((state) => state.entity_id.startsWith('scene.'))
      scripts.value = states.filter((state) => state.entity_id.startsWith('script.'))

      console.log(`已加载 ${states.length} 个实体状态`)
      return states
    } catch (error) {
      console.error('加载实体状态失败:', error)
      throw error
    }
  }

  async function loadRegistrySnapshot() {
    registryLoading.value = true

    try {
      const snapshot = await apiService.getRegistrySnapshot()
      registry.value = snapshot
      return snapshot
    } finally {
      registryLoading.value = false
    }
  }

  function resolveWeatherKeywords(customKeyword = '') {
    const savedCity = uni.getStorageSync('weather_city_keyword')
    const configCity = config.value?.city || ''
    const locationName = config.value?.location_name || ''

    return uniqueKeywords([
      customKeyword,
      savedCity,
      configCity,
      GENERIC_LOCATION_PATTERN.test(locationName) ? '' : locationName,
      DEFAULT_WEATHER_CITY
    ])
  }

  async function loadWeather(customKeyword = '') {
    weatherLoading.value = true
    let lastError = null
    const fallbackKeyword = resolveWeatherKeywords(customKeyword)[0] || DEFAULT_WEATHER_CITY

    try {
      for (const keyword of resolveWeatherKeywords(customKeyword)) {
        try {
          const weatherData = await apiService.getChineseWeather(keyword)
          weather.value = weatherData
          uni.setStorageSync('weather_city_keyword', weatherData.cityName || keyword)
          return weatherData
        } catch (error) {
          lastError = error
        }
      }

      if (lastError) {
        console.warn('天气接口暂时不可用，已回退到默认天气展示:', lastError.message || lastError)
      }

      weather.value = {
        ...createDefaultWeather(),
        cityName: fallbackKeyword || DEFAULT_WEATHER_CITY
      }

      return weather.value
    } finally {
      weatherLoading.value = false
    }
  }

  async function loadIndoorTrends() {
    const targets = getIndoorTrendTargets(rooms.value, entities.value)

    if (targets.length === 0) {
      trendCards.value = []
      return []
    }

    trendLoading.value = true

    try {
      const since = formatHistorySince()
      const histories = await Promise.all(
        targets.map((target) => apiService.getHistory(target.entityId, since, {
          minimalResponse: true
        }).catch(() => []))
      )

      const nextCards = targets.map((target, index) => buildTrendCard(target, histories[index]))
      trendCards.value = nextCards.filter((card) => card.bars.length > 0)
      return trendCards.value
    } finally {
      trendLoading.value = false
    }
  }

  async function executeDashboardAction(action) {
    if (!action?.id || !action.domain || !action.service) {
      throw new Error('动作配置不完整')
    }

    if (isActionPending(action.id)) {
      throw new Error('动作执行中，请稍候')
    }

    setActionPending(action.id, {
      title: action.title,
      startedAt: Date.now()
    })

    try {
      await apiService.callService(action.domain, action.service, action.data || {})
      recordActionExecution(action.id, {
        status: 'success',
        message: `${action.title}已执行`
      })

      if (!websocketEnabled.value) {
        await loadAllStates()
      }

      return true
    } catch (error) {
      recordActionExecution(action.id, {
        status: 'error',
        message: error.message || '执行失败'
      })
      throw error
    } finally {
      setActionPending(action.id, null)
    }
  }

  function updateEntityState(entityId, newState, options = {}) {
    if (!entityId) {
      return
    }

    const previousState = options.oldState || entities.value.get(entityId) || null
    const nextEntities = new Map(entities.value)

    if (newState) {
      nextEntities.set(entityId, newState)
    } else {
      nextEntities.delete(entityId)
    }

    entities.value = nextEntities

    if (newState && isEntityPending(entityId)) {
      const pendingEntry = pendingControls.value.get(entityId)

      if (pendingEntry?.matcher(newState, previousState)) {
        settlePendingControl(entityId, {
          state: newState
        })
      }
    }

    if (options.notify && newState) {
      createStateNotification(entityId, previousState, newState)
    }
  }

  function getEntity(entityId) {
    return entities.value.get(entityId)
  }

  async function controlLight(entityId, params) {
    const entity = getEntity(entityId)

    if (!entity) {
      throw new Error('灯光实体不存在')
    }

    const targetState = params?.state || 'on'

    return runControlledAction(entity, targetState, async () => {
      if (targetState === 'on') {
        const payload = {
          entity_id: entityId
        }

        if (typeof params?.brightness === 'number') {
          payload.brightness = params.brightness
        }

        await apiService.callService('light', 'turn_on', payload)
        return
      }

      await apiService.callService('light', 'turn_off', { entity_id: entityId })
    })
  }

  async function controlSwitch(entityId, state) {
    const entity = getEntity(entityId)

    if (!entity) {
      throw new Error('开关实体不存在')
    }

    const targetState = state === 'off' ? 'off' : 'on'

    return runControlledAction(entity, targetState, async () => {
      const service = targetState === 'on' ? 'turn_on' : 'turn_off'
      await apiService.callService('switch', service, { entity_id: entityId })
    })
  }

  async function controlEntity(entityOrId, nextState = '') {
    const entity = typeof entityOrId === 'string' ? getEntity(entityOrId) : entityOrId

    if (!entity?.entity_id) {
      throw new Error('实体不存在')
    }

    const domain = entity.entity_id.split('.')[0]

    if (domain === 'light') {
      return controlLight(entity.entity_id, {
        state: nextState || (entity.state === 'on' ? 'off' : 'on')
      })
    }

    if (domain === 'switch' || domain === 'fan' || domain === 'climate') {
      const isActive = domain === 'climate' ? entity.state !== 'off' : entity.state === 'on'
      const targetState = nextState || (isActive ? 'off' : 'on')

      return runControlledAction(entity, targetState, async () => {
        const service = targetState === 'on' ? 'turn_on' : 'turn_off'
        await apiService.callService(domain, service, { entity_id: entity.entity_id })
      })
    }

    if (domain === 'cover') {
      const targetState = ['open', 'opening'].includes(entity.state) ? 'closed' : 'open'

      return runControlledAction(entity, targetState, async () => {
        const service = targetState === 'closed' ? 'close_cover' : 'open_cover'
        await apiService.callService('cover', service, { entity_id: entity.entity_id })
      })
    }

    if (domain === 'lock') {
      const targetState = entity.state === 'locked' ? 'unlocked' : 'locked'

      return runControlledAction(entity, targetState, async () => {
        const service = targetState === 'locked' ? 'lock' : 'unlock'
        await apiService.callService('lock', service, { entity_id: entity.entity_id })
      })
    }

    if (domain === 'media_player') {
      return runControlledAction(entity, 'toggle', async () => {
        await apiService.callService('media_player', 'media_play_pause', { entity_id: entity.entity_id })
      })
    }

    throw new Error(`暂不支持控制 ${domain}`)
  }

  async function executeScene(sceneId) {
    await apiService.callService('scene', 'turn_on', { entity_id: sceneId })
  }

  function getDevicesByRoom(roomId) {
    return devices.value.filter((device) => device.roomId === roomId)
  }

  function clearCache() {
    if (typeof unsubscribeStateChanged === 'function') {
      unsubscribeStateChanged()
      unsubscribeStateChanged = null
    }

    apiService.ws.close()
    entities.value = new Map()
    registry.value = {
      areas: [],
      devices: [],
      entities: []
    }
    scenes.value = []
    scripts.value = []
    config.value = null
    weather.value = createDefaultWeather()
    isConnected.value = false
    websocketEnabled.value = false
    notifications.value = []
    pendingControls.value = new Map()
    trendCards.value = []
    actionExecutions.value = new Map()
    pendingActions.value = new Map()
  }

  return {
    isConnected,
    config,
    websocketEnabled,
    entities,
    devices,
    rooms,
    scenes,
    scripts,
    userInfo,
    registry,
    registryLoading,
    weather,
    weatherLoading,
    indoorClimate,
    trendCards,
    trendLoading,
    actionExecutions,
    executionCenter,
    deviceHealth,
    alertHighlights,
    notifications,
    unreadNotificationCount,
    pendingControls,
    lights,
    switches,
    sensors,
    runningDevices,
    quickControlDevices,
    initConnection,
    loadConfig,
    loginWithPassword,
    loginWithMFA,
    loadAllStates,
    loadRegistrySnapshot,
    loadWeather,
    loadIndoorTrends,
    updateEntityState,
    getEntity,
    isEntityPending,
    getPendingControlLabel,
    isActionPending,
    getActionExecution,
    markNotificationsRead,
    clearNotifications,
    controlLight,
    controlSwitch,
    controlEntity,
    executeScene,
    executeDashboardAction,
    getDevicesByRoom,
    clearCache
  }
})
