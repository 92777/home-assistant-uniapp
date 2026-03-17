/**
 * 应用配置
 * 功能: 存储应用级别的常量配置
 */

/**
 * API 配置
 */
export const API_CONFIG = {
  // WebSocket 重连间隔 (毫秒)
  WS_RECONNECT_INTERVAL: 3000,
  // WebSocket 最大重连次数
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  // 请求超时时间 (毫秒)
  REQUEST_TIMEOUT: 10000
}

/**
 * 存储键名
 */
export const STORAGE_KEYS = {
  // Home Assistant URL
  HA_URL: 'ha_url',
  // Home Assistant Token
  HA_TOKEN: 'ha_token',
  // 用户配置
  USER_CONFIG: 'user_config',
  // 常用设备列表
  FAVORITE_DEVICES: 'favorite_devices'
}

/**
 * 设备域类型
 */
export const DEVICE_DOMAINS = {
  LIGHT: 'light',
  SWITCH: 'switch',
  CLIMATE: 'climate',
  COVER: 'cover',
  LOCK: 'lock',
  FAN: 'fan',
  MEDIA_PLAYER: 'media_player',
  SENSOR: 'sensor',
  BINARY_SENSOR: 'binary_sensor'
}

/**
 * 实体状态
 */
export const ENTITY_STATES = {
  ON: 'on',
  OFF: 'off',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown'
}

/**
 * 服务类型
 */
export const SERVICE_TYPES = {
  TURN_ON: 'turn_on',
  TURN_OFF: 'turn_off',
  TOGGLE: 'toggle'
}

/**
 * 图标映射
 */
export const ICON_MAP = {
  // 设备图标
  light: 'icon-lightbulb',
  switch: 'icon-toggle-on',
  climate: 'icon-snowflake',
  cover: 'icon-curtain',
  lock: 'icon-lock',
  fan: 'icon-fan',
  media_player: 'icon-tv',
  sensor: 'icon-thermometer',
  binary_sensor: 'icon-motion-sensor',
  
  // 房间图标
  living_room: 'icon-couch',
  bedroom: 'icon-bed',
  kitchen: 'icon-utensils',
  bathroom: 'icon-bath',
  study: 'icon-book',
  
  // 场景图标
  leave_home: 'icon-house',
  arrive_home: 'icon-person-walking',
  sleep: 'icon-moon',
  movie: 'icon-film',
  breakfast: 'icon-mug-saucer',
  reading: 'icon-book-open'
}

/**
 * 颜色主题
 */
export const THEME_COLORS = {
  // 主色调
  primary: '#ffc285',
  // 辅助色
  secondary: '#b5e4ff',
  // 成功色
  success: '#aaffaa',
  // 警告色
  warning: '#ffdbb5',
  // 错误色
  error: '#ffaaaa',
  // 背景色
  background: '#0a0a14',
  // 卡片背景
  cardBackground: 'rgba(25, 25, 35, 0.35)',
  // 边框色
  border: 'rgba(255, 255, 255, 0.18)'
}

/**
 * 动画时长
 */
export const ANIMATION_DURATION = {
  // 快速
  fast: 200,
  // 正常
  normal: 300,
  // 慢速
  slow: 500
}

/**
 * 分页配置
 */
export const PAGINATION = {
  // 每页数量
  pageSize: 20,
  // 最大页数
  maxPages: 100
}
