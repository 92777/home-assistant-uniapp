/**
 * 设备目录与展示模型构建
 */
import { getEntityDomain, getEntityStateText, isEntityOperable } from './index.js'

const USER_FACING_DOMAINS = new Set([
  'light',
  'switch',
  'climate',
  'cover',
  'lock',
  'fan',
  'media_player',
  'sensor',
  'binary_sensor'
])

const PRIMARY_DOMAIN_PRIORITY = {
  cover: 1,
  climate: 2,
  fan: 3,
  light: 4,
  switch: 5,
  media_player: 6,
  lock: 7,
  sensor: 8,
  binary_sensor: 9
}

const ROOM_PRIORITY = {
  玄关: 1,
  客厅: 2,
  餐厅: 3,
  厨房: 4,
  主卧: 5,
  次卧: 6,
  卧室: 7,
  书房: 8,
  卫生间: 9,
  阳台: 10,
  未分区: 99
}

const SENSOR_DEVICE_CLASSES = new Set([
  'temperature',
  'humidity',
  'pm25',
  'pm10',
  'aqi',
  'battery',
  'illuminance',
  'power',
  'energy',
  'carbon_dioxide',
  'carbon_monoxide',
  'current',
  'voltage',
  'moisture'
])

const BINARY_SENSOR_DEVICE_CLASSES = new Set([
  'door',
  'garage_door',
  'lock',
  'motion',
  'occupancy',
  'opening',
  'presence',
  'smoke',
  'window'
])

const HIDDEN_KEYWORD_PATTERN = /\*|调试|配对|蓝牙无线开关|自检|标签信息|工厂编码|流水号|运行模式切换|切换manual|I2C|MCU|同步手动|重置滤芯|开始自检|终止自检|校准|缓开|行程点位|最爱挡适用面积|通用属性|生产时间|工厂编码|物理控制锁|提示音|电机反向|手动拉窗帘使能|已配对的蓝牙/

const SENSOR_HINT_PATTERN = /温度|湿度|PM2\.5|PM10|空气质量|甲醛|光照|电量|功率|能耗|故障|亮度|位置|风速/

const BINARY_SENSOR_HINT_PATTERN = /门|窗|人体|移动|烟雾|占用|在位|告警/

const SYSTEM_PLATFORM_SET = new Set([
  'backup',
  'sun',
  'hassio',
  'rpi_power',
  'systemmonitor'
])

const SYSTEM_TEXT_PATTERN = /backup|home assistant|hassio|自动备份|备份管理器|scheduled automatic backup|successful automatic backup|attempted automatic backup/i
const CURTAIN_PATTERN = /窗帘|纱帘|遮光帘/
const FRIDGE_PATTERN = /冰箱|冷柜/
const CLIMATE_ACTIVITY_SKIP_PATTERN = /冰箱|冷柜|冷藏|冷冻|储藏|flexzone|storage|freezing|zone/i
const SWITCH_ACTIVITY_SKIP_PATTERN = /延时|提醒|联动|手势|自动|屏幕|亮度|反向|manual|手动|滤芯|提示音|童锁|锁定|anion|uv|alarm|校准|清洁|待机|休眠|screen|gesture|auto/i
const DEVICE_ACTIVITY_SWITCH_SKIP_PATTERN = /净烟机|油烟机|烟机|冰箱|中控屏|窗帘|纱帘|遮光帘/i
const SWITCH_ACTIVITY_ALLOW_PATTERN = /电源|主开关|照明|灯|插座|power|switch/i
const SUMMARY_SKIP_PATTERN = /故障|错误|连通性|提示音|童锁|电机反向|手动拉窗帘使能|配对|校准|缓开|音量|亮度|屏幕|灵敏度|时间|数量|标签|工厂|SN|流水号|唤醒|闹钟|播放文本|执行文本指令|模式切换|同步/
const NORMAL_STATUS_VALUE_PATTERN = /^(0|null|none|normal|正常|无故障|off|false|idle|no faults?)$/i

export const DOMAIN_ICON_MAP = {
  light: 'icon-lightbulb',
  switch: 'icon-toggle-on',
  climate: 'icon-snowflake',
  cover: 'icon-curtain',
  lock: 'icon-lock',
  fan: 'icon-fan',
  media_player: 'icon-tv',
  sensor: 'icon-thermometer',
  binary_sensor: 'icon-motion-sensor'
}

