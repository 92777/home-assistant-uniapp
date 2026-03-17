<template>
  <view :class="['status-badge', sizeClass, typeClass]">
    <text v-if="icon" :class="['iconfont', icon]"></text>
    <text class="badge-text">{{ text }}</text>
  </view>
</template>

<script>
  /**
   * 状态徽章组件
   * 功能: 展示设备状态、在线状态等徽章
   */
  import { computed } from 'vue'

  export default {
    props: {
      // 徽章文本
      text: {
        type: String,
        required: true
      },
      // 徽章类型
      type: {
        type: String,
        default: 'default',
        validator: (value) => {
          return ['default', 'success', 'warning', 'error', 'info'].includes(value)
        }
      },
      // 徽章大小
      size: {
        type: String,
        default: 'medium',
        validator: (value) => {
          return ['small', 'medium', 'large'].includes(value)
        }
      },
      // 图标
      icon: {
        type: String,
        default: ''
      }
    },

    setup(props) {
      /**
       * 大小类名
       */
      const sizeClass = computed(() => {
        return `badge-${props.size}`
      })

      /**
       * 类型类名
       */
      const typeClass = computed(() => {
        return `badge-${props.type}`
      })

      return {
        sizeClass,
        typeClass
      }
    }
  }
</script>

<style scoped>
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 30px;
    font-weight: 500;
    white-space: nowrap;
  }

  /* 大小样式 */
  .badge-small {
    padding: 2px 8px;
    font-size: 10px;
  }

  .badge-medium {
    padding: 4px 12px;
    font-size: 12px;
  }

  .badge-large {
    padding: 6px 16px;
    font-size: 14px;
  }

  /* 类型样式 */
  .badge-default {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .badge-success {
    background: rgba(170, 255, 170, 0.15);
    color: #aaffaa;
    border: 1px solid rgba(170, 255, 170, 0.3);
  }

  .badge-warning {
    background: rgba(255, 215, 150, 0.15);
    color: #ffd58c;
    border: 1px solid rgba(255, 215, 150, 0.3);
  }

  .badge-error {
    background: rgba(255, 170, 170, 0.15);
    color: #ffaaaa;
    border: 1px solid rgba(255, 170, 170, 0.3);
  }

  .badge-info {
    background: rgba(181, 228, 255, 0.15);
    color: #b5e4ff;
    border: 1px solid rgba(181, 228, 255, 0.3);
  }

  .badge-text {
    line-height: 1;
  }

  .iconfont {
    font-size: 1em;
  }
</style>
