<template>
  <view class="device-card glass-card" @click="handleClick">
    <!-- 设备图标和基本信息 -->
    <view class="device-card-header">
      <view :class="['device-icon', { 'device-on': isOn }]">
        <text :class="['iconfont', iconClass]"></text>
      </view>
      <view class="device-info">
        <text class="device-name">{{ name }}</text>
        <text class="device-status">{{ statusText }}</text>
      </view>
      <!-- 状态徽章 -->
      <view v-if="showBadge" :class="['status-badge', badgeClass]">
        {{ badgeText }}
      </view>
    </view>

    <!-- 亮度进度条 (灯光) -->
    <view v-if="showBrightness" class="progress-bar">
      <view 
        class="progress-fill" 
        :style="{ width: brightnessPercent + '%' }"
      ></view>
    </view>

    <!-- 设备详情 (空调等) -->
    <view v-if="showDetails" class="device-detail">
      {{ detailText }}
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-overlay">
      <text class="iconfont icon-spinner"></text>
    </view>
  </view>
</template>

<script>
  /**
   * 设备卡片组件
   * 功能: 展示设备信息和状态,支持点击控制
   */
  import { computed, ref } from 'vue'

  export default {
    props: {
      // 设备对象
      device: {
        type: Object,
        required: true
      },
      // 是否显示徽章
      showBadge: {
        type: Boolean,
        default: false
      },
      // 是否可点击
      clickable: {
        type: Boolean,
        default: true
      }
    },

    emits: ['click', 'toggle'],

    setup(props, { emit }) {
      const loading = ref(false)

      /**
       * 设备 ID
       */
      const entityId = computed(() => props.device.entity_id)

      /**
       * 设备域名
       */
      const domain = computed(() => {
        return entityId.value.split('.')[0]
      })

      /**
       * 设备名称
       */
      const name = computed(() => {
        return props.device.attributes?.friendly_name || entityId.value
      })

      /**
       * 设备状态
       */
      const state = computed(() => props.device.state)

      /**
       * 是否开启
       */
      const isOn = computed(() => {
        return state.value === 'on' || state.value === 'running'
      })

      /**
       * 图标类名
       */
      const iconClass = computed(() => {
        const iconMap = {
          light: 'icon-lightbulb',
          switch: 'icon-toggle-on',
          climate: 'icon-snowflake',
          cover: 'icon-curtain',
          lock: 'icon-lock',
          fan: 'icon-fan',
          media_player: 'icon-tv',
          sensor: 'icon-thermometer',
          binary_sensor: 'icon-motion-sensor'
        }
        return iconMap[domain.value] || 'icon-microchip'
      })

      /**
       * 状态文本
       */
      const statusText = computed(() => {
        if (domain.value === 'light') {
          return isOn.value ? '已开启' : '已关闭'
        }
        
        if (domain.value === 'climate') {
          const modeMap = {
            'off': '关闭',
            'heat': '制热',
            'cool': '制冷',
            'auto': '自动',
            'dry': '除湿',
            'fan_only': '送风'
          }
          return modeMap[state.value] || state.value
        }
        
        if (domain.value === 'cover') {
          const position = props.device.attributes?.current_position || 0
          return `开合 ${position}%`
        }
        
        if (domain.value === 'sensor') {
          const unit = props.device.attributes?.unit_of_measurement || ''
          return `${state.value} ${unit}`.trim()
        }
        
        return isOn.value ? '已开启' : '已关闭'
      })

      /**
       * 是否显示亮度条
       */
      const showBrightness = computed(() => {
        return domain.value === 'light' && isOn.value && props.device.attributes?.brightness
      })

      /**
       * 亮度百分比
       */
      const brightnessPercent = computed(() => {
        if (!showBrightness.value) return 0
        return Math.round((props.device.attributes.brightness / 255) * 100)
      })

      /**
       * 是否显示详情
       */
      const showDetails = computed(() => {
        return domain.value === 'climate' && isOn.value
      })

      /**
       * 详情文本
       */
      const detailText = computed(() => {
        if (domain.value === 'climate') {
          const temp = props.device.attributes?.temperature || '--'
          const fanMode = props.device.attributes?.fan_mode || '自动'
          return `${temp}°C · ${fanMode}`
        }
        return ''
      })

      /**
       * 徽章文本
       */
      const badgeText = computed(() => {
        if (!props.showBadge) return ''
        return isOn.value ? 'ON' : 'OFF'
      })

      /**
       * 徽章类名
       */
      const badgeClass = computed(() => {
        return isOn.value ? 'badge-on' : 'badge-off'
      })

      /**
       * 处理点击
       */
      async function handleClick() {
        if (!props.clickable || loading.value) return

        loading.value = true
        
        emit('click', props.device)
        emit('toggle', props.device)

        // 模拟加载延迟
        setTimeout(() => {
          loading.value = false
        }, 500)
      }

      return {
        loading,
        name,
        state,
        isOn,
        iconClass,
        statusText,
        showBrightness,
        brightnessPercent,
        showDetails,
        detailText,
        badgeText,
        badgeClass,
        handleClick
      }
    }
  }
</script>

<style scoped>
  .device-card {
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .device-card:active {
    transform: scale(0.98);
  }

  .device-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .device-icon {
    width: 44px;
    height: 44px;
    border-radius: 28px;
    background: rgba(255, 165, 100, 0.2);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    border: 1px solid rgba(255, 200, 150, 0.4);
    color: #ffc89c;
    transition: all 0.3s ease;
  }

  .device-icon.device-on {
    background: rgba(255, 200, 100, 0.3);
    box-shadow: 0 0 20px rgba(255, 200, 100, 0.4);
  }

  .device-info {
    flex: 1;
  }

  .device-name {
    font-size: 16px;
    font-weight: 600;
    display: block;
    margin-bottom: 2px;
  }

  .device-status {
    font-size: 13px;
    opacity: 0.7;
    display: block;
  }

  .status-badge {
    padding: 4px 10px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 600;
  }

  .badge-on {
    background: rgba(170, 255, 170, 0.2);
    color: #aaffaa;
    border: 1px solid rgba(170, 255, 170, 0.3);
  }

  .badge-off {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    margin: 12px 0 6px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 20px;
    background: linear-gradient(90deg, #febf8e, #ff8e9f);
    box-shadow: 0 0 10px #ffb272;
    transition: width 0.3s ease;
  }

  .device-detail {
    font-size: 13px;
    margin-top: 8px;
    color: rgba(255, 255, 255, 0.8);
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 32px;
  }

  .loading-overlay .iconfont {
    font-size: 24px;
    color: #ffc285;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
