<template>
  <view class="profile-page">
    <!-- 状态栏 -->
    <view class="status-bar">
      <text>{{ currentTime }}</text>
      <view class="status-icons">
        <text class="iconfont icon-signal"></text>
        <text class="iconfont icon-wifi"></text>
        <text class="iconfont icon-battery-full"></text>
      </view>
    </view>

    <!-- 用户信息卡片 -->
    <view class="glass-card profile-header">
      <view class="profile-avatar">
        <text class="iconfont icon-user"></text>
      </view>
      <view class="profile-info">
        <text class="profile-name">{{ userName }}</text>
        <text class="profile-role">{{ userRole }}</text>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-list">
      <view 
        v-for="item in menuItems" 
        :key="item.id"
        class="menu-item"
        @click="handleMenuClick(item)"
      >
        <text :class="['iconfont', item.icon]"></text>
        <text class="menu-text">{{ item.name }}</text>
        <text class="iconfont icon-chevron-right menu-arrow"></text>
      </view>
    </view>

    <!-- 连接状态 -->
    <view class="connection-status">
      <view class="status-item">
        <text class="status-label">连接状态</text>
        <text :class="['status-value', isConnected ? 'connected' : 'disconnected']">
          {{ isConnected ? '已连接' : '未连接' }}
        </text>
      </view>
      <view class="status-item">
        <text class="status-label">Home Assistant</text>
        <text class="status-value">{{ haVersion }}</text>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 我的页面组件
   * 功能: 展示用户信息、设置菜单和连接状态
   */
  import { ref, computed, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()
      
      // 当前时间
      const currentTime = ref('')
      
      // 用户信息
      const userName = ref('李一舟')
      const userRole = ref('家庭管理员 · 2个家庭')
      
      // 菜单项
      const menuItems = ref([
        {
          id: 'family',
          name: '家庭管理',
          icon: 'icon-house-circle'
        },
        {
          id: 'devices',
          name: '设备设置',
          icon: 'icon-gear'
        },
        {
          id: 'notifications',
          name: '消息通知',
          icon: 'icon-bell'
        },
        {
          id: 'help',
          name: '帮助与反馈',
          icon: 'icon-circle-question'
        }
      ])
      
      // 连接状态
      const isConnected = computed(() => store.isConnected)
      const haVersion = computed(() => store.config?.version || '未知')
      
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
       * 处理菜单点击
       * @param {object} item - 菜单项
       */
      function handleMenuClick(item) {
        switch (item.id) {
          case 'family':
            uni.showToast({
              title: '家庭管理功能开发中',
              icon: 'none'
            })
            break
          case 'devices':
            uni.showToast({
              title: '设备设置功能开发中',
              icon: 'none'
            })
            break
          case 'notifications':
            uni.showToast({
              title: '消息通知功能开发中',
              icon: 'none'
            })
            break
          case 'help':
            uni.showToast({
              title: '帮助与反馈功能开发中',
              icon: 'none'
            })
            break
        }
      }
      
      onMounted(() => {
        updateTime()
        setInterval(updateTime, 60000)
      })
      
      return {
        currentTime,
        userName,
        userRole,
        menuItems,
        isConnected,
        haVersion,
        handleMenuClick
      }
    }
  }
</script>

<style scoped>
  .profile-page {
    padding: 20px 18px 24px 18px;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 10px;
  }

  .profile-avatar {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: rgba(255, 200, 150, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 36px;
    color: #ffc89c;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .profile-info {
    flex: 1;
  }

  .profile-name {
    font-size: 22px;
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }

  .profile-role {
    font-size: 14px;
    opacity: 0.7;
    display: block;
  }

  .menu-list {
    margin-top: 16px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    padding: 16px 12px;
    background: rgba(30, 30, 42, 0.4);
    border-radius: 24px;
    margin-bottom: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: all 0.2s;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .menu-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  }

  .menu-item:active {
    background: rgba(30, 30, 42, 0.5);
  }

  .menu-item .iconfont:first-child {
    width: 32px;
    font-size: 20px;
    color: #ffc285;
  }

  .menu-text {
    flex: 1;
    font-size: 16px;
  }

  .menu-arrow {
    opacity: 0.5;
    font-size: 14px;
  }

  .connection-status {
    margin-top: 24px;
    padding: 16px;
    background: rgba(30, 30, 42, 0.4);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }

  .status-label {
    font-size: 14px;
    opacity: 0.7;
  }

  .status-value {
    font-size: 14px;
    font-weight: 500;
  }

  .status-value.connected {
    color: #aaffaa;
  }

  .status-value.disconnected {
    color: #ffaaaa;
  }
</style>