export function normalizeAreaName(areaName = '') {
  const trimmedName = String(areaName || '').replace(/\s+/g, ' ').trim()

  if (!trimmedName) {
    return '未分区'
  }

  const segments = trimmedName.split(' ')

  if (segments.length > 1 && /[\u4e00-\u9fa5]/.test(trimmedName)) {
    return segments[segments.length - 1]
  }

  return trimmedName
}

export function getRoomIcon(areaName = '') {
  const shortName = normalizeAreaName(areaName)

  if (/玄关|门厅/.test(shortName)) {
    return 'icon-compass'
  }

  if (/客厅|餐厅/.test(shortName)) {
    return 'icon-couch'
  }

  if (/厨房/.test(shortName)) {
    return 'icon-mug-saucer'
  }

  if (/卧|主卧|次卧/.test(shortName)) {
    return 'icon-bed'
  }

  if (/书房/.test(shortName)) {
    return 'icon-book-open'
  }

  if (/卫生间/.test(shortName)) {
    return 'icon-droplet'
  }

  return 'icon-house-circle'
}

export function getDomainIcon(domain = '', entity = null) {
  if (domain === 'sensor' && entity?.deviceClass === 'humidity') {
    return 'icon-droplet'
  }

  if (domain === 'sensor' && entity?.deviceClass === 'pm25') {
    return 'icon-smog'
  }

  if (domain === 'sensor' && entity?.deviceClass === 'illuminance') {
    return 'icon-sun'
  }

  return DOMAIN_ICON_MAP[domain] || 'icon-microchip'
}

export function getDomainTone(domain = '') {
  if (domain === 'climate' || domain === 'fan') {
    return 'cool'
  }

  if (domain === 'cover') {
    return 'accent'
  }

  if (domain === 'lock') {
    return 'safe'
  }

  return ''
}

export function isEntityRunning(entity = {}) {
  const state = entity.state
  const domain = entity.domain || getEntityDomain(entity.entity_id)

  if (domain === 'cover') {
    return ['open', 'opening', 'closing'].includes(state)
  }

  if (domain === 'media_player') {
    return ['playing', 'on'].includes(state)
  }

  if (domain === 'lock') {
    return state === 'unlocked'
  }

  return ['on', 'running', 'cool', 'heat', 'fan_only', 'dry'].includes(state)
}

function normalizeLabel(source = '', deviceName = '') {
  let value = String(source || '')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\*+\s*/, '')
    .trim()

  if (!value) {
    return ''
  }

  if (deviceName && value.startsWith(deviceName)) {
    value = value.slice(deviceName.length).trim()
  }

  const prefixes = [
    '环境参数',
    '空气净化器',
    '窗帘电机',
    '显示屏',
    '光照度传感器',
    '滤芯',
    '空净最爱模式配置',
    '其他',
    '提示音',
    '物理控制锁（童锁）',
    '物理控制锁',
    '自检服务',
    '本地蓝牙无线开关'
  ]

  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) {
      value = value.slice(prefix.length).trim()
    }
  }

  return value || source
}

function getStateName(stateObject = {}) {
  return String(
    stateObject.attributes?.friendly_name ||
    stateObject.entity_id ||
    ''
  )
}

function isUsefulSensor(entityRegistry = {}, stateObject = {}) {
  const deviceClass = stateObject.attributes?.device_class || ''
  const rawName = `${entityRegistry.original_name || ''} ${getStateName(stateObject)}`

  if (HIDDEN_KEYWORD_PATTERN.test(rawName)) {
    return false
  }

  if (SENSOR_DEVICE_CLASSES.has(deviceClass)) {
    return true
  }

  return SENSOR_HINT_PATTERN.test(rawName)
}

function isUsefulBinarySensor(entityRegistry = {}, stateObject = {}) {
  const deviceClass = stateObject.attributes?.device_class || ''
  const rawName = `${entityRegistry.original_name || ''} ${getStateName(stateObject)}`

  if (BINARY_SENSOR_DEVICE_CLASSES.has(deviceClass)) {
    return true
  }

  return BINARY_SENSOR_HINT_PATTERN.test(rawName)
}

