<template>
  <view class="page-shell home-page">
    <WeatherBackdrop />
    <view class="page-content home-content">
      <view class="status-bar">
        <text>{{ currentTime }}</text>
        <view class="status-icons">
          <ConnectionStatusDot />
          <text class="iconfont icon-signal"></text>
          <text class="iconfont icon-wifi"></text>
          <text class="iconfont icon-battery-full"></text>
        </view>
      </view>

      <view class="main-header home-header">
        <view class="brand-block">
          <view class="brand-row">
            <text class="page-title gradient-text">智慧·家</text>
            <view class="weather-pill">
              <text :class="['iconfont', weatherInfo.icon]"></text>
              <text>{{ formatTemperature(weatherInfo.temperature) }}</text>
            </view>
          </view>
          <text class="brand-note">{{ weatherInfo.cityName }}</text>
        </view>

        <view class="header-actions">
          <view class="icon-btn" @click="openSearch">
            <text class="iconfont icon-search"></text>
          </view>
          <view class="icon-btn notice-btn" @click="showNotice">
            <text class="iconfont icon-bell"></text>
            <view v-if="unreadNotificationCount > 0" class="notice-badge">
              <text>{{ formatNotificationCount(unreadNotificationCount) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="alertHighlights.length > 0" class="glass-card alert-card">
        <view class="alert-head">
          <text class="alert-title">重点提醒</text>
          <text class="alert-link" @click="showNotice">查看全部</text>
        </view>
        <view class="alert-list">
          <view
            v-for="item in alertHighlights"
            :key="item.id"
            class="alert-item"
          >
            <view class="alert-dot"></view>
            <text class="alert-copy">{{ item.title }} · {{ item.description }}</text>
          </view>
        </view>
      </view>

      <view v-if="runningDevices.length > 0" class="activity-strip">
        <view
          v-for="device in runningDevices"
          :key="device.id"
          class="glass-card activity-pill"
          @click="openDevice(device)"
        >
          <view :class="['device-icon', 'activity-icon', device.tone]">
            <text :class="['iconfont', device.icon]"></text>
          </view>
          <view class="activity-copy">
            <text class="activity-title">{{ device.name }}</text>
            <text class="activity-count">{{ getRunningDeviceMeta(device) }}</text>
          </view>
        </view>
      </view>

      <view class="glass-card climate-card" @click="toggleClimatePanel">
        <view class="climate-card-head">
          <text class="section-title">室内环境</text>
          <view class="climate-head-side">
            <text class="climate-toggle-hint">{{ showClimateTrends ? '点按查看实时' : '点按查看24h' }}</text>
            <text class="glass-pill climate-mode-pill">{{ showClimateTrends ? '24h' : '实时' }}</text>
          </view>
        </view>

        <view class="climate-card-body">
          <view v-if="!showClimateTrends" class="climate-panel">
            <view :class="['climate-metric', `metric-${temperatureTone}`]">
              <view class="metric-icon">
                <text class="iconfont icon-thermometer"></text>
              </view>
              <text class="metric-value">{{ formatTemperature(indoorClimate.temperature) }}</text>
              <text class="metric-title">温度</text>
            </view>

            <view :class="['climate-metric', `metric-${humidityTone}`]">
              <view class="metric-icon">
                <text class="iconfont icon-droplet"></text>
              </view>
              <text class="metric-value">{{ formatPercent(indoorClimate.humidity) }}</text>
              <text class="metric-title">湿度</text>
            </view>

            <view :class="['climate-metric', 'climate-air-metric', `metric-${airTone}`]">
              <view v-if="purifierActive" class="metric-fan-badge">
                <text class="iconfont icon-fan spin-fan"></text>
              </view>
              <view class="metric-icon">
                <text :class="['iconfont', airMetricIcon]"></text>
              </view>
              <text class="metric-value">{{ airQualityLabel }}</text>
              <text class="metric-title">PM2.5</text>
            </view>
          </view>

          <view v-else-if="climateTrendCards.length > 0" class="climate-trend-grid">
            <view
              v-for="item in climateTrendCards"
              :key="item.key"
              :class="['climate-trend-item', `trend-${item.tone}`]"
            >
              <view class="climate-trend-head">
                <view class="climate-trend-label">
                  <text :class="['iconfont', item.icon]"></text>
                  <text>{{ item.label }}</text>
                </view>
                <text class="climate-trend-value">{{ item.latestValue }}</text>
              </view>
              <view class="climate-trend-bars">
                <view
                  v-for="(bar, index) in item.bars"
                  :key="`${item.key}-${index}`"
                  class="climate-trend-bar"
                  :style="{ height: bar.height }"
                ></view>
              </view>
              <text class="climate-trend-note">{{ item.deltaLabel }}</text>
            </view>
          </view>

          <view v-else class="climate-trend-empty">
            <text class="iconfont icon-clock"></text>
            <text>24 小时变化数据同步中</text>
          </view>
        </view>
      </view>

      <view class="section common-section">
        <view class="section-header">
          <text class="section-title">常用</text>
          <text class="section-link" @click="openDevices">全部</text>
        </view>

        <view v-if="commonDevices.length > 0" class="common-list">
          <view
            v-for="device in commonDevices"
            :key="device.id"
            class="glass-card common-card"
            @click="openDevice(device)"
          >
            <view :class="['device-icon', 'common-icon', device.tone]">
              <text :class="['iconfont', device.icon]"></text>
            </view>
            <view class="common-copy">
              <text class="common-name">{{ device.name }}</text>
              <text class="common-room">{{ getDeviceRoomLabel(device) }}</text>
            </view>
            <view class="common-badge">
              <text :class="['iconfont', getDeviceBadgeIcon(device)]"></text>
            </view>
          </view>
        </view>

        <view v-else class="glass-card empty-card">
          <text class="empty-text">常用设备正在同步中。</text>
        </view>
      </view>
    </view>

    <view v-if="noticeVisible" class="notice-mask" @click="closeNotice">
      <view class="notice-panel" @click.stop>
        <view class="sheet-handle"></view>

        <view class="notice-head">
          <view class="notice-copy">
            <text class="notice-title">消息通知</text>
            <text class="notice-subtitle">设备状态变化会通过 WebSocket 实时推送到这里</text>
          </view>
          <view class="notice-close" @click="closeNotice">
            <text class="iconfont icon-times"></text>
          </view>
        </view>

        <view class="notice-toolbar">
          <text class="glass-pill notice-count">{{ notifications.length }} 条</text>
          <text v-if="notifications.length > 0" class="notice-link" @click="clearAllNotifications">清空</text>
        </view>

        <scroll-view class="notice-scroll" scroll-y>
          <view v-if="notifications.length > 0" class="notice-list">
            <view
              v-for="item in notifications"
              :key="item.id"
              class="glass-card notice-item"
            >
              <view :class="['device-icon', 'notice-item-icon', item.tone]">
                <text :class="['iconfont', item.icon]"></text>
              </view>
              <view class="notice-item-copy">
                <view class="notice-item-row">
                  <text class="notice-item-title">{{ item.title }}</text>
                  <text class="notice-item-time">{{ item.timeLabel }}</text>
                </view>
                <view class="notice-meta">
                  <text :class="['notice-tag', item.priority]">{{ item.tag }}</text>
                </view>
                <text class="notice-item-desc">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <view v-else class="glass-card notice-empty">
            <text class="iconfont icon-bell"></text>
            <text class="notice-empty-title">还没有新的设备消息</text>
            <text class="notice-empty-desc">等 Home Assistant 推送状态变化后，这里会实时出现。</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <CustomTabbar :current="0" />
  </view>
</template>

<script>
  /**
   * 首页组件
   * 功能: 以移动端/Pad 兼容布局展示天气、室内环境、场景和常用设备
   */
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { onShow } from '@dcloudio/uni-app'
  import { useHAStore } from '../../store/ha-store.js'
  import CustomTabbar from '../../components/CustomTabbar.vue'
  import ConnectionStatusDot from '../../components/ConnectionStatusDot.vue'
  import WeatherBackdrop from '../../components/WeatherBackdrop.vue'

  export default {
    components: {
      ConnectionStatusDot,
      CustomTabbar,
      WeatherBackdrop
    },

    setup() {
      const store = useHAStore()
      const currentTime = ref('')
      const noticeVisible = ref(false)
      const showClimateTrends = ref(false)
      let timer = null

      const weatherInfo = computed(() => store.weather)
      const indoorClimate = computed(() => store.indoorClimate)
      const climateTrendCards = computed(() => {
        return store.trendCards.filter((item) => ['temperature', 'humidity', 'pm25'].includes(item.key))
      })
      const alertHighlights = computed(() => store.alertHighlights)
      const notifications = computed(() => store.notifications.slice(0, 20))
      const unreadNotificationCount = computed(() => store.unreadNotificationCount)
      const isRegistryReady = computed(() => store.registry.entities.length > 0)
      const runningDevices = computed(() => {
        return isRegistryReady.value ? store.runningDevices.slice(0, 4) : []
      })
      const purifierActive = computed(() => {
        return isRegistryReady.value && store.runningDevices.some((device) => /空气净化器|air purifier/i.test(device.name))
      })

      const commonDevices = computed(() => {
        if (!isRegistryReady.value) {
          return []
        }

        return [...store.devices]
          .filter((device) => !/backup|home assistant/i.test(device.name))
          .sort((left, right) => {
            if (left.entityCount !== right.entityCount) {
              return right.entityCount - left.entityCount
            }

            if (left.isActive !== right.isActive) {
              return left.isActive ? -1 : 1
            }

            return left.name.localeCompare(right.name, 'zh-Hans-CN')
          })
          .slice(0, 4)
      })

      const temperatureTone = computed(() => {
        const value = Number(indoorClimate.value.temperature)

        if (!Number.isFinite(value)) {
          return 'green'
        }

        if (value >= 20 && value <= 26) {
          return 'green'
        }

        if ((value >= 16 && value < 20) || (value > 26 && value <= 29)) {
          return 'yellow'
        }

        return 'red'
      })

      const humidityTone = computed(() => {
        const value = Number(indoorClimate.value.humidity)

        if (!Number.isFinite(value)) {
          return 'green'
        }

        if (value >= 35 && value <= 60) {
          return 'green'
        }

        if ((value >= 25 && value < 35) || (value > 60 && value <= 70)) {
          return 'yellow'
        }

        return 'red'
      })

      const airQualityLabel = computed(() => {
        const label = String(indoorClimate.value.airQuality || '优')

        if (label.includes('优')) {
          return '优'
        }

        if (label.includes('良')) {
          return '良'
        }

        if (label.includes('差')) {
          return '差'
        }

        return label.length > 3 ? label.slice(0, 3) : label
      })

      const airTone = computed(() => {
        const value = Number(indoorClimate.value.pm25)

        if (!Number.isFinite(value)) {
          const label = String(indoorClimate.value.airQuality || '')

          if (label.includes('差')) {
            return 'red'
          }

          if (label.includes('良')) {
            return 'yellow'
          }

          return 'green'
        }

        if (value <= 35) {
          return 'green'
        }

        if (value <= 75) {
          return 'yellow'
        }

        return 'red'
      })

      const airMetricIcon = computed(() => {
        return airTone.value === 'green' ? 'icon-wind' : 'icon-smog'
      })

      function updateTime() {
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        currentTime.value = `${hours}:${minutes}`
      }

      function formatNumber(value) {
        if (value === null || value === undefined || value === '') {
          return '--'
        }

        const numericValue = Number(value)

        if (!Number.isFinite(numericValue)) {
          return value
        }

        return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1)
      }

      function formatTemperature(value) {
        const display = formatNumber(value)
        return display === '--' ? display : `${display}°`
      }

      function formatPercent(value) {
        const display = formatNumber(value)
        return display === '--' ? display : `${display}%`
      }

      function formatNotificationCount(count) {
        return count > 99 ? '99+' : `${count}`
      }

      async function toggleClimatePanel() {
        if (!showClimateTrends.value && climateTrendCards.value.length === 0 && !store.trendLoading) {
          await store.loadIndoorTrends().catch(() => {})
        }

        showClimateTrends.value = !showClimateTrends.value
      }

      async function syncDashboardData() {
        const tasks = []

        if (!store.registryLoading && store.registry.entities.length === 0) {
          tasks.push(store.loadRegistrySnapshot())
        }

        if (!store.weatherLoading && store.weather.temperature === null) {
          tasks.push(store.loadWeather())
        }

        if (!store.trendLoading && store.trendCards.length === 0) {
          tasks.push(store.loadIndoorTrends())
        }

        if (tasks.length > 0) {
          await Promise.allSettled(tasks)
        }
      }

      function getDeviceRoomLabel(device) {
        return device.roomName || '未分区'
      }

      function getRunningDeviceMeta(device) {
        const roomName = getDeviceRoomLabel(device)

        if (!device.activitySummary) {
          return roomName
        }

        return `${roomName} · ${device.activitySummary}`
      }

      function getDeviceBadgeIcon(device) {
        if (device.isActive) {
          return 'icon-signal'
        }

        return 'icon-sliders'
      }

      function openDevice(device) {
        uni.setStorageSync('search_focus_device_id', device.id)

        uni.switchTab({
          url: '/pages/devices/devices'
        })
      }

      function openDevices() {
        uni.switchTab({
          url: '/pages/devices/devices'
        })
      }

      function openSearch() {
        uni.navigateTo({
          url: '/pages/search/search'
        })
      }

      function openNoticeCenter() {
        noticeVisible.value = true
        store.markNotificationsRead()
        uni.removeStorageSync('open_notification_center')
      }

      function closeNotice() {
        noticeVisible.value = false
      }

      function showNotice() {
        if (noticeVisible.value) {
          closeNotice()
          return
        }

        openNoticeCenter()
      }

      function clearAllNotifications() {
        store.clearNotifications()
      }

      function syncNotificationIntent() {
        if (uni.getStorageSync('open_notification_center')) {
          openNoticeCenter()
        }
      }

      onShow(() => {
        uni.hideTabBar()
        syncDashboardData()
        syncNotificationIntent()
      })

      onMounted(() => {
        updateTime()
        syncDashboardData()
        syncNotificationIntent()
        timer = setInterval(updateTime, 60000)
      })

      onUnmounted(() => {
        if (timer) {
          clearInterval(timer)
        }
      })

      return {
        currentTime,
        weatherInfo,
        indoorClimate,
        climateTrendCards,
        alertHighlights,
        notifications,
        unreadNotificationCount,
        noticeVisible,
        showClimateTrends,
        runningDevices,
        purifierActive,
        commonDevices,
        temperatureTone,
        humidityTone,
        airQualityLabel,
        airTone,
        airMetricIcon,
        formatTemperature,
        formatPercent,
        formatNotificationCount,
        toggleClimatePanel,
        getDeviceRoomLabel,
        getRunningDeviceMeta,
        getDeviceBadgeIcon,
        openDevice,
        openDevices,
        openSearch,
        showNotice,
        closeNotice,
        clearAllNotifications
      }
    }
  }
</script>

<style scoped>
  .home-page {
    --weather-accent: rgba(194, 226, 255, 0.24);
  }

  .home-page::before {
    background:
      radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.14) 0%, transparent 24%),
      radial-gradient(circle at 78% 12%, rgba(182, 226, 255, 0.24) 0%, transparent 24%),
      radial-gradient(circle at 50% 84%, rgba(255, 225, 188, 0.16) 0%, transparent 22%),
      linear-gradient(180deg, #496784 0%, #42607c 44%, #35506a 100%);
  }

  .home-page::after {
    opacity: 0;
  }

  .home-content {
    background: linear-gradient(180deg, rgba(74, 106, 140, 0.12) 0%, rgba(52, 79, 108, 0.2) 100%);
    box-shadow:
      0 24px 60px rgba(7, 15, 28, 0.26),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  .home-header {
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .brand-block {
    min-width: 0;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .weather-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(69, 87, 112, 0.66);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #eff5ff;
    font-size: 13px;
    font-weight: 600;
  }

  .weather-pill .iconfont {
    color: #9fd0ff;
  }

  .brand-note {
    display: block;
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 11px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icon-btn .iconfont {
    font-size: 18px;
  }

  .icon-btn {
    width: 44px;
    height: 44px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    background: rgba(78, 94, 118, 0.36);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .notice-btn {
    position: relative;
  }

  .notice-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: linear-gradient(180deg, #ffcf9d 0%, #ff9c73 100%);
    color: #2f1d14;
    font-size: 10px;
    font-weight: 700;
    box-shadow: 0 8px 18px rgba(255, 152, 104, 0.26);
  }

  .activity-strip {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }

  .alert-card {
    margin-bottom: 14px;
    padding: 12px 14px;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(93, 49, 55, 0.28) 0%, rgba(74, 41, 47, 0.2) 100%);
  }

  .alert-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .alert-title {
    font-size: 13px;
    font-weight: 700;
    color: #ffd2c2;
  }

  .alert-link {
    font-size: 12px;
    color: #ffc285;
  }

  .alert-list {
    display: grid;
    gap: 8px;
  }

  .alert-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .alert-dot {
    width: 7px;
    height: 7px;
    margin-top: 6px;
    border-radius: 50%;
    background: #ff9d88;
    box-shadow: 0 0 10px rgba(255, 157, 136, 0.5);
    flex-shrink: 0;
  }

  .alert-copy {
    font-size: 12px;
    line-height: 1.55;
    color: rgba(255, 237, 230, 0.88);
  }

  .activity-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 8px 10px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(27, 49, 73, 0.54) 0%, rgba(29, 50, 71, 0.46) 100%);
  }

  .activity-icon {
    width: 36px;
    height: 36px;
    font-size: 16px;
    box-shadow: none;
  }

  .activity-copy {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .activity-title {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.92);
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .activity-count {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.56);
  }

  .climate-card {
    padding: 14px 14px 12px;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(21, 48, 78, 0.62) 0%, rgba(26, 48, 73, 0.56) 100%);
    box-shadow:
      0 18px 38px rgba(5, 15, 30, 0.24),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  .climate-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .climate-card-body {
    min-height: 148px;
  }

  .climate-head-side {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .climate-toggle-hint {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .climate-mode-pill {
    color: rgba(255, 255, 255, 0.82);
  }

  .climate-panel {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    min-height: inherit;
  }

  .climate-metric {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 8px;
    border-radius: 18px;
    background: rgba(18, 36, 58, 0.28);
    text-align: center;
    min-height: 148px;
  }

  .metric-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(81, 133, 136, 0.22);
    color: #78f0b4;
    font-size: 20px;
  }

  .metric-value {
    display: block;
    margin-top: 8px;
    font-size: clamp(22px, 4.6vw, 34px);
    line-height: 1;
    font-weight: 700;
    color: #78f0b4;
  }

  .metric-title {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }

  .metric-green .metric-icon,
  .metric-green .metric-value {
    color: #78f0b4;
  }

  .metric-green .metric-icon {
    background: rgba(120, 240, 180, 0.14);
  }

  .metric-yellow .metric-icon,
  .metric-yellow .metric-value {
    color: #ffd26d;
  }

  .metric-yellow .metric-icon {
    background: rgba(255, 210, 109, 0.14);
  }

  .metric-red .metric-icon,
  .metric-red .metric-value {
    color: #ff867d;
  }

  .metric-red .metric-icon {
    background: rgba(255, 134, 125, 0.14);
  }

  .climate-air-metric {
    overflow: hidden;
  }

  .metric-fan-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(120, 240, 180, 0.12);
    color: #78f0b4;
    font-size: 12px;
  }

  .spin-fan {
    animation: fan-spin 1.8s linear infinite;
  }

  .common-section {
    margin-top: 16px;
  }

  .climate-trend-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    min-height: inherit;
  }

  .climate-trend-item {
    display: grid;
    grid-template-rows: auto 1fr auto;
    align-content: start;
    padding: 10px;
    border-radius: 18px;
    background: rgba(11, 24, 40, 0.24);
    min-height: 148px;
    overflow: hidden;
  }

  .climate-trend-head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-height: 40px;
  }

  .climate-trend-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.72);
  }

  .climate-trend-value {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.94);
    line-height: 1.1;
  }

  .climate-trend-bars {
    height: 52px;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    margin-top: 8px;
    padding-top: 2px;
    overflow: hidden;
  }

  .climate-trend-bar {
    flex: 1;
    min-height: 8px;
    border-radius: 999px;
    background: rgba(120, 240, 180, 0.72);
  }

  .climate-trend-note {
    display: block;
    margin-top: 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.54);
  }

  .climate-trend-empty {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 6px;
    min-height: 148px;
    padding: 12px;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.58);
  }

  .trend-yellow .climate-trend-bar {
    background: rgba(255, 210, 109, 0.78);
  }

  .trend-red .climate-trend-bar {
    background: rgba(255, 134, 125, 0.78);
  }

  .common-list {
    display: grid;
    gap: 10px;
  }

  .common-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(20, 48, 79, 0.66) 0%, rgba(28, 53, 81, 0.62) 100%);
  }

  .common-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .common-copy {
    min-width: 0;
  }

  .common-name {
    display: block;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
  }

  .common-room {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.68);
  }

  .common-badge {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: rgba(73, 85, 107, 0.48);
    color: #86ffb4;
    font-size: 18px;
  }

  .empty-card {
    text-align: center;
    padding: 26px 20px;
  }

  .notice-mask {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 24px 12px 96px;
    background: rgba(8, 15, 28, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .notice-panel {
    width: min(100%, 760px);
    max-height: calc(100vh - 126px);
    padding: 12px;
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(20, 28, 43, 0.98) 0%, rgba(26, 36, 54, 0.96) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.38);
  }

  .sheet-handle {
    width: 54px;
    height: 5px;
    margin: 0 auto 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
  }

  .notice-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .notice-copy {
    flex: 1;
    min-width: 0;
  }

  .notice-title {
    display: block;
    font-size: 18px;
    font-weight: 700;
  }

  .notice-subtitle {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.56);
    line-height: 1.5;
  }

  .notice-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.88);
    flex-shrink: 0;
  }

  .notice-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .notice-count {
    color: rgba(255, 255, 255, 0.82);
  }

  .notice-link {
    font-size: 12px;
    color: #ffc285;
  }

  .notice-scroll {
    height: min(54vh, 460px);
  }

  .notice-list {
    display: grid;
    gap: 10px;
    padding-bottom: 2px;
  }

  .notice-item {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
  }

  .notice-item-icon {
    width: 42px;
    height: 42px;
    font-size: 18px;
  }

  .notice-item-copy {
    min-width: 0;
  }

  .notice-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .notice-item-title {
    min-width: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
  }

  .notice-item-time {
    flex-shrink: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.48);
  }

  .notice-item-desc {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.62);
    line-height: 1.5;
  }

  .notice-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .notice-tag {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.08);
  }

  .notice-tag.critical,
  .notice-tag.high {
    color: #ffd9d2;
    background: rgba(255, 126, 108, 0.16);
  }

  .notice-tag.medium {
    color: #ffe5b4;
    background: rgba(255, 194, 133, 0.14);
  }

  .notice-empty {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 30px 18px;
    text-align: center;
  }

  .notice-empty .iconfont {
    font-size: 22px;
    color: rgba(255, 255, 255, 0.68);
  }

  .notice-empty-title {
    font-size: 14px;
    font-weight: 700;
  }

  .notice-empty-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.58);
    line-height: 1.5;
  }

  @keyframes fan-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (min-width: 768px) {
    .home-header {
      align-items: center;
    }

    .activity-strip {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .common-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .notice-panel {
      padding: 14px;
    }

    .climate-trend-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 767px) {
    .home-header {
      gap: 16px;
      align-items: center;
    }

    .header-actions {
      justify-content: flex-end;
    }

    .activity-strip {
      gap: 10px;
    }

    .activity-pill {
      padding: 8px;
    }

    .activity-icon {
      width: 34px;
      height: 34px;
      font-size: 15px;
    }

    .climate-card-head {
      align-items: center;
    }

    .climate-panel {
      gap: 8px;
    }

    .climate-metric {
      padding: 10px 6px;
      border-radius: 16px;
      min-height: 138px;
    }

    .metric-value {
      font-size: 20px;
    }

    .metric-title {
      font-size: 11px;
    }

    .common-card {
      grid-template-columns: auto 1fr 40px;
    }

    .common-badge {
      width: 40px;
      height: 40px;
      justify-self: end;
    }

    .notice-panel {
      padding: 10px;
      border-radius: 24px 24px 22px 22px;
    }

    .notice-mask {
      padding: 16px 10px 92px;
    }

    .notice-scroll {
      height: 58vh;
    }

    .climate-trend-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .climate-trend-item {
      padding: 8px 7px;
      min-height: 138px;
    }

    .climate-trend-label {
      font-size: 11px;
      gap: 4px;
    }

    .climate-trend-value {
      font-size: 12px;
    }

    .climate-trend-bars {
      height: 44px;
      gap: 3px;
      margin-top: 8px;
    }

    .climate-trend-note {
      font-size: 10px;
      margin-top: 6px;
    }

    .climate-toggle-hint {
      display: none;
    }
  }

  @media (max-width: 479px) {
    .weather-pill {
      min-height: 32px;
      padding: 0 10px;
    }

    .activity-title {
      font-size: 11px;
    }
  }
</style>
