/**
 * 工具函数
 * 功能: 提供通用的工具方法
 */

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
 * @param {string} format - 格式化模板 (默认: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) {
    return ''
  }
  
  const d = new Date(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化持续时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的持续时间
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) {
    return '0秒'
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts = []
  if (hours > 0) {
    parts.push(`${hours}小时`)
  }
  if (minutes > 0) {
    parts.push(`${minutes}分钟`)
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}秒`)
  }
  
  return parts.join('')
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间 (毫秒)
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} wait - 等待时间 (毫秒)
 * @returns {Function} 节流后的函数
 */
export function throttle(func, wait = 300) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= wait) {
      func.apply(this, args)
      lastTime = now
    }
  }
}

/**
 * 深拷贝
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (obj instanceof Object) {
    const copy = {}
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone(obj[key])
    })
    return copy
  }
  
  return obj
}

/**
 * 获取实体域名
 * @param {string} entityId - 实体 ID
 * @returns {string} 域名
 */
export function getEntityDomain(entityId) {
  if (!entityId || typeof entityId !== 'string') {
    return ''
  }
  
  const parts = entityId.split('.')
  return parts[0] || ''
}

/**
 * 判断实体是否可操作
 * @param {string} entityId - 实体 ID
 * @returns {boolean} 是否可操作
 */
export function isEntityOperable(entityId) {
  const domain = getEntityDomain(entityId)
  const operableDomains = ['light', 'switch', 'climate', 'cover', 'lock', 'fan', 'media_player']
  return operableDomains.includes(domain)
}

/**
 * 获取实体状态文本
 * @param {object} entity - 实体对象
 * @returns {string} 状态文本
 */
export function getEntityStateText(entity) {
  if (!entity) {
    return ''
  }
  
  const domain = getEntityDomain(entity.entity_id)
  const state = entity.state
  
  // 灯光
  if (domain === 'light') {
    if (state === 'on') {
      const brightness = entity.attributes?.brightness
      return brightness ? `开启 ${Math.round(brightness / 2.55)}%` : '开启'
    }
    return '关闭'
  }
  
  // 开关
  if (domain === 'switch') {
    return state === 'on' ? '开启' : '关闭'
  }
  
  // 空调
  if (domain === 'climate') {
    const modeMap = {
      'off': '关闭',
      'heat': '制热',
      'cool': '制冷',
      'auto': '自动',
      'dry': '除湿',
      'fan_only': '送风'
    }
    return modeMap[state] || state
  }
  
  // 窗帘
  if (domain === 'cover') {
    const position = entity.attributes?.current_position || 0
    return `开合 ${position}%`
  }
  
  // 传感器
  if (domain === 'sensor') {
    const unit = entity.attributes?.unit_of_measurement || ''
    return `${state} ${unit}`.trim()
  }
  
  return state
}

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

/**
 * 延迟执行
 * @param {number} ms - 延迟时间 (毫秒)
 * @returns {Promise} Promise 对象
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 检查是否为空对象
 * @param {object} obj - 要检查的对象
 * @returns {boolean} 是否为空
 */
export function isEmpty(obj) {
  if (!obj) {
    return true
  }
  
  if (Array.isArray(obj)) {
    return obj.length === 0
  }
  
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0
  }
  
  return false
}

/**
 * 数组分组
 * @param {Array} array - 要分组的数组
 * @param {string|Function} key - 分组键或分组函数
 * @returns {object} 分组后的对象
 */
export function groupBy(array, key) {
  if (!Array.isArray(array)) {
    return {}
  }
  
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key]
    
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    
    result[groupKey].push(item)
    
    return result
  }, {})
}

/**
 * 数组去重
 * @param {Array} array - 要去重的数组
 * @param {string} key - 去重键 (可选)
 * @returns {Array} 去重后的数组
 */
export function unique(array, key) {
  if (!Array.isArray(array)) {
    return []
  }
  
  if (!key) {
    return [...new Set(array)]
  }
  
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}