function isDisplayEntity(entityRegistry = {}, stateObject = null) {
  if (!stateObject?.entity_id) {
    return false
  }

  if (entityRegistry.disabled_by || entityRegistry.hidden_by) {
    return false
  }

  if (entityRegistry.entity_category === 'diagnostic') {
    return false
  }

  if (SYSTEM_PLATFORM_SET.has(entityRegistry.platform)) {
    return false
  }

  const domain = getEntityDomain(stateObject.entity_id)

  if (!USER_FACING_DOMAINS.has(domain)) {
    return false
  }

  const searchableText = `${entityRegistry.original_name || ''} ${entityRegistry.name || ''} ${getStateName(stateObject)}`

  if (SYSTEM_TEXT_PATTERN.test(`${entityRegistry.entity_id} ${searchableText}`)) {
    return false
  }

  if (domain === 'sensor') {
    return isUsefulSensor(entityRegistry, stateObject)
  }

  if (domain === 'binary_sensor') {
    return isUsefulBinarySensor(entityRegistry, stateObject)
  }

  return !HIDDEN_KEYWORD_PATTERN.test(searchableText)
}

function sortEntities(left = {}, right = {}) {
  const leftPriority = PRIMARY_DOMAIN_PRIORITY[left.domain] || 99
  const rightPriority = PRIMARY_DOMAIN_PRIORITY[right.domain] || 99

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority
  }

  const leftName = left.name || ''
  const rightName = right.name || ''

  return leftName.localeCompare(rightName, 'zh-Hans-CN')
}

function getBinarySensorState(entity = {}) {
  const activeMap = {
    motion: '检测到移动',
    presence: '检测到在位',
    occupancy: '有人在场',
    door: '当前开启',
    window: '当前开启',
    opening: '当前开启',
    smoke: '烟雾告警'
  }

  const inactiveMap = {
    motion: '当前静止',
    presence: '无人',
    occupancy: '无人',
    door: '当前关闭',
    window: '当前关闭',
    opening: '当前关闭',
    smoke: '未触发告警'
  }

  const deviceClass = entity.deviceClass || ''

  return entity.state === 'on'
    ? (activeMap[deviceClass] || '已触发')
    : (inactiveMap[deviceClass] || '状态正常')
}

export function getHumanEntityState(entity = {}) {
  const domain = entity.domain || getEntityDomain(entity.entity_id)

  if (domain === 'fan') {
    return entity.state === 'on' ? '净化中' : '已关闭'
  }

  if (domain === 'cover') {
    const position = entity.attributes?.current_position

    if (typeof position === 'number') {
      return `开合 ${position}%`
    }

    return entity.state === 'open' ? '已开启' : '已关闭'
  }

  if (domain === 'media_player') {
    return entity.state === 'playing' ? '播放中' : (entity.state === 'on' ? '待机中' : '已暂停')
  }

  if (domain === 'lock') {
    return entity.state === 'locked' ? '已上锁' : '未上锁'
  }

  if (domain === 'binary_sensor') {
    return getBinarySensorState(entity)
  }

  return getEntityStateText(entity)
}

function isMeaningfulRunningEntity(entity = {}, device = {}) {
  if (!entity?.isRunning) {
    return false
  }

  const domain = entity.domain || getEntityDomain(entity.entity_id)
  const deviceName = device.name || ''
  const nameText = `${deviceName} ${entity.name || ''}`

  if (domain === 'cover' || CURTAIN_PATTERN.test(nameText)) {
    return false
  }

  if (domain === 'sensor' || domain === 'binary_sensor' || domain === 'lock') {
    return false
  }

  if (domain === 'fan' || domain === 'light' || domain === 'media_player') {
    return true
  }

  if (domain === 'climate') {
    return !CLIMATE_ACTIVITY_SKIP_PATTERN.test(nameText)
  }

  if (domain === 'switch') {
    if (DEVICE_ACTIVITY_SWITCH_SKIP_PATTERN.test(deviceName) || SWITCH_ACTIVITY_SKIP_PATTERN.test(nameText)) {
      return false
    }

    return SWITCH_ACTIVITY_ALLOW_PATTERN.test(entity.name || '')
  }

  return false
}

function getMeaningfulRunningEntities(device = {}) {
  return (device.entities || []).filter((entity) => isMeaningfulRunningEntity(entity, device))
}

function simplifyMetricLabel(name = '') {
  const value = String(name || '')

  if (/冷藏/.test(value)) {
    return '冷藏'
  }

  if (/冷冻/.test(value)) {
    return '冷冻'
  }

  if (/左变温/.test(value)) {
    return '左变温'
  }

  if (/右变温/.test(value)) {
    return '右变温'
  }

  if (/温度/.test(value)) {
    return '温度'
  }

  if (/湿度/.test(value)) {
    return '湿度'
  }

  if (/PM2\.5/i.test(value)) {
    return 'PM2.5'
  }

  if (/功率/.test(value)) {
    return '功率'
  }

  if (/电量/.test(value)) {
    return '电量'
  }

  return value.slice(0, 4)
}

