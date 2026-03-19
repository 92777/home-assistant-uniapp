<template>
  <view class="custom-tabbar-shell">
    <view class="custom-tabbar">
      <view
        v-for="(item, index) in tabs"
        :key="item.pagePath"
        :class="['tabbar-item', { active: currentIndex === index }]"
        @click="switchTab(index)"
      >
        <text :class="['iconfont', item.icon]"></text>
        <text class="tabbar-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 自定义底部导航
   * 功能: 提供悬浮毛玻璃底部导航切换
   */
  import { computed, ref } from 'vue'

  export default {
    props: {
      current: {
        type: Number,
        default: 0
      }
    },

    emits: ['change'],

    setup(props, { emit }) {
      const tabs = ref([
        {
          pagePath: '/pages/home/home',
          text: '首页',
          icon: 'icon-house'
        },
        {
          pagePath: '/pages/scenes/scenes',
          text: '场景',
          icon: 'icon-compass'
        },
        {
          pagePath: '/pages/devices/devices',
          text: '设备',
          icon: 'icon-microchip'
        },
        {
          pagePath: '/pages/profile/profile',
          text: '我的',
          icon: 'icon-user'
        }
      ])

      const isSwitching = ref(false)

      function normalizePath(path = '') {
        return path.startsWith('/') ? path : `/${path}`
      }

      function getActivePath() {
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        return currentPage ? normalizePath(currentPage.route) : ''
      }

      const currentIndex = computed(() => {
        const matchedIndex = tabs.value.findIndex((item) => item.pagePath === getActivePath())
        return matchedIndex > -1 ? matchedIndex : props.current
      })

      function switchTab(index) {
        if (isSwitching.value) {
          return
        }

        const targetPath = tabs.value[index].pagePath

        if (targetPath === getActivePath()) {
          return
        }

        isSwitching.value = true

        uni.switchTab({
          url: targetPath,
          complete: () => {
            setTimeout(() => {
              isSwitching.value = false
            }, 160)
          }
        })

        emit('change', index)
      }

      return {
        tabs,
        currentIndex,
        switchTab
      }
    }
  }
</script>

<style scoped>
  .custom-tabbar-shell {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    padding: 0 18px calc(12px + env(safe-area-inset-bottom));
    pointer-events: none;
  }

  .custom-tabbar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 6px;
    padding: 10px 14px;
    border-radius: 42px;
    background: rgba(20, 20, 30, 0.44);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.4), 0 20px 35px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(18px) saturate(200%);
    -webkit-backdrop-filter: blur(18px) saturate(200%);
    pointer-events: auto;
  }

  .tabbar-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 48px;
    color: rgba(255, 255, 255, 0.68);
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .tabbar-item .iconfont {
    font-size: 22px;
  }

  .tabbar-item.active {
    color: #ffc285;
    text-shadow: 0 0 8px rgba(255, 174, 94, 0.75);
  }

  .tabbar-text {
    line-height: 1;
  }
</style>
