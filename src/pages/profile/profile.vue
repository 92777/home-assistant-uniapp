<template>
  <view class="page-shell profile-page">
    <WeatherBackdrop />
    <view class="page-content">
      <view class="status-bar">
        <text>{{ currentTime }}</text>
        <view class="status-icons">
          <ConnectionStatusDot />
          <text class="iconfont icon-signal"></text>
          <text class="iconfont icon-wifi"></text>
          <text class="iconfont icon-battery-full"></text>
        </view>
      </view>

      <view class="page-header">
        <view>
          <text class="page-title gradient-text">我的</text>
          <text class="page-subtitle">连接状态、家庭入口和应用偏好都放在这里。</text>
        </view>
        <text :class="['glass-pill', isConnected ? 'connected-pill' : 'disconnected-pill']">
          {{ isConnected ? '已连接' : '未连接' }}
        </text>
      </view>

      <view class="glass-card profile-hero">
        <view class="profile-top">
          <view class="profile-avatar">
            <text class="iconfont icon-user"></text>
          </view>
          <view class="profile-copy">
            <text class="profile-name">{{ userName }}</text>
            <text class="profile-role">{{ userRole }}</text>
          </view>
        </view>
        <view class="profile-tags">
          <text class="glass-pill">
            <text class="iconfont icon-house-circle"></text>
            {{ familyCount }} 个家庭
          </text>
          <text class="glass-pill">
            <text class="iconfont icon-server"></text>
            HA {{ haVersion }}
          </text>
        </view>
      </view>

      <view class="glass-card dashboard-card">
        <view class="dashboard-item">
          <text class="dashboard-value">{{ entityCount }}</text>
          <text class="dashboard-label">实体总数</text>
        </view>
        <view class="dashboard-item">
          <text class="dashboard-value">{{ activeEntityCount }}</text>
          <text class="dashboard-label">活跃设备</text>
        </view>
        <view class="dashboard-item">
          <text class="dashboard-value">{{ isConnected ? '稳定' : '离线' }}</text>
          <text class="dashboard-label">连接质量</text>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">设备健康</text>
          <text class="section-link">{{ deviceHealth.summary.total }} 项待处理</text>
        </view>

        <view class="glass-card health-card">
          <view class="health-stats">
            <view class="health-pill">
              <text class="health-pill-value">{{ deviceHealth.summary.offline }}</text>
              <text class="health-pill-label">离线</text>
            </view>
            <view class="health-pill">
              <text class="health-pill-value">{{ deviceHealth.summary.battery }}</text>
              <text class="health-pill-label">低电量</text>
            </view>
            <view class="health-pill">
              <text class="health-pill-value">{{ deviceHealth.summary.fault }}</text>
              <text class="health-pill-label">故障</text>
            </view>
          </view>

          <view v-if="deviceHealth.issues.length > 0" class="health-list">
            <view
              v-for="item in healthIssues"
              :key="item.id"
              class="health-item"
            >
              <view :class="['device-icon', 'health-icon', item.tone]">
                <text :class="['iconfont', item.icon]"></text>
              </view>
              <view class="health-copy">
                <text class="health-device">{{ item.deviceName }}</text>
                <text class="health-room">{{ item.roomName }}</text>
                <text class="health-desc">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <view v-else class="health-empty">
            <text class="iconfont icon-circle-info"></text>
            <text>当前没有明显的离线、低电量或故障设备。</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">快捷入口</text>
          <text class="section-link">偏好设置</text>
        </view>

        <view class="menu-list">
          <view
            v-for="item in menuItems"
            :key="item.id"
            class="glass-card menu-item"
            @click="handleMenuClick(item)"
          >
            <view :class="['menu-icon', item.tone]">
              <text :class="['iconfont', item.icon]"></text>
            </view>
            <view class="menu-copy">
              <text class="menu-text">{{ item.name }}</text>
              <text class="menu-desc">{{ item.desc }}</text>
            </view>
            <text class="iconfont icon-chevron-right menu-arrow"></text>
          </view>
        </view>
      </view>

      <view class="glass-card support-card">
        <view>
          <text class="support-title">帮助与反馈</text>
          <text class="support-desc">需要重新连接、补充功能或者优化体验，都可以从这里继续完善。</text>
        </view>
        <text class="iconfont icon-circle-question"></text>
      </view>
    </view>

    <CustomTabbar :current="3" />
  </view>
</template>