function formatEntityMetric(entity = {}) {
  const unit = entity.unit || ''
  const value = `${entity.state}${unit}`
  return `${simplifyMetricLabel(entity.name)} ${value}`.trim()
}

function isMeaningfulSummaryEntity(entity = {}, deviceName = '') {
  const domain = entity.domain || getEntityDomain(entity.entity_id)
  const nameText = `${deviceName} ${entity.name || ''}`
  const stateText = String(entity.state || '').trim()

  if (!stateText || ['unknown', 'unavailable'].includes(stateText.toLowerCase())) {
    return false
  }

  if (SUMMARY_SKIP_PATTERN.test(nameText)) {
    return false
  }

  if (/故障|错误/.test(nameText) && NORMAL_STATUS_VALUE_PATTERN.test(stateText)) {
    return false
  }

  if (domain === 'binary_sensor' && entity.deviceClass === 'connectivity') {
    return false
  }

  if (domain === 'switch') {
    return !SWITCH_ACTIVITY_SKIP_PATTERN.test(nameText)
  }

  return true
}

function getFridgeSummary(entityList = []) {
  const preferredSensors = entityList.filter((entity) => {
    return entity.domain === 'sensor' &&
      entity.deviceClass === 'temperature' &&
      /实际温度|冷藏温度|冷冻温度|变温实际温度/.test(entity.name)
  })

  if (preferredSensors.length === 0) {
    return ''
  }

  const priorityMap = [
    /冷藏实际温度|冷藏温度/,
    /冷冻实际温度|冷冻温度/,
    /左变温实际温度|左变温区温度/,
    /右变温实际温度|右变温区温度/
  ]

  const orderedSensors = [...preferredSensors].sort((left, right) => {
    const leftPriority = priorityMap.findIndex((pattern) => pattern.test(left.name))
    const rightPriority = priorityMap.findIndex((pattern) => pattern.test(right.name))
    return (leftPriority === -1 ? 99 : leftPriority) - (rightPriority === -1 ? 99 : rightPriority)
  })

  return orderedSensors.slice(0, 2).map(formatEntityMetric).join(' · ')
}

function getDeviceActivitySummary(activityEntities = []) {
  const lead = activityEntities[0]

  if (!lead) {
    return ''
  }

  if (lead.domain === 'fan') {
    return '运行中'
  }

  if (lead.domain === 'light') {
    return '已开启'
  }

  if (lead.domain === 'media_player') {
    return '播放中'
  }

  if (lead.domain === 'climate') {
    return '运行中'
  }

  if (lead.domain === 'switch') {
    return '已开启'
  }

  return lead.summary || '运行中'
}

const ENTITY_GROUP_META = {
  light: { key: 'light', title: '灯光', order: 1 },
  switch: { key: 'switch', title: '开关', order: 2 },
  fan: { key: 'fan', title: '风机', order: 3 },
  climate: { key: 'climate', title: '温控', order: 4 },
  cover: { key: 'cover', title: '窗帘', order: 5 },
  media_player: { key: 'media_player', title: '媒体', order: 6 },
  lock: { key: 'lock', title: '门锁', order: 7 },
  sensor: { key: 'sensor', title: '传感器', order: 8 },
  binary_sensor: { key: 'binary_sensor', title: '状态', order: 9 }
}

export function groupEntitiesByType(entityList = []) {
  const groups = new Map()

  entityList.forEach((entity) => {
    const domain = entity.domain || getEntityDomain(entity.entity_id)
    const meta = ENTITY_GROUP_META[domain] || {
      key: domain || 'other',
      title: '其他',
      order: 99
    }

    if (!groups.has(meta.key)) {
      groups.set(meta.key, {
        ...meta,
        entities: []
      })
    }

    groups.get(meta.key).entities.push(entity)
  })

  return Array.from(groups.values()).sort((left, right) => left.order - right.order)
}

function pickPrimaryEntity(entityList = []) {
  const sortedEntities = [...entityList].sort(sortEntities)

  return sortedEntities[0] || null
}

