<template>
  <view :class="['connection-status-dot', `is-${status}`]">
    <view class="connection-status-core"></view>
    <text class="connection-status-label">{{ label }}</text>
  </view>
</template>

<script>
  import { computed } from 'vue'
  import { apiService } from '../api/ha-api.js'

  const STATUS_LABEL_MAP = {
    online: '实时',
    reconnecting: '重连',
    connecting: '连接',
    rest: 'REST'
  }

  export default {
    setup() {
      const status = computed(() => apiService.ws.status.value || 'rest')
      const label = computed(() => STATUS_LABEL_MAP[status.value] || STATUS_LABEL_MAP.rest)

      return {
        status,
        label
      }
    }
  }
</script>

<style scoped>
  .connection-status-dot {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 54px;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: rgba(255, 255, 255, 0.74);
    line-height: 1;
  }

  .connection-status-core {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(148, 163, 184, 0.9);
    box-shadow: 0 0 10px rgba(148, 163, 184, 0.4);
    flex-shrink: 0;
  }

  .connection-status-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .is-online .connection-status-core {
    background: #7ee7a8;
    box-shadow: 0 0 12px rgba(126, 231, 168, 0.48);
  }

  .is-reconnecting .connection-status-core,
  .is-connecting .connection-status-core {
    background: #ffc46b;
    box-shadow: 0 0 12px rgba(255, 196, 107, 0.45);
    animation: status-pulse 1.4s ease-in-out infinite;
  }

  .is-rest .connection-status-core {
    background: rgba(226, 232, 240, 0.75);
    box-shadow: 0 0 10px rgba(226, 232, 240, 0.28);
  }

  @keyframes status-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.88;
    }

    50% {
      transform: scale(1.2);
      opacity: 1;
    }
  }
</style>
