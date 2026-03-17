<template>
  <view class="home-page">
    <!-- 状态栏 -->
    <view class="status-bar">
      <text>{{ currentTime }}</text>
      <view class="status-icons">
        <text class="iconfont icon-signal"></text>
        <text class="iconfont icon-wifi"></text>
        <text class="iconfont icon-battery-full"></text>
      </view>
    </view>

    <!-- 主头部 -->
    <view class="main-header">
      <text class="title gradient-text">智慧·家</text>
      <view class="header-icons">
        <view class="icon-btn">
          <text class="iconfont icon-bell"></text>
        </view>
        <view class="icon-btn">
          <text class="iconfont icon-user"></text>
        </view>
      </view>
    </view>

    <!-- 天气卡片 -->
    <view class="glass-card weather-card">
      <view class="weather-info">
        <view class="weather-main">
          <text :class="['weather-icon', 'iconfont', weatherIcon]"></text>
          <text class="weather-temp">{{ weatherTemp }}</text>
        </view>
        <view class="weather-meta">
          <text class="meta-item">
            <text class="iconfont icon-droplet"></text>
            湿度 {{ weatherHumidity }}%
          </text>
          <text class="meta-item">
            <text class="iconfont icon-wind"></text>
            {{ weatherWind }}
          </text>
        </view>
      </view>
      <view class="weather-switch">
        <view 
          :class="['switch-btn', { active: currentWeather === 'cloud' }]"
          @click="setWeather('cloud')"
        >
          <text class="iconfont icon-cloud"></text>
        </view>
        <view 
          :class="['switch-btn', { active: currentWeather === 'rain' }]"
          @click="setWeather('rain')"
        >
          <text class="iconfont icon-cloud-rain"></text>
        </view>
        <view 
          :class="['switch-btn', { active: currentWeather === 'snow' }]"
          @click="setWeather('snow')"
        >
          <text class="iconfont icon-snowflake"></text>
        </view>
      </view>
    </view>

    <!-- 室内环境 -->
    <view class="glass-card indoor-stats">
      <view class="stat-item">
        <text class="stat-value gradient-text-blue">{{ indoorTemp }}°C</text>
        <text class="stat-label">温度</text>
      </view>
      <view class="stat-item">
        <text class="stat-value gradient-text-blue">{{ indoorHumidity }}%</text>
        <text class="stat-label">湿度</text>
      </view>
      <view class="stat-item">
        <text class="stat-value gradient-text-blue">{{ pm25 }}</text>
        <text class="stat-label">PM2.5</text>
      </view>
    </view>

    <!-- 正在运行的设备 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">正在运行</text>
        <text class="section-link">全部</text>
      </view>
      <scroll-view class="running-scroll" scroll-x>
        <view 
          v-for="device in runningDevices" 
          :key="device.entity_id"
          class="running-item"
        >
          <text :class="['iconfont', getDeviceIcon(device)]"></text>
          <text class="device-name">{{ getDeviceName(device) }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 常用设备 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">常用设备</text>
        <text class="section-link">编辑</text>
      </view>
      <view class="device-grid">
        <view 
          v-for="device in favoriteDevices" 
          :key="device.entity_id"
          class="glass-card device-card"
          @click="toggleDevice(device)"
        >
          <view class="device-card-header">
            <view class="device-icon">
              <text :class="['iconfont', getDeviceIcon(device)]"></text>
            </view>
            <view class="device-info">
              <text class="device-title">{{ getDeviceName(device) }}</text>
              <text class="device-status">{{ getDeviceStatus(device) }}</text>
            </view>
          </view>
          <view v-if="device.attributes.brightness" class="progress-bar">
            <view 
              class="progress-fill" 
              :style="{ width: device.attributes.brightness / 2.55 + '%' }"
            ></view>
          </view>
          <view v-if="device.attributes.temperature" class="device-detail">
            {{ device.attributes.temperature }}°C · {{ device.attributes.fan_mode || '自动' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 首页组件
   * 功能: 展示天气、室内环境、正在运行的设备和常用设备
   */
  import { ref, computed, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()
      
      // 当前时间
      const currentTime = ref('')
      
      // 天气相关
      const currentWeather = ref('cloud')
      const weatherTemp = ref('18°')
      const weatherHumidity = ref(52)
      const weatherWind = ref('微风 6km/h')
      const weatherIcon = computed(() => {
        const icons = {
          cloud: 'icon-cloud-moon',
          rain: 'icon-cloud-rain',
          snow: 'icon-snowflake'
        }
        return icons[currentWeather.value]
      })
      
      // 室内环境
      const indoorTemp = ref(22)
      const indoorHumidity = ref(48)
      const pm25 = ref(12)
      
      // 正在运行的设备
      const runningDevices = computed(() => {
        return store.runningDevices.slice(0, 6)
      })
      
      // 常用设备
      const favoriteDevices = computed(() => {
        // 这里可以从配置中读取常用设备列表
        // 暂时返回前4个灯光和开关
        const favorites = [...store.lights, ...store.switches].slice(0, 4)
        return favorites
      })
      
      /**
       * 更新当前时间
       */
      function updateTime() {
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        currentTime.value = `${hours}:${minutes}`
      }
      
      /**
       * 设置天气
       * @param {string} type - 天气类型
       */
      function setWeather(type) {
        currentWeather.value = type
        
        const weatherData = {
          cloud: {
            temp: '18°',
            humidity: 52,
            wind: '微风 6km/h'
          },
          rain: {
            temp: '12°',
            humidity: 89,
            wind: '和风 15km/h'
          },
          snow: {
            temp: '-2°',
            humidity: 76,
            wind: '东北风 8km/h'
          }
        }
        
        const data = weatherData[type]
        weatherTemp.value = data.temp
        weatherHumidity.value = data.humidity
        weatherWind.value = data.wind
      }
      
      /**
       * 获取设备图标
       * @param {object} device - 设备对象
       * @returns {string} 图标类名
       */
      function getDeviceIcon(device) {
        const entityId = device.entity_id
        const domain = entityId.split('.')[0]
        
        const iconMap = {
          light: 'icon-lightbulb',
          switch: 'icon-toggle-on',
          climate: 'icon-snowflake',
          cover: 'icon-curtain',
          lock: 'icon-lock',
          fan: 'icon-fan',
          media_player: 'icon-tv'
        }
        
        return iconMap[domain] || 'icon-microchip'
      }
      
      /**
       * 获取设备名称
       * @param {object} device - 设备对象
       * @returns {string} 设备名称
       */
      function getDeviceName(device) {
        return device.attributes.friendly_name || device.entity_id
      }
      
      /**
       * 获取设备状态
       * @param {object} device - 设备对象
       * @returns {string} 状态文本
       */
      function getDeviceStatus(device) {
        const state = device.state
        const domain = device.entity_id.split('.')[0]
        
        if (domain === 'light') {
          return state === 'on' ? '已开启' : '已关闭'
        } else if (domain === 'climate') {
          return state === 'cool' ? '制冷' : state === 'heat' ? '制热' : '自动'
        } else if (domain === 'cover') {
          return `开合 ${device.attributes.current_position || 0}%`
        }
        
        return state
      }
      
      /**
       * 切换设备状态
       * @param {object} device - 设备对象
       */
      async function toggleDevice(device) {
        const domain = device.entity_id.split('.')[0]
        const newState = device.state === 'on' ? 'off' : 'on'
        
        try {
          if (domain === 'light') {
            await store.controlLight(device.entity_id, { state: newState })
          } else if (domain === 'switch') {
            await store.controlSwitch(device.entity_id, newState)
          }
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'none'
          })
        }
      }
      
      onMounted(() => {
        updateTime()
        setInterval(updateTime, 60000)
        
        // 加载室内环境数据
        // 这里应该从传感器实体中获取
        // 暂时使用模拟数据
      })
      
      return {
        currentTime,
        currentWeather,
        weatherTemp,
        weatherHumidity,
        weatherWind,
        weatherIcon,
        indoorTemp,
        indoorHumidity,
        pm25,
        runningDevices,
        favoriteDevices,
        setWeather,
        getDeviceIcon,
        getDeviceName,
        getDeviceStatus,
        toggleDevice
      }
    }
  }