<script>
  /**
   * 我的页面
   * 功能: 展示连接状态、用户信息和设置入口
   */
  import { ref, computed, onMounted, onUnmounted } from 'vue'
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
      const userName = ref('李一舟')
      const userRole = ref('家庭管理员 · 设备联动维护中')
      const familyCount = ref(2)
      let timer = null

      const isConnected = computed(() => store.isConnected)
      const haVersion = computed(() => store.config?.version || '未知')
      const deviceHealth = computed(() => store.deviceHealth)
      const healthIssues = computed(() => store.deviceHealth.issues.slice(0, 4))
      const menuItems = computed(() => [
        {
          id: 'family',
          name: '家庭管理',
          desc: '成员、空间和权限设置',
          icon: 'icon-house-circle',
          tone: 'warm'
        },
        {
          id: 'devices',
          name: '设备设置',
          desc: '常用设备、排序和默认控制',
          icon: 'icon-gear',
          tone: 'cool'
        },
        {
          id: 'notifications',
          name: '消息通知',
          desc: store.unreadNotificationCount > 0
            ? `有 ${store.unreadNotificationCount} 条新消息待查看`
            : '设备状态变化会实时同步到通知中心',
          icon: 'icon-bell',
          tone: 'accent'
        },
        {
          id: 'help',
          name: '帮助与反馈',
          desc: '文档、反馈和问题排查',
          icon: 'icon-circle-question',
          tone: 'safe'
        }
      ])
      const entityCount = computed(() => Array.from(store.entities.values()).length)
      const activeEntityCount = computed(() => {
        return Array.from(store.entities.values()).filter((entity) => {
          return ['on', 'cool', 'heat', 'running', 'locked'].includes(entity.state)
        }).length
      })

      function updateTime() {
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        currentTime.value = `${hours}:${minutes}`
      }

      function handleMenuClick(item) {
        if (item.id === 'notifications') {
          uni.setStorageSync('open_notification_center', '1')
          uni.switchTab({
            url: '/pages/home/home'
          })
          return
        }

        const toastMap = {
          family: '家庭管理功能开发中',
          devices: '设备设置功能开发中',
          help: '帮助与反馈功能开发中'
        }

        uni.showToast({
          title: toastMap[item.id],
          icon: 'none'
        })
      }

      onShow(() => {
        uni.hideTabBar()
      })

      onMounted(() => {
        updateTime()
        timer = setInterval(updateTime, 60000)
      })

      onUnmounted(() => {
        if (timer) {
          clearInterval(timer)
        }
      })

      return {
        currentTime,
        userName,
        userRole,
        familyCount,
        menuItems,
        isConnected,
        haVersion,
        deviceHealth,
        healthIssues,
        entityCount,
        activeEntityCount,
        handleMenuClick
      }
    }
  }
</script>

<style scoped>
  .connected-pill {
    color: #aaffaa;
  }

  .disconnected-pill {
    color: #ffb4b4;
  }

  .profile-hero {
    margin-bottom: 18px;
  }

  .profile-top {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .profile-avatar {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 200, 150, 0.24);
    border: 1px solid rgba(255, 200, 150, 0.28);
    color: #ffc89c;
    font-size: 34px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  }

  .profile-copy {
    flex: 1;
  }

  .profile-name {
    display: block;
    font-size: 24px;
    font-weight: 600;
  }

  .profile-role {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.68);
  }

  .profile-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .dashboard-card {
    display: flex;
    gap: 12px;
    margin-bottom: 18px;
  }

  .dashboard-item {
    flex: 1;
    text-align: center;
  }

  .dashboard-value {
    display: block;
    font-size: 24px;
    font-weight: 600;
  }

  .dashboard-label {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .health-card {
    padding: 14px;
  }

  .health-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .health-pill {
    padding: 12px 10px;
    border-radius: 18px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
  }

  .health-pill-value {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: #ffc285;
  }

  .health-pill-label {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
  }

  .health-list {
    display: grid;
    gap: 10px;
  }

  .health-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.04);
  }

  .health-icon.danger {
    background: rgba(255, 126, 108, 0.18);
    color: #ffb4a2;
    border-color: rgba(255, 126, 108, 0.3);
  }

  .health-copy {
    min-width: 0;
  }

  .health-device {
    display: block;
    font-size: 14px;
    font-weight: 700;
  }

  .health-room {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.48);
  }

  .health-desc {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.66);
  }

  .health-empty {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 18px 12px 6px;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .menu-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
  }

  .menu-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    font-size: 20px;
  }

  .menu-icon.warm {
    background: rgba(255, 194, 133, 0.16);
    color: #ffc285;
  }

  .menu-icon.cool {
    background: rgba(157, 201, 255, 0.16);
    color: #9ac9ff;
  }

  .menu-icon.accent {
    background: rgba(215, 176, 255, 0.16);
    color: #d7b0ff;
  }

  .menu-icon.safe {
    background: rgba(188, 245, 163, 0.16);
    color: #bcf5a3;
  }

  .menu-copy {
    flex: 1;
    min-width: 0;
  }

  .menu-text {
    display: block;
    font-size: 16px;
    font-weight: 600;
  }

  .menu-desc {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.62);
  }

  .menu-arrow {
    color: rgba(255, 255, 255, 0.45);
    font-size: 14px;
  }

  .support-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 20px;
  }

  .support-title {
    display: block;
    font-size: 17px;
    font-weight: 600;
  }

  .support-desc {
    display: block;
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.6;
  }

  .support-card .iconfont {
    font-size: 30px;
    color: #ffd9ad;
  }
</style>
