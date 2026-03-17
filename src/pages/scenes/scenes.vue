<template>
  <view class="scenes-page">
    <!-- 状态栏 -->
    <view class="status-bar">
      <text>{{ currentTime }}</text>
      <view class="status-icons">
        <text class="iconfont icon-signal"></text>
        <text class="iconfont icon-wifi"></text>
        <text class="iconfont icon-battery-full"></text>
      </view>
    </view>

    <!-- 标题 -->
    <text class="page-title gradient-text">场景</text>

    <!-- 场景网格 -->
    <view class="scene-grid">
      <view 
        v-for="scene in scenes" 
        :key="scene.id"
        class="scene-card"
        @click="executeScene(scene)"
      >
        <text :class="['iconfont', scene.icon]"></text>
        <text class="scene-name">{{ scene.name }}</text>
        <text class="scene-desc">{{ scene.description }}</text>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 场景页面组件
   * 功能: 展示和执行智能家居场景
   */
  import { ref, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()
      
      // 当前时间
      const currentTime = ref('')
      
      // 场景列表 (模拟数据,实际应从 Home Assistant 获取)
      const scenes = ref([
        {
          id: 'scene.leave_home',
          name: '离家',
          icon: 'icon-house',
          description: '关灯、关空调'
        },
        {
          id: 'scene.arrive_home',
          name: '回家',
          icon: 'icon-person-walking',
          description: '开灯、开空调'
        },
        {
          id: 'scene.sleep',
          name: '睡眠',
          icon: 'icon-moon',
          description: '关灯、关窗帘'
        },
        {
          id: 'scene.movie',
          name: '观影',
          icon: 'icon-film',
          description: '灯光变暗'
        },
        {
          id: 'scene.breakfast',
          name: '早餐',
          icon: 'icon-mug-saucer',
          description: '咖啡机、灯光'
        },
        {
          id: 'scene.reading',
          name: '阅读',
          icon: 'icon-book-open',
          description: '阅读灯、窗帘'
        }
      ])
      
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
       * 执行场景
       * @param {object} scene - 场景对象
       */
      async function executeScene(scene) {
        try {
          // 显示加载提示
          uni.showLoading({
            title: '执行中...'
          })
          
          // 调用场景服务
          await store.executeScene(scene.id)
          
          uni.hideLoading()
          
          uni.showToast({
            title: `${scene.name}模式已启动`,
            icon: 'success'
          })
        } catch (error) {
          uni.hideLoading()
          
          uni.showToast({
            title: '执行失败',
            icon: 'none'
          })
          
          console.error('执行场景失败:', error)
        }
      }
      
      /**
       * 加载场景列表
       */
      async function loadScenes() {
        try {
          // 从 Home Assistant 获取场景实体
          const allEntities = Array.from(store.entities.values())
          const sceneEntities = allEntities.filter(e => e.entity_id.startsWith('scene.'))
          
          if (sceneEntities.length > 0) {
            scenes.value = sceneEntities.map(entity => ({
              id: entity.entity_id,
              name: entity.attributes.friendly_name || entity.entity_id,
              icon: entity.attributes.icon || 'icon-star',
              description: entity.attributes.description || ''
            }))
          }
        } catch (error) {
          console.error('加载场景失败:', error)
        }
      }
      
      onMounted(() => {
        updateTime()
        setInterval(updateTime, 60000)
        
        // 加载场景
        loadScenes()
      })
      
      return {
        currentTime,
        scenes,
        executeScene
      }
    }
  }
</script>

<style scoped>
  .scenes-page {
    padding: 20px 18px 24px 18px;
  }

  .page-title {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 10px;
    display: block;
  }

  .scene-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .scene-card {
    background: rgba(30, 30, 42, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 28px;
    padding: 20px 12px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .scene-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  }

  .scene-card:active {
    background: rgba(30, 30, 42, 0.5);
    transform: scale(0.98);
  }

  .scene-card .iconfont {
    font-size: 32px;
    color: #ffcf9a;
    margin-bottom: 10px;
    display: block;
    filter: drop-shadow(0 0 6px #ffae6d);
  }

  .scene-name {
    font-size: 18px;
    font-weight: 500;
    display: block;
    margin-bottom: 4px;
  }

  .scene-desc {
    font-size: 12px;
    opacity: 0.6;
    display: block;
  }
</style>
