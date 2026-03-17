<template>
  <view class="loading-container">
    <!-- 骨架屏 -->
    <view v-if="type === 'skeleton'" class="skeleton-wrapper">
      <view 
        v-for="(item, index) in skeletonCount" 
        :key="index"
        class="skeleton-item"
        :style="getSkeletonStyle(index)"
      >
        <view class="skeleton-shimmer"></view>
      </view>
    </view>

    <!-- 加载动画 -->
    <view v-else-if="type === 'spinner'" class="spinner-wrapper">
      <view class="spinner"></view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>

    <!-- 点状加载 -->
    <view v-else-if="type === 'dots'" class="dots-wrapper">
      <view class="dot"></view>
      <view class="dot"></view>
      <view class="dot"></view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>

    <!-- 进度条加载 -->
    <view v-else-if="type === 'progress'" class="progress-wrapper">
      <view class="progress-track">
        <view class="progress-bar" :style="{ width: progress + '%' }"></view>
      </view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script>
  /**
   * 加载状态组件
   * 功能: 展示不同类型的加载状态
   */
  import { computed } from 'vue'

  export default {
    props: {
      // 加载类型
      type: {
        type: String,
        default: 'spinner',
        validator: (value) => {
          return ['skeleton', 'spinner', 'dots', 'progress'].includes(value)
        }
      },
      // 加载文本
      text: {
        type: String,
        default: ''
      },
      // 进度 (0-100)
      progress: {
        type: Number,
        default: 0
      },
      // 骨架屏数量
      skeletonCount: {
        type: Number,
        default: 3
      },
      // 骨架屏类型
      skeletonType: {
        type: String,
        default: 'card',
        validator: (value) => {
          return ['card', 'list', 'text'].includes(value)
        }
      }
    },

    setup(props) {
      /**
       * 获取骨架屏样式
       * @param {number} index - 索引
       * @returns {object} 样式对象
       */
      function getSkeletonStyle(index) {
        const styles = {
          card: {
            height: '120px',
            marginBottom: '16px'
          },
          list: {
            height: '60px',
            marginBottom: '12px'
          },
          text: {
            height: '20px',
            marginBottom: '8px',
            width: `${Math.random() * 30 + 70}%`
          }
        }

        return styles[props.skeletonType] || styles.card
      }

      return {
        getSkeletonStyle
      }
    }
  }
</script>

<style scoped>
  .loading-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  /* 骨架屏样式 */
  .skeleton-wrapper {
    width: 100%;
  }

  .skeleton-item {
    position: relative;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    overflow: hidden;
  }

  .skeleton-shimmer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* 旋转加载样式 */
  .spinner-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #ffc285;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* 点状加载样式 */
  .dots-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .dots-wrapper {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .dot {
    width: 10px;
    height: 10px;
    background: #ffc285;
    border-radius: 50%;
    animation: dotPulse 1.4s ease-in-out infinite;
  }

  .dot:nth-child(1) {
    animation-delay: 0s;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes dotPulse {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  /* 进度条加载样式 */
  .progress-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .progress-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #febf8e, #ff8e9f);
    border-radius: 20px;
    transition: width 0.3s ease;
  }

  .loading-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 8px;
  }
</style>
