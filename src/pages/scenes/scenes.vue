<template>
  <view class="page-shell scenes-page">
    <WeatherBackdrop />
    <view class="page-content scenes-content">
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
          <text class="page-title gradient-text">场景</text>
          <text class="page-subtitle">把可执行的场景、脚本和常用服务收进同一个执行中心。</text>
        </view>
      </view>

      <view v-if="featuredAction" class="glass-card featured-action-card" @click="executeAction(featuredAction)">
        <view class="featured-action-copy">
          <text class="featured-tag">{{ actionTag(featuredAction) }}</text>
          <text class="featured-title">{{ featuredAction.title }}</text>
          <text class="featured-desc">{{ featuredAction.description }}</text>
        </view>
        <view :class="['featured-action-icon', featuredAction.tone]">
          <view v-if="isActionPending(featuredAction.id)" class="action-spinner"></view>
          <text v-else :class="['iconfont', featuredAction.icon]"></text>
        </view>
      </view>

      <view v-if="sceneActions.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">场景</text>
          <text class="section-link">{{ sceneActions.length }} 个</text>
        </view>
        <view class="action-grid">
          <view
            v-for="action in sceneActions"
            :key="action.id"
            class="glass-card action-card"
            @click="executeAction(action)"
          >
            <view class="action-card-head">
              <view :class="['device-icon', 'action-icon', action.tone]">
                <text :class="['iconfont', action.icon]"></text>
              </view>
              <text class="glass-pill">{{ actionTag(action) }}</text>
            </view>
            <text class="action-title">{{ action.title }}</text>
            <text class="action-desc">{{ action.description }}</text>
            <view class="action-status">
              <text v-if="isActionPending(action.id)">执行中...</text>
              <text v-else-if="getActionExecution(action.id)">{{ getActionExecution(action.id).timeLabel }} {{ getActionExecution(action.id).status === 'success' ? '成功' : '失败' }}</text>
              <text v-else>待执行</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="scriptActions.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">脚本</text>
          <text class="section-link">{{ scriptActions.length }} 个</text>
        </view>
        <view class="action-grid">
          <view
            v-for="action in scriptActions"
            :key="action.id"
            class="glass-card action-card"
            @click="executeAction(action)"
          >
            <view class="action-card-head">
              <view :class="['device-icon', 'action-icon', action.tone]">
                <text :class="['iconfont', action.icon]"></text>
              </view>
              <text class="glass-pill">{{ actionTag(action) }}</text>
            </view>
            <text class="action-title">{{ action.title }}</text>
            <text class="action-desc">{{ action.description }}</text>
            <view class="action-status">
              <text v-if="isActionPending(action.id)">执行中...</text>
              <text v-else-if="getActionExecution(action.id)">{{ getActionExecution(action.id).timeLabel }} {{ getActionExecution(action.id).status === 'success' ? '成功' : '失败' }}</text>
              <text v-else>待执行</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title">常用服务</text>
          <text class="section-link">{{ serviceActions.length }} 个动作</text>
        </view>

        <view v-if="serviceActions.length > 0" class="action-grid">
          <view
            v-for="action in serviceActions"
            :key="action.id"
            class="glass-card action-card"
            @click="executeAction(action)"
          >
            <view class="action-card-head">
              <view :class="['device-icon', 'action-icon', action.tone]">
                <text :class="['iconfont', action.icon]"></text>
              </view>
              <view class="action-meta">
                <text v-if="isActionPending(action.id)" class="action-meta-text">执行中...</text>
                <text v-else-if="getActionExecution(action.id)" class="action-meta-text">
                  {{ getActionExecution(action.id).timeLabel }}
                </text>
                <text v-else class="action-meta-text">待命</text>
              </view>
            </view>
            <text class="action-title">{{ action.title }}</text>
            <text class="action-desc">{{ action.description }}</text>
            <view class="action-footer">
              <text class="action-kind">{{ actionTag(action) }}</text>
              <view v-if="isActionPending(action.id)" class="action-spinner small"></view>
              <text v-else class="iconfont icon-circle-play action-play"></text>
            </view>
          </view>
        </view>

        <view v-else class="glass-card empty-card">
          <text class="empty-text">暂时还没有可执行的服务动作。</text>
        </view>
      </view>

      <view v-if="recentExecutions.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">最近结果</text>
          <text class="section-link">本地记录</text>
        </view>

        <view class="glass-card result-card">
          <view
            v-for="item in recentExecutions"
            :key="item.id"
            class="result-item"
          >
            <view :class="['device-icon', 'result-icon', item.tone]">
              <text :class="['iconfont', item.icon]"></text>
            </view>
            <view class="result-copy">
              <text class="result-title">{{ item.title }}</text>
              <text class="result-desc">{{ item.message }}</text>
            </view>
            <text :class="['result-time', item.status]">{{ item.timeLabel }}</text>
          </view>
        </view>
      </view>
    </view>

    <CustomTabbar :current="1" />
  </view>
