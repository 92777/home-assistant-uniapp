<template>
  <view class="custom-tabbar">
    <view 
      v-for="(item, index) in tabs" 
      :key="index"
      :class="['tabbar-item', { active: currentIndex === index }]"
      @click="switchTab(index)"
    >
      <text :class="['iconfont', item.icon]"></text>
      <text class="tabbar-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script>
  /**
   * 自定义底部导航组件
   * 功能: 提供底部导航切换功能
   */
  import { ref, watch } from 'vue'

  export default {
    props: {
      current: {
        type: Number,
        default: 0
      }
    },
    
    emits: ['change'],
    
    setup(props, { emit }) {
      // 导航项配置
      const tabs = ref([
        {
          pagePath: '/pages/home/home',
          text: '首页',
          icon: 'icon-house'
        },
        {
          pagePath: '/pages/devices/devices',
          text: '设备',
          icon: 'icon-microchip'
        },
        {
          pagePath: '/pages/scenes/scenes',
          text: '场景',
          icon: 'icon-compass'
        },
        {
          pagePath: '/pages/profile/profile',
          text: '我的',
          icon: 'icon-user'
        }
      ])
      
      // 当前选中索引
      const currentIndex = ref(props.current)
      
      // 监听 props 变化
      watch(() => props.current, (newVal) => {
        currentIndex.value = newVal
      })
      
      /**
       * 切换标签页
       * @param {number} index - 标签索引
       */
      function switchTab(index) {
        if (currentIndex.value === index) {
          return
        }
        
        currentIndex.value = index
        
        // 切换页面
        uni.switchTab({
          url: tabs.value[index].pagePath
        })
        
        // 触发事件
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
  .custom-tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    background: rgba(20, 20, 30, 0.4);
    backdrop-filter: blur(18px) saturate(200%);
    border-radius: 42px;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    margin: 8px 18px;
    z-index: 999;
  }

  .tabbar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tabbar-item .iconfont {
    font-size: 22px;
    margin-bottom: 4px;
  }

  .tabbar-item.active {
    color: #ffc285;
    text-shadow: 0 0 8px #ffae5e;
  }
</style>