function getDeviceSummary(primaryEntity = null, entityList = [], deviceName = '') {
  if (!primaryEntity) {
    return '暂无状态'
  }

  if (FRIDGE_PATTERN.test(deviceName)) {
    const fridgeSummary = getFridgeSummary(entityList)

    if (fridgeSummary) {
      return fridgeSummary
    }
  }

  if (primaryEntity.domain === 'fan') {
    const airQuality = entityList.find((entity) => /空气质量/.test(entity.name))
    const pm25 = entityList.find((entity) => entity.deviceClass === 'pm25')

    if (airQuality?.state) {
      return `${primaryEntity.state === 'on' ? '运行中' : '待机中'} · ${airQuality.state}`
    }

    if (pm25?.state) {
      return `${primaryEntity.state === 'on' ? '运行中' : '待机中'} · PM2.5 ${pm25.state}`
    }
  }

  const meaningfulOperable = entityList.filter((entity) => {
    return entity.isOperable && isMeaningfulSummaryEntity(entity, deviceName)
  })

  if (meaningfulOperable.length > 1) {
    const activeCount = meaningfulOperable.filter((entity) => entity.isRunning).length

    if (activeCount > 1) {
      return `${activeCount} 项运行中`
    }
  }

  const summaryLead = meaningfulOperable[0]

  if (summaryLead) {
    return getHumanEntityState(summaryLead)
  }

  const metricEntities = entityList.filter((entity) => {
    return entity.domain === 'sensor' &&
      isMeaningfulSummaryEntity(entity, deviceName) &&
      ['temperature', 'humidity', 'pm25', 'power', 'energy', 'battery'].includes(entity.deviceClass)
  })

  if (metricEntities.length > 0) {
    return metricEntities.slice(0, 2).map(formatEntityMetric).join(' · ')
  }

  if (primaryEntity.domain === 'sensor') {
    const others = entityList
      .filter((entity) => entity.entity_id !== primaryEntity.entity_id)
      .slice(0, 1)
      .map((entity) => `${entity.name} ${entity.state}${entity.unit ? entity.unit : ''}`)

    const lead = `${primaryEntity.name} ${primaryEntity.state}${primaryEntity.unit ? primaryEntity.unit : ''}`

    return others.length > 0 ? `${lead} · ${others.join(' · ')}` : lead
  }

  return getHumanEntityState(primaryEntity)
}

function buildDisplayEntity(stateObject = {}, entityRegistry = {}, deviceName = '') {
  const domain = getEntityDomain(stateObject.entity_id)

  return {
    ...stateObject,
    domain,
    registry: entityRegistry,
    name: normalizeLabel(
      entityRegistry.name ||
      entityRegistry.original_name ||
      stateObject.attributes?.friendly_name ||
      stateObject.entity_id,
      deviceName
    ),
    deviceClass: stateObject.attributes?.device_class || '',
    unit: stateObject.attributes?.unit_of_measurement || '',
    isOperable: isEntityOperable(stateObject.entity_id),
    isRunning: isEntityRunning(stateObject),
    summary: getHumanEntityState({
      ...stateObject,
      domain,
      deviceClass: stateObject.attributes?.device_class || ''
    })
  }
}

function fallbackRoomName(entity = {}) {
  const text = `${entity.entity_id || ''} ${entity.attributes?.friendly_name || ''}`.toLowerCase()

  if (text.includes('客厅') || text.includes('living')) {
    return '客厅'
  }

  if (text.includes('卧室') || text.includes('主卧') || text.includes('bed')) {
    return '卧室'
  }

  if (text.includes('厨房') || text.includes('kitchen')) {
    return '厨房'
  }

  if (text.includes('玄关')) {
    return '玄关'
  }

  return '未分区'
}