</script>

<style scoped>
  .home-page {
    padding: 20px 18px 24px 18px;
  }

  .main-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .title {
    font-size: 34px;
    font-weight: 600;
  }

  .header-icons {
    display: flex;
    gap: 12px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    transition: all 0.2s;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .weather-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
  }

  .weather-main {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .weather-icon {
    font-size: 40px;
    color: #c7dcff;
  }

  .weather-temp {
    font-size: 26px;
    font-weight: 600;
  }

  .weather-meta {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .weather-switch {
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
    padding: 6px 10px;
    border-radius: 60px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .switch-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-radius: 40px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 22px;
    transition: all 0.2s;
  }

  .switch-btn.active {
    background: rgba(255, 215, 150, 0.25);
    color: #ffd58c;
    box-shadow: 0 0 12px #ffae5e;
    border: 1px solid rgba(255, 200, 150, 0.5);
  }

  .indoor-stats {
    display: flex;
    justify-content: space-around;
    text-align: center;
  }

  .stat-item {
    flex: 1;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    display: block;
  }

  .stat-label {
    font-size: 13px;
    opacity: 0.7;
    margin-top: 4px;
    display: block;
  }

  .section {
    margin-top: 20px;
  }

  .running-scroll {
    display: flex;
    gap: 14px;
    padding: 8px 0;
    white-space: nowrap;
  }

  .running-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 70px;
    background: rgba(30, 30, 42, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 30px;
    padding: 12px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
  }

  .running-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  }

  .running-item .iconfont {
    font-size: 26px;
    color: #ffd194;
    margin-bottom: 6px;
  }

  .device-name {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }

  .device-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .device-card {
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .device-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 22px 40px rgba(0, 0, 0, 0.5);
  }

  .device-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .device-info {
    flex: 1;
  }

  .device-title {
    font-size: 16px;
    font-weight: 600;
    display: block;
  }

  .device-status {
    font-size: 13px;
    opacity: 0.7;
    display: block;
  }

  .device-detail {
    font-size: 13px;
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.8);
  }

  @media screen and (min-width: 600px) {
    .device-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media screen and (min-width: 900px) {
    .device-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