</template>

<script>
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
      let timer = null

      const sceneActions = computed(() => store.executionCenter.scenes)
      const scriptActions = computed(() => store.executionCenter.scripts)
      const serviceActions = computed(() => store.executionCenter.services)
      const allActions = computed(() => [
        ...sceneActions.value,
        ...scriptActions.value,
        ...serviceActions.value
      ])
      const featuredAction = computed(() => allActions.value[0] || null)
      const recentExecutions = computed(() => {
        return Array.from(store.actionExecutions.entries())
          .map(([id, record]) => {
            const action = allActions.value.find((item) => item.id === id)

            if (!action) {
              return null
            }

            return {
              id,
              title: action.title,
              icon: action.icon,
              tone: action.tone,
              ...record
            }
          })
          .filter(Boolean)
          .sort((left, right) => right.timestamp - left.timestamp)
          .slice(0, 4)
      })

      function updateTime() {
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        currentTime.value = `${hours}:${minutes}`
      }

      function actionTag(action) {
        if (action.kind === 'scene') {
          return '场景'
        }

        if (action.kind === 'script') {
          return '脚本'
        }

        return '服务'
      }

      function isActionPending(actionId) {
        return store.isActionPending(actionId)
      }

      function getActionExecution(actionId) {
        return store.getActionExecution(actionId)
      }

      async function executeAction(action) {
        if (!action || isActionPending(action.id)) {
          return
        }

        try {
          await store.executeDashboardAction(action)
          uni.showToast({
            title: `${action.title}已执行`,
            icon: 'success'
          })
        } catch (error) {
          uni.showToast({
            title: error.message || '执行失败',
            icon: 'none'
          })
        }
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
        sceneActions,
        scriptActions,
        serviceActions,
        featuredAction,
        recentExecutions,
        actionTag,
        isActionPending,
        getActionExecution,
        executeAction
      }
    }
  }
</script>

<style scoped>
  .scenes-content {
    background: linear-gradient(180deg, rgba(34, 54, 76, 0.2) 0%, rgba(28, 45, 66, 0.28) 100%);
    box-shadow:
      0 24px 60px rgba(7, 15, 28, 0.38),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  .featured-action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
    padding: 18px;
  }

  .featured-action-copy {
    flex: 1;
  }

  .featured-tag {
    display: inline-flex;
    min-height: 24px;
    padding: 0 10px;
    align-items: center;
    border-radius: 999px;
    background: rgba(255, 194, 133, 0.16);
    border: 1px solid rgba(255, 194, 133, 0.24);
    color: #ffd7ae;
    font-size: 12px;
  }

  .featured-title {
    display: block;
    margin-top: 12px;
    font-size: 22px;
    font-weight: 700;
  }

  .featured-desc {
    display: block;
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.6;
  }

  .featured-action-icon {
    width: 62px;
    height: 62px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    font-size: 26px;
    flex-shrink: 0;
    background: rgba(255, 200, 150, 0.16);
    color: #ffc89c;
  }

  .featured-action-icon.cool {
    background: rgba(90, 180, 255, 0.16);
    color: #9ac9ff;
  }

  .featured-action-icon.accent {
    background: rgba(200, 150, 255, 0.16);
    color: #d7b0ff;
  }

  .featured-action-icon.safe {
    background: rgba(188, 245, 163, 0.16);
    color: #bcf5a3;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .action-card {
    padding: 14px;
    border-radius: 22px;
  }

  .action-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }

  .action-icon {
    width: 46px;
    height: 46px;
    font-size: 20px;
  }

  .action-title {
    display: block;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.35;
  }

  .action-desc {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.62);
    line-height: 1.55;
    min-height: 38px;
  }

  .action-status,
  .action-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.52);
  }

  .action-meta {
    min-height: 26px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }

  .action-meta-text,
  .action-kind {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }

  .action-play {
    font-size: 18px;
    color: #ffc285;
  }

  .action-spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255, 194, 133, 0.22);
    border-top-color: #ffc285;
    animation: action-spin 0.8s linear infinite;
  }

  .action-spinner.small {
    width: 16px;
    height: 16px;
  }

  .result-card {
    padding: 12px;
    border-radius: 22px;
  }

  .result-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
  }

  .result-item + .result-item {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .result-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .result-copy {
    min-width: 0;
  }

  .result-title {
    display: block;
    font-size: 14px;
    font-weight: 700;
  }

  .result-desc {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .result-time {
    flex-shrink: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.48);
  }

  .result-time.success {
    color: #bcf5a3;
  }

  .result-time.error {
    color: #ffb4b4;
  }

  @keyframes action-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 767px) {
    .action-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .featured-title {
      font-size: 18px;
    }
  }
</style>
