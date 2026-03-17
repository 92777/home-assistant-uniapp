/**
 * 本地缓存管理工具
 * 功能: 管理应用数据的本地持久化存储
 */

/**
 * 缓存键名枚举
 */
export const CacheKeys = {
  // 用户相关
  USER_CONFIG: 'user_config',
  HA_URL: 'ha_url',
  HA_TOKEN: 'ha_token',
  
  // 设备相关
  DEVICES_CACHE: 'devices_cache',
  ROOMS_CACHE: 'rooms_cache',
  ENTITIES_CACHE: 'entities_cache',
  
  // 搜索相关
  SEARCH_HISTORY: 'search_history',
  FAVORITE_DEVICES: 'favorite_devices',
  
  // 设置相关
  THEME_CONFIG: 'theme_config',
  APP_SETTINGS: 'app_settings',
  
  // 缓存时间戳
  CACHE_TIMESTAMP: 'cache_timestamp'
}

/**
 * 缓存配置
 */
const CacheConfig = {
  // 默认过期时间（毫秒）
  DEFAULT_EXPIRE: 24 * 60 * 60 * 1000, // 24小时
  
  // 实体状态缓存过期时间
  ENTITIES_EXPIRE: 1 * 60 * 60 * 1000, // 1小时
  
  // 设备缓存过期时间
  DEVICES_EXPIRE: 6 * 60 * 60 * 1000, // 6小时
}

/**
 * 缓存管理类
 */
