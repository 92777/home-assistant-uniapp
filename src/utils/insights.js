import { formatTime, getEntityDomain } from './index.js'
import { getDomainIcon, getDomainTone, getHumanEntityState } from './device-catalog.js'

const NORMAL_FAULT_STATES = new Set([
  '0',
  'null',
  'none',
  'normal',
  '正常',
  '无故障',
  'off',
  'false',
  '关闭',
  'idle',
  'no faults',
  'no_faults'
])

function parseNumericState(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function createEntityEntry(room, device, entity) {
  return {
    room,
    device,
    entity
  }
}

function getAllEntityEntries(roomTree = []) {
  return roomTree.flatMap((room) => {
    return (room.devices || []).flatMap((device) => {
      return (device.entities || []).map((entity) => createEntityEntry(room, device, entity))
    })
  })
}

function pickIndoorPowerEntity(entries = []) {
  return entries.find((entry) => entry.entity.deviceClass === 'power')
}

function sampleRecords(records = [], count = 12) {
  if (records.length <= count) {
    return records
  }

  return Array.from({ length: count }, (_, index) => {
    const position = Math.round((index * (records.length - 1)) / (count - 1))
    return records[position]
  })
}

function buildBarSeries(records = [], unit = '') {
  if (records.length === 0) {
    return []
  }

  const values = records.map((item) => item.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue

  return sampleRecords(records).map((item) => {
    const ratio = range > 0 ? (item.value - minValue) / range : 0.5

    return {
      value: item.value,
      displayValue: unit ? `${item.value}${unit}` : `${item.value}`,
      label: formatTime(item.timestamp, 'HH:mm'),
      height: `${16 + Math.round(ratio * 26)}px`
    }
  })
}

function buildTrendTone(latestValue = null, kind = '') {
  if (!Number.isFinite(latestValue)) {
    return 'green'
  }

  if (kind === 'temperature') {
    if (latestValue >= 20 && latestValue <= 26) {
      return 'green'
    }

    if ((latestValue >= 16 && latestValue < 20) || (latestValue > 26 && latestValue <= 29)) {
      return 'yellow'
    }

    return 'red'
  }

  if (kind === 'humidity') {
    if (latestValue >= 35 && latestValue <= 60) {
      return 'green'
    }

    if ((latestValue >= 25 && latestValue < 35) || (latestValue > 60 && latestValue <= 70)) {
      return 'yellow'
    }

    return 'red'
  }

  if (kind === 'pm25') {
    if (latestValue <= 35) {
      return 'green'
    }

    if (latestValue <= 75) {
      return 'yellow'
    }

    return 'red'
  }

  if (kind === 'power') {
    if (latestValue <= 5) {
      return 'green'
    }

    if (latestValue <= 30) {
      return 'yellow'
    }

    return 'red'
  }

  return 'green'
}

function buildDeltaLabel(records = [], unit = '') {
  if (records.length < 2) {
    return '近24小时'
  }

  const delta = records[records.length - 1].value - records[0].value

  if (Math.abs(delta) < 0.1) {
    return '基本平稳'
  }

  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${delta.toFixed(1)}${unit || ''}`
}

function findByPredicate(entries = [], predicate) {
  return entries.find((entry) => {
    try {
      return predicate(entry)
    } catch {
      return false
    }
  })
}

export function getIndoorTrendTargets(roomTree = [], entitiesMap = new Map()) {
  const entries = getAllEntityEntries(roomTree)
  const fallbackEntries = Array.from(entitiesMap.values()).map((entity) => ({
    room: { name: '未分区' },
    device: { id: entity.entity_id, name: entity.attributes?.friendly_name || entity.entity_id },
    entity: {
      ...entity,
      domain: getEntityDomain(entity.entity_id),
      deviceClass: entity.attributes?.device_class || '',
      unit: entity.attributes?.unit_of_measurement || '',
      name: entity.attributes?.friendly_name || entity.entity_id
    }
  }))
  const sourceEntries = entries.length > 0 ? entries : fallbackEntries

  const purifierTemperature = findByPredicate(sourceEntries, ({ device, entity }) => {
    return /空气净化器/i.test(device.name) && entity.deviceClass === 'temperature'
  })
  const purifierHumidity = findByPredicate(sourceEntries, ({ device, entity }) => {
    return /空气净化器/i.test(device.name) && entity.deviceClass === 'humidity'
  })
  const purifierPm25 = findByPredicate(sourceEntries, ({ device, entity }) => {
    return /空气净化器/i.test(device.name) && entity.deviceClass === 'pm25'
  })
  const powerEntry = pickIndoorPowerEntity(sourceEntries)

  return [
    purifierTemperature && {
      key: 'temperature',
      label: '温度',
      entityId: purifierTemperature.entity.entity_id,
      unit: '°',
      icon: 'icon-thermometer',
      tone: buildTrendTone(parseNumericState(purifierTemperature.entity.state), 'temperature')
    },
    purifierHumidity && {
      key: 'humidity',
      label: '湿度',
      entityId: purifierHumidity.entity.entity_id,
      unit: '%',
      icon: 'icon-droplet',
      tone: buildTrendTone(parseNumericState(purifierHumidity.entity.state), 'humidity')
    },
    purifierPm25 && {
      key: 'pm25',
      label: 'PM2.5',
      entityId: purifierPm25.entity.entity_id,
      unit: '',
      icon: 'icon-wind',
      tone: buildTrendTone(parseNumericState(purifierPm25.entity.state), 'pm25')
    },
    powerEntry && {
      key: 'power',
      label: '功率',
      entityId: powerEntry.entity.entity_id,
      unit: powerEntry.entity.unit || 'W',
      icon: 'icon-bolt',
      tone: buildTrendTone(parseNumericState(powerEntry.entity.state), 'power')
    }
  ].filter(Boolean)
}

export function normalizeHistorySeries(rawHistory = []) {
  const historyList = Array.isArray(rawHistory?.[0]) ? rawHistory[0] : rawHistory

  if (!Array.isArray(historyList)) {
    return []
  }

  return historyList
    .map((item) => ({
      value: parseNumericState(item.state),
      timestamp: item.last_changed || item.last_updated || ''
    }))
    .filter((item) => Number.isFinite(item.value) && item.timestamp)
}

export function buildTrendCard(target = {}, rawHistory = []) {
  const records = normalizeHistorySeries(rawHistory)
  const latestRecord = records[records.length - 1] || null
  const latestValue = latestRecord?.value ?? null
  const unit = target.unit || ''
  const normalizedUnit = target.key === 'temperature' ? '°' : unit

  return {
    key: target.key,
    label: target.label,
    icon: target.icon,
    tone: buildTrendTone(latestValue, target.key),
    latestValue: latestValue === null ? '--' : `${latestValue}${normalizedUnit}`,
    deltaLabel: buildDeltaLabel(records, normalizedUnit),
    bars: buildBarSeries(records, normalizedUnit)
  }
}

function createHealthItem(type, room, device, entity, description, priority = 'medium') {
  return {
    id: `${type}:${entity.entity_id}`,
    type,
    priority,
    roomName: room?.name || '未分区',
    deviceName: device?.name || entity.name,
    entityName: entity.name,
    icon: device?.icon || getDomainIcon(entity.domain, entity),
    tone: priority === 'high' ? 'danger' : (device?.tone || getDomainTone(entity.domain)),
    description
  }
}

export function buildDeviceHealth(roomTree = []) {
  const entries = getAllEntityEntries(roomTree)
  const issues = []
  const offlineKeys = new Set()

  entries.forEach(({ room, device, entity }) => {
    const domain = entity.domain || getEntityDomain(entity.entity_id)
    const stateText = String(entity.state || '')
    const normalizedState = stateText.toLowerCase()
    const batteryValue = parseNumericState(entity.state)

    if (['unknown', 'unavailable'].includes(normalizedState)) {
      const dedupeKey = `${device.id}`

      if (!offlineKeys.has(dedupeKey)) {
        offlineKeys.add(dedupeKey)
        issues.push(
          createHealthItem(
            'offline',
            room,
            device,
            entity,
            `${getHumanEntityState(entity) || '状态异常'}，建议检查设备在线情况`,
            'high'
          )
        )
      }

      return
    }

    if (entity.deviceClass === 'battery' && Number.isFinite(batteryValue) && batteryValue <= 20) {
      issues.push(
        createHealthItem(
          'battery',
          room,
          device,
          entity,
          `电量仅剩 ${batteryValue}${entity.unit || '%'}`,
          batteryValue <= 10 ? 'high' : 'medium'
        )
      )
    }

    if (
      (/故障|fault|告警|异常/i.test(entity.name) || entity.deviceClass === 'problem') &&
      !NORMAL_FAULT_STATES.has(normalizedState)
    ) {
      issues.push(
        createHealthItem(
          'fault',
          room,
          device,
          entity,
          `${entity.name}：${stateText}`,
          'high'
        )
      )
    }

    if (domain === 'binary_sensor' && entity.deviceClass === 'smoke' && entity.state === 'on') {
      issues.push(
        createHealthItem(
          'smoke',
          room,
          device,
          entity,
          '检测到烟雾告警，请立即确认现场',
          'high'
        )
      )
    }
  })

  const sortedIssues = issues.sort((left, right) => {
    const leftPriority = left.priority === 'high' ? 1 : 2
    const rightPriority = right.priority === 'high' ? 1 : 2

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return left.roomName.localeCompare(right.roomName, 'zh-Hans-CN')
  })

  return {
    summary: {
      total: sortedIssues.length,
      offline: sortedIssues.filter((item) => item.type === 'offline').length,
      battery: sortedIssues.filter((item) => item.type === 'battery').length,
      fault: sortedIssues.filter((item) => ['fault', 'smoke'].includes(item.type)).length
    },
    issues: sortedIssues
  }
}

function createAction(id, title, description, icon, tone, domain, service, data = {}, kind = 'service') {
  return {
    id,
    title,
    description,
    icon,
    tone,
    domain,
    service,
    data,
    kind
  }
}

export function buildExecutionCenter(roomTree = [], entitiesMap = new Map()) {
  const states = Array.from(entitiesMap.values())
  const lights = states.filter((entity) => entity.entity_id.startsWith('light.'))
  const fans = states.filter((entity) => entity.entity_id.startsWith('fan.'))
  const covers = states.filter((entity) => entity.entity_id.startsWith('cover.'))
  const scenes = states.filter((entity) => entity.entity_id.startsWith('scene.'))
  const scripts = states.filter((entity) => entity.entity_id.startsWith('script.'))

  const serviceActions = []

  if (lights.length > 0) {
    serviceActions.push(
      createAction(
        'service:lights-on',
        '打开灯光',
        `${lights.length} 盏灯一起点亮`,
        'icon-lightbulb',
        'warm',
        'homeassistant',
        'turn_on',
        { entity_id: lights.map((entity) => entity.entity_id) }
      ),
      createAction(
        'service:lights-off',
        '关闭灯光',
        `${lights.length} 盏灯统一关闭`,
        'icon-lightbulb',
        'cool',
        'homeassistant',
        'turn_off',
        { entity_id: lights.map((entity) => entity.entity_id) }
      )
    )
  }

  const purifier = fans.find((entity) => /空气净化器/i.test(entity.attributes?.friendly_name || entity.entity_id))

  if (purifier) {
    serviceActions.push(
      createAction(
        'service:purifier-toggle',
        purifier.state === 'on' ? '关闭空气净化器' : '开启空气净化器',
        purifier.state === 'on' ? '回到安静待机' : '恢复净化运行',
        'icon-fan',
        'safe',
        'fan',
        purifier.state === 'on' ? 'turn_off' : 'turn_on',
        { entity_id: purifier.entity_id }
      )
    )
  }

  if (covers.length > 0) {
    serviceActions.push(
      createAction(
        'service:cover-close',
        '关闭窗帘',
        `${covers.length} 组窗帘统一闭合`,
        'icon-curtain',
        'accent',
        'cover',
        'close_cover',
        { entity_id: covers.map((entity) => entity.entity_id) }
      ),
      createAction(
        'service:cover-open',
        '打开窗帘',
        `${covers.length} 组窗帘统一打开`,
        'icon-curtain',
        'cool',
        'cover',
        'open_cover',
        { entity_id: covers.map((entity) => entity.entity_id) }
      )
    )
  }

  return {
    scenes: scenes.map((entity) => ({
      id: entity.entity_id,
      title: entity.attributes?.friendly_name || entity.entity_id,
      description: '点击执行 Home Assistant 场景',
      icon: 'icon-star',
      tone: 'warm',
      kind: 'scene',
      domain: 'scene',
      service: 'turn_on',
      data: {
        entity_id: entity.entity_id
      }
    })),
    scripts: scripts.map((entity) => ({
      id: entity.entity_id,
      title: entity.attributes?.friendly_name || entity.entity_id,
      description: '点击执行 Home Assistant 脚本',
      icon: 'icon-circle-play',
      tone: 'accent',
      kind: 'script',
      domain: 'script',
      service: 'turn_on',
      data: {
        entity_id: entity.entity_id
      }
    })),
    services: serviceActions
  }
}

export function classifyNotification(event = {}) {
  const domain = getEntityDomain(event.entityId)
  const deviceClass = event.deviceClass || ''
  const state = String(event.newState || '').toLowerCase()

  if (domain === 'binary_sensor' && deviceClass === 'smoke' && state === 'on') {
    return {
      priority: 'critical',
      tag: '紧急告警'
    }
  }

  if (['unknown', 'unavailable'].includes(state)) {
    return {
      priority: 'high',
      tag: '离线提醒'
    }
  }

  if (domain === 'binary_sensor' && ['door', 'window', 'opening'].includes(deviceClass) && state === 'on') {
    return {
      priority: 'high',
      tag: '门窗提醒'
    }
  }

  if (domain === 'binary_sensor' && ['motion', 'occupancy', 'presence'].includes(deviceClass) && state === 'on') {
    return {
      priority: 'medium',
      tag: '活动提醒'
    }
  }

  return {
    priority: 'normal',
    tag: '设备动态'
  }
}