function buildFallbackRoomTree(entitiesMap = new Map()) {
  const roomBuckets = new Map()

  Array.from(entitiesMap.values())
    .filter((stateObject) => {
      const domain = getEntityDomain(stateObject.entity_id)
      return USER_FACING_DOMAINS.has(domain) && !HIDDEN_KEYWORD_PATTERN.test(getStateName(stateObject))
    })
    .forEach((stateObject) => {
      const roomName = fallbackRoomName(stateObject)

      if (!roomBuckets.has(roomName)) {
        roomBuckets.set(roomName, {
          id: roomName,
          name: roomName,
          fullName: roomName,
          icon: getRoomIcon(roomName),
          devices: []
        })
      }

      const deviceName = stateObject.attributes?.friendly_name || stateObject.entity_id
      const displayEntity = buildDisplayEntity(stateObject, {}, deviceName)
      const primaryEntity = displayEntity
      const activityEntities = getMeaningfulRunningEntities({
        name: deviceName,
        entities: [displayEntity]
      })
      const entityGroups = groupEntitiesByType([displayEntity])

      roomBuckets.get(roomName).devices.push({
        id: stateObject.entity_id,
        name: deviceName,
        roomName,
        icon: getDomainIcon(displayEntity.domain, displayEntity),
        tone: getDomainTone(displayEntity.domain),
        entities: [displayEntity],
        entityGroups,
        primaryEntity,
        summary: getHumanEntityState(displayEntity),
        activitySummary: getDeviceActivitySummary(activityEntities),
        isActive: activityEntities.length > 0,
        activityEntities,
        entityCount: 1,
        isVirtual: true
      })
    })

  return Array.from(roomBuckets.values())
}

export function buildRoomTree(entitiesMap = new Map(), registry = {}) {
  const registryEntities = Array.isArray(registry.entities) ? registry.entities : []
  const registryAreas = Array.isArray(registry.areas) ? registry.areas : []
  const registryDevices = Array.isArray(registry.devices) ? registry.devices : []

  if (registryEntities.length === 0 || registryDevices.length === 0) {
    return buildFallbackRoomTree(entitiesMap)
  }

  const areaById = new Map(registryAreas.map((area) => [area.area_id, area]))
  const deviceById = new Map(registryDevices.map((device) => [device.id, device]))
  const roomBuckets = new Map()

  function resolveDeviceAreaId(deviceRecord) {
    if (!deviceRecord) {
      return ''
    }

    if (deviceRecord.area_id) {
      return deviceRecord.area_id
    }

    if (deviceRecord.via_device_id) {
      return resolveDeviceAreaId(deviceById.get(deviceRecord.via_device_id))
    }

    return ''
  }

  registryEntities.forEach((entityRegistry) => {
    const stateObject = entitiesMap.get(entityRegistry.entity_id)

    if (!isDisplayEntity(entityRegistry, stateObject)) {
      return
    }

    const deviceRecord = entityRegistry.device_id ? deviceById.get(entityRegistry.device_id) : null
    const registryAreaId = entityRegistry.area_id || resolveDeviceAreaId(deviceRecord)
    const fallbackRoom = fallbackRoomName(stateObject)
    const areaId = registryAreaId || (fallbackRoom !== '未分区' ? `fallback:${fallbackRoom}` : 'unassigned')
    const areaRecord = areaById.get(areaId)
    const roomName = normalizeAreaName(areaRecord?.name || fallbackRoom || entityRegistry.area_id || '未分区')
    const roomId = areaRecord ? areaId : `room:${roomName}`
    const deviceId = entityRegistry.device_id || `virtual:${entityRegistry.entity_id}`
    const rawDeviceName =
      deviceRecord?.name_by_user ||
      deviceRecord?.name ||
      stateObject.attributes?.friendly_name ||
      entityRegistry.original_name ||
      stateObject.entity_id

    if (!roomBuckets.has(roomId)) {
      roomBuckets.set(roomId, {
        id: roomId,
        areaId,
        name: roomName,
        fullName: areaRecord?.name || roomName,
        icon: getRoomIcon(areaRecord?.name || roomName),
        devices: new Map()
      })
    }

    const roomBucket = roomBuckets.get(roomId)

    if (!roomBucket.devices.has(deviceId)) {
      roomBucket.devices.set(deviceId, {
        id: deviceId,
        roomId,
        roomName,
        device: deviceRecord,
        name: rawDeviceName,
        entities: []
      })
    }

    const deviceBucket = roomBucket.devices.get(deviceId)

    deviceBucket.entities.push(buildDisplayEntity(stateObject, entityRegistry, deviceBucket.name))
  })

  return Array.from(roomBuckets.values())
    .map((roomBucket) => {
      const devices = Array.from(roomBucket.devices.values())
        .map((deviceBucket) => {
          const entities = deviceBucket.entities.sort(sortEntities)
          const primaryEntity = pickPrimaryEntity(entities)

          if (!primaryEntity) {
            return null
          }

          const icon = getDomainIcon(primaryEntity.domain, primaryEntity)
          const baseDevice = {
            id: deviceBucket.id,
            roomId: roomBucket.id,
            roomName: roomBucket.name,
            name: deviceBucket.name,
            manufacturer: deviceBucket.device?.manufacturer || '',
            model: deviceBucket.device?.model || '',
            entities,
            entityGroups: groupEntitiesByType(entities),
            primaryEntity,
            icon,
            tone: getDomainTone(primaryEntity.domain),
            summary: getDeviceSummary(primaryEntity, entities, deviceBucket.name),
            entityCount: entities.length,
            isVirtual: String(deviceBucket.id).startsWith('virtual:')
          }
          const activityEntities = getMeaningfulRunningEntities(baseDevice)

          return {
            ...baseDevice,
            activitySummary: getDeviceActivitySummary(activityEntities),
            activityEntities,
            isActive: activityEntities.length > 0
          }
        })
        .filter(Boolean)
        .sort((left, right) => {
          if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1
          }

          return left.name.localeCompare(right.name, 'zh-Hans-CN')
        })

      return {
        id: roomBucket.id,
        areaId: roomBucket.areaId,
        name: roomBucket.name,
        fullName: roomBucket.fullName,
        icon: roomBucket.icon,
        devices
      }
    })
    .filter((room) => room.devices.length > 0)
    .sort((left, right) => {
      const leftPriority = ROOM_PRIORITY[left.name] || 50
      const rightPriority = ROOM_PRIORITY[right.name] || 50

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })
}