export class CacheManager {
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} expire - 过期时间（毫秒）
   */
  static set(key, value, expire = CacheConfig.DEFAULT_EXPIRE) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expire
      }
      
      uni.setStorageSync(key, JSON.stringify(data))
      return true
    } catch (error) {
      console.error('缓存设置失败:', error)
      return false
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any} 缓存值（已过期则返回 null）
   */
  static get(key) {
    try {
      const dataStr = uni.getStorageSync(key)
      
      if (!dataStr) {
        return null
      }
      
      const data = JSON.parse(dataStr)
      
      // 检查是否过期
      if (data.expire && Date.now() - data.timestamp > data.expire) {
        this.remove(key)
        return null
      }
      
      return data.value
    } catch (error) {
      console.error('缓存读取失败:', error)
      return null
    }
  }

  /**
   * 移除缓存
   * @param {string} key - 缓存键
   */
  static remove(key) {
    try {
      uni.removeStorageSync(key)
      return true
    } catch (error) {
      console.error('缓存删除失败:', error)
      return false
    }
  }

  /**
   * 清空所有缓存
   */
  static clear() {
    try {
      uni.clearStorageSync()
      return true
    } catch (error) {
      console.error('缓存清空失败:', error)
      return false
    }
  }

  /**
   * 获取缓存信息
   * @param {string} key - 缓存键
   * @returns {object} 缓存信息
   */
  static getInfo(key) {
    try {
      const dataStr = uni.getStorageSync(key)
      
      if (!dataStr) {
        return null
      }
      
      const data = JSON.parse(dataStr)
      
      return {
        timestamp: data.timestamp,
        expire: data.expire,
        age: Date.now() - data.timestamp,
        isExpired: data.expire && Date.now() - data.timestamp > data.expire
      }
    } catch (error) {
      console.error('缓存信息获取失败:', error)
      return null
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  static has(key) {
    return this.get(key) !== null
  }

  /**
   * 更新缓存时间戳
   * @param {string} key - 缓存键
   */
  static touch(key) {
    try {
      const dataStr = uni.getStorageSync(key)
      
      if (dataStr) {
        const data = JSON.parse(dataStr)
        data.timestamp = Date.now()
        uni.setStorageSync(key, JSON.stringify(data))
      }
    } catch (error) {
      console.error('缓存时间戳更新失败:', error)
    }
  }
}

/**
 * 实体状态缓存管理
 */
export class EntityCacheManager {
  /**
   * 保存实体状态
   * @param {Map} entities - 实体 Map
   */
  static saveEntities(entities) {
    try {
      // 将 Map 转换为数组
      const entitiesArray = Array.from(entities.entries())
      
      CacheManager.set(
        CacheKeys.ENTITIES_CACHE,
        entitiesArray,
        CacheConfig.ENTITIES_EXPIRE
      )
    } catch (error) {
      console.error('实体状态保存失败:', error)
    }
  }

  /**
   * 加载实体状态
   * @returns {Map} 实体 Map
   */
  static loadEntities() {
    try {
      const entitiesArray = CacheManager.get(CacheKeys.ENTITIES_CACHE)
      
      if (entitiesArray && Array.isArray(entitiesArray)) {
        return new Map(entitiesArray)
      }
      
      return new Map()
    } catch (error) {
      console.error('实体状态加载失败:', error)
      return new Map()
    }
  }

  /**
   * 更新单个实体状态
   * @param {string} entityId - 实体 ID
   * @param {object} state - 实体状态
   */
  static updateEntity(entityId, state) {
    try {
      const entities = this.loadEntities()
      entities.set(entityId, state)
      this.saveEntities(entities)
    } catch (error) {
      console.error('实体状态更新失败:', error)
    }
  }
}

/**
 * 设备缓存管理
 */
export class DeviceCacheManager {
  /**
   * 保存设备列表
   * @param {Array} devices - 设备列表
   */
  static saveDevices(devices) {
    CacheManager.set(
      CacheKeys.DEVICES_CACHE,
      devices,
      CacheConfig.DEVICES_EXPIRE
    )
  }

  /**
   * 加载设备列表
   * @returns {Array} 设备列表
   */
  static loadDevices() {
    return CacheManager.get(CacheKeys.DEVICES_CACHE) || []
  }

  /**
   * 保存房间列表
   * @param {Array} rooms - 房间列表
   */
  static saveRooms(rooms) {
    CacheManager.set(
      CacheKeys.ROOMS_CACHE,
      rooms,
      CacheConfig.DEVICES_EXPIRE
    )
  }

  /**
   * 加载房间列表
   * @returns {Array} 房间列表
   */
  static loadRooms() {
    return CacheManager.get(CacheKeys.ROOMS_CACHE) || []
  }
}

/**
 * 用户配置缓存管理
 */
export class UserCacheManager {
  /**
   * 保存用户配置
   * @param {object} config - 用户配置
   */
  static saveUserConfig(config) {
    CacheManager.set(CacheKeys.USER_CONFIG, config)
  }

  /**
   * 加载用户配置
   * @returns {object} 用户配置
   */
  static loadUserConfig() {
    return CacheManager.get(CacheKeys.USER_CONFIG) || {}
  }

  /**
   * 保存常用设备
   * @param {Array} deviceIds - 设备 ID 列表
   */
  static saveFavoriteDevices(deviceIds) {
    CacheManager.set(CacheKeys.FAVORITE_DEVICES, deviceIds)
  }

  /**
   * 加载常用设备
   * @returns {Array} 设备 ID 列表
   */
  static loadFavoriteDevices() {
    return CacheManager.get(CacheKeys.FAVORITE_DEVICES) || []
  }
}

/**
 * 主题配置缓存管理
 */
export class ThemeCacheManager {
  /**
   * 保存主题配置
   * @param {object} theme - 主题配置
   */
  static saveTheme(theme) {
    CacheManager.set(CacheKeys.THEME_CONFIG, theme)
  }

  /**
   * 加载主题配置
   * @returns {object} 主题配置
   */
  static loadTheme() {
    return CacheManager.get(CacheKeys.THEME_CONFIG) || { mode: 'dark' }
  }
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache() {
  const keys = Object.values(CacheKeys)
  
  keys.forEach(key => {
    const info = CacheManager.getInfo(key)
    
    if (info && info.isExpired) {
      CacheManager.remove(key)
      console.log(`已清理过期缓存: ${key}`)
    }
  })
}