export function flattenRoomDevices(roomTree = []) {
  return roomTree.flatMap((room) => room.devices || [])
}

export function getQuickControlDevices(roomTree = [], limit = Number.POSITIVE_INFINITY) {
  const list = flattenRoomDevices(roomTree)
    .filter((device) => device.primaryEntity?.isOperable)
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1
      }

      const leftPriority = PRIMARY_DOMAIN_PRIORITY[left.primaryEntity?.domain] || 99
      const rightPriority = PRIMARY_DOMAIN_PRIORITY[right.primaryEntity?.domain] || 99

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })

  return Number.isFinite(limit) ? list.slice(0, limit) : list
}

export function getRunningDeviceCards(roomTree = [], limit = Number.POSITIVE_INFINITY) {
  const list = flattenRoomDevices(roomTree)
    .filter((device) => {
      const name = device.name || ''

      if (device.isVirtual || CURTAIN_PATTERN.test(name)) {
        return false
      }

      return Array.isArray(device.activityEntities) && device.activityEntities.length > 0
    })
    .sort((left, right) => {
      const leftPriority = PRIMARY_DOMAIN_PRIORITY[left.primaryEntity?.domain] || 99
      const rightPriority = PRIMARY_DOMAIN_PRIORITY[right.primaryEntity?.domain] || 99

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })

  return Number.isFinite(limit) ? list.slice(0, limit) : list
}

function findEntityByClass(entityList = [], deviceClass = '') {
  return entityList.find((entity) => entity.deviceClass === deviceClass)
}

export function extractIndoorEnvironment(roomTree = [], entitiesMap = new Map()) {
  const devices = flattenRoomDevices(roomTree)
  const purifierDevice = devices.find((device) => /空气净化器|air purifier/i.test(device.name))
  const purifierEntities = purifierDevice?.entities || []
  const fallbackEntities = Array.from(entitiesMap.values())
  const temperatureEntity =
    findEntityByClass(purifierEntities, 'temperature') ||
    fallbackEntities.find((entity) => entity.attributes?.device_class === 'temperature' && /空气净化器/.test(getStateName(entity)))
  const humidityEntity =
    findEntityByClass(purifierEntities, 'humidity') ||
    fallbackEntities.find((entity) => entity.attributes?.device_class === 'humidity' && /空气净化器/.test(getStateName(entity)))
  const pm25Entity =
    findEntityByClass(purifierEntities, 'pm25') ||
    fallbackEntities.find((entity) => entity.attributes?.device_class === 'pm25' && /空气净化器/.test(getStateName(entity)))
  const airQualityEntity =
    purifierEntities.find((entity) => /空气质量/.test(entity.name)) ||
    fallbackEntities.find((entity) => /空气质量/.test(getStateName(entity)) && /空气净化器/.test(getStateName(entity)))

  return {
    source: purifierDevice?.name || '空气净化器',
    temperature: temperatureEntity?.state || '--',
    humidity: humidityEntity?.state || '--',
    pm25: pm25Entity?.state || '--',
    airQuality: airQualityEntity?.state || '室内稳定'
  }
}
