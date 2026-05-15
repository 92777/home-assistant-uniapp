<template>
  <view class="page-shell devices-page">
    <WeatherBackdrop />
    <view class="page-content devices-content">
      <view class="status-bar">
        <text>{{ currentTime }}</text>
        <view class="status-icons">
          <ConnectionStatusDot />
          <text class="iconfont icon-signal"></text>
          <text class="iconfont icon-wifi"></text>
          <text class="iconfont icon-battery-full"></text>
        </view>
      </view>

      <view class="page-header devices-header">
        <view>
          <text class="page-title">设备</text>
          <text class="page-subtitle">按房间查看</text>
        </view>
      </view>

      <view class="overview-strip">
        <view class="glass-pill overview-pill">{{ visibleRooms.length }} 个房间</view>
        <view class="glass-pill overview-pill">{{ totalDevices }} 台设备</view>
        <view class="glass-pill overview-pill">{{ activeDevices }} 台运行中</view>
      </view>

      <view v-if="store.registryLoading && !isRegistryReady" class="glass-card empty-card">
        <text class="empty-text">正在同步 Home Assistant 的房间与设备目录...</text>
      </view>

      <view v-else-if="visibleRooms.length > 0" class="room-grid">
        <view
          v-for="room in visibleRooms"
          :key="room.id"
          class="glass-card room-card"
        >
          <view class="room-header">
            <view class="room-title-wrap">
              <view class="room-icon">
                <text :class="['iconfont', room.icon]"></text>
              </view>
              <view class="room-copy">
                <text class="room-title">{{ room.name }}</text>
                <text class="room-subtitle">{{ room.devices.length }} 台设备 · {{ getRoomEntityCount(room) }} 个实体</text>
              </view>
            </view>
            <text class="glass-pill">{{ getRoomSummary(room) }}</text>
          </view>

          <view class="device-stack">
            <view
              v-for="device in room.devices"
              :key="device.id"
              :class="['device-shell', { highlighted: highlightDeviceId === device.id }]"
            >
              <view class="device-row" data-tv-focus @click="openDeviceSheet(room, device)">
                <view :class="['device-icon', 'row-icon', device.tone]">
                  <text :class="['iconfont', device.icon]"></text>
                </view>
                <view class="device-copy">
                  <text class="device-name">{{ device.name }}</text>
                  <text class="device-status">{{ device.summary }}</text>
                </view>
                <view class="device-meta">
                  <text class="device-meta-count">{{ device.entityCount }} 实体</text>
                  <text class="iconfont icon-chevron-right chevron"></text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="glass-card empty-card">
        <text class="empty-text">还没有可展示的设备目录。</text>
      </view>
    </view>

    <view v-if="activeDevice" class="sheet-mask" @click="closeDeviceSheet">
      <view class="device-sheet-panel" @click.stop>
        <view class="sheet-handle"></view>

        <view class="detail-head">
          <view class="detail-copy">
            <text class="detail-room">{{ activeRoom?.fullName || activeRoom?.name || '设备详情' }}</text>
            <text class="detail-title">{{ activeDevice.name }}</text>
          </view>
          <view class="detail-close" data-tv-focus @click="closeDeviceSheet">
            <text class="iconfont icon-times"></text>
          </view>
        </view>

        <scroll-view class="sheet-scroll" scroll-y>
          <view class="entity-group-list">
            <view
              v-for="group in activeDeviceGroups"
              :key="group.key"
              class="entity-group"
            >
              <view class="entity-group-head">
                <text class="entity-group-title">{{ group.title }}</text>
                <text class="glass-pill entity-group-pill">{{ group.entities.length }}</text>
              </view>

              <view class="entity-list">
                <view
                  v-for="entity in group.entities"
                  :key="entity.entity_id"
                  :class="['entity-row', { pending: isEntityPending(entity.entity_id) }]"
                  data-tv-focus
                  @click="handleEntityClick(entity)"
                >
                  <view class="entity-leading">
                    <view class="entity-icon-circle">
                      <text :class="['iconfont', getEntityIcon(entity)]"></text>
                    </view>
                    <view class="entity-copy">
                      <text class="entity-name">{{ entity.name }}</text>
                      <text class="entity-desc">
                        {{ isEntityPending(entity.entity_id) ? getPendingControlLabel(entity.entity_id) : entity.summary }}
                      </text>
                    </view>
                  </view>

                  <view
                    :class="[
                      'entity-tail',
                      isEntityPending(entity.entity_id)
                        ? 'pending'
                        :
                      entity.isOperable ? (entity.isRunning ? 'active' : 'inactive') : 'readonly'
                    ]"
                  >
                    <view v-if="isEntityPending(entity.entity_id)" class="entity-loading-spinner"></view>
                    <text
                      v-else
                      :class="[
                        'iconfont',
                        entity.isOperable
                          ? (entity.isRunning ? 'icon-toggle-on' : 'icon-toggle-off')
                          : 'icon-lock'
                      ]"
                    ></text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <CustomTabbar :current="2" />
  </view>
</template>

<script>
  /**
   * 设备页面
   * 功能: 用房间-设备-实体三级结构展示 Home Assistant 目录
   */
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { onShow } from '@dcloudio/uni-app'
  import { useHAStore } from '../../store/ha-store.js'
  import CustomTabbar from '../../components/CustomTabbar.vue'
  import ConnectionStatusDot from '../../components/ConnectionStatusDot.vue'
  import WeatherBackdrop from '../../components/WeatherBackdrop.vue'
  import { getDomainIcon } from '../../utils/device-catalog.js'

  export default {
    components: {
      ConnectionStatusDot,
      CustomTabbar,
      WeatherBackdrop
    },

    setup() {
      const store = useHAStore()
      const currentTime = ref('')
      const highlightDeviceId = ref('')
      const activeDeviceId = ref('')
      const activeRoomId = ref('')
      let timer = null

      const visibleRooms = computed(() => store.rooms)
      const totalDevices = computed(() => store.devices.length)
      const activeDevices = computed(() => store.runningDevices.length)
      const isRegistryReady = computed(() => store.registry.entities.length > 0)
      const activeDevice = computed(() => {
        return store.devices.find((device) => device.id === activeDeviceId.value) || null
      })
      const activeRoom = computed(() => {
        if (!activeDeviceId.value) {
          return null
        }

        return visibleRooms.value.find((room) => {
          if (activeRoomId.value && room.id === activeRoomId.value) {
            return true
          }

          return room.devices.some((device) => device.id === activeDeviceId.value)
        }) || null
      })
      const activeDeviceGroups = computed(() => activeDevice.value?.entityGroups || [])

      function updateTime() {
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        currentTime.value = `${hours}:${minutes}`
      }

      function getRoomEntityCount(room) {
        return room.devices.reduce((sum, device) => sum + device.entityCount, 0)
      }

      function getRoomSummary(room) {
        const activeCount = room.devices.filter((device) => device.isActive).length
        return activeCount > 0 ? `${activeCount} 台运行中` : '状态平稳'
      }

      function getEntityIcon(entity) {
        return getDomainIcon(entity.domain, entity)
      }

      function isEntityPending(entityId) {
        return store.isEntityPending(entityId)
      }

      function getPendingControlLabel(entityId) {
        return store.getPendingControlLabel(entityId)
      }

      async function syncRegistry() {
        if (!store.registryLoading && store.registry.entities.length === 0) {
          await store.loadRegistrySnapshot().catch(() => {})
        }
      }

      function findDeviceContext(deviceId) {
        for (const room of visibleRooms.value) {
          const device = room.devices.find((item) => item.id === deviceId)

          if (device) {
            return {
              room,
              device
            }
          }
        }

        return null
      }

      function openDeviceSheet(room, device) {
        highlightDeviceId.value = device.id
        activeDeviceId.value = device.id
        activeRoomId.value = room.id
      }

      function closeDeviceSheet() {
        activeDeviceId.value = ''
        activeRoomId.value = ''
      }

      function focusDevice(deviceId) {
        const context = findDeviceContext(deviceId)

        if (!context) {
          return
        }

        openDeviceSheet(context.room, context.device)
      }

      function applySearchFocus() {
        const focusedDeviceId = uni.getStorageSync('search_focus_device_id')
        const focusedEntityId = uni.getStorageSync('search_focus_entity_id')

        if (focusedDeviceId) {
          focusDevice(focusedDeviceId)
          uni.removeStorageSync('search_focus_device_id')
          return
        }

        if (!focusedEntityId) {
          return
        }

        const matchedDevice = store.devices.find((device) => {
          return device.entities.some((entity) => entity.entity_id === focusedEntityId)
        })

        if (matchedDevice) {
          focusDevice(matchedDevice.id)
        }

        uni.removeStorageSync('search_focus_entity_id')
      }

      async function handleEntityClick(entity) {
        if (!entity.isOperable || isEntityPending(entity.entity_id)) {
          return
        }

        try {
          await store.controlEntity(entity)
        } catch (error) {
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          })
        }
      }

      onShow(() => {
        uni.hideTabBar()
        syncRegistry().then(() => {
          applySearchFocus()
        })
      })

      onMounted(() => {
        updateTime()
        syncRegistry().then(() => {
          applySearchFocus()
        })
        timer = setInterval(updateTime, 60000)
      })

      onUnmounted(() => {
        if (timer) {
          clearInterval(timer)
        }
      })

      return {
        store,
        currentTime,
        visibleRooms,
        totalDevices,
        activeDevices,
        isRegistryReady,
        activeDevice,
        activeRoom,
        activeDeviceGroups,
        highlightDeviceId,
        getRoomEntityCount,
        getRoomSummary,
        getEntityIcon,
        isEntityPending,
        getPendingControlLabel,
        openDeviceSheet,
        closeDeviceSheet,
        handleEntityClick
      }
    }
  }
</script>

<style scoped>
  .devices-content {
    background: linear-gradient(180deg, rgba(34, 54, 76, 0.2) 0%, rgba(28, 45, 66, 0.28) 100%);
    box-shadow:
      0 24px 60px rgba(7, 15, 28, 0.38),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  .devices-header {
    margin-bottom: 12px;
  }

  .overview-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .overview-pill {
    color: rgba(255, 255, 255, 0.82);
  }

  .room-grid {
    display: grid;
    gap: 14px;
  }

  .room-card {
    padding: 12px;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(22, 46, 72, 0.56) 0%, rgba(25, 47, 70, 0.5) 100%);
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .room-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .room-copy {
    min-width: 0;
  }

  .room-icon {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(52, 84, 122, 0.34);
    color: #8cc4ff;
    font-size: 18px;
  }

  .room-title {
    display: block;
    font-size: 16px;
    font-weight: 700;
  }

  .room-subtitle {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.58);
  }

  .device-stack {
    display: grid;
    gap: 8px;
  }

  .device-shell {
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .device-shell.highlighted {
    background: rgba(255, 194, 133, 0.08);
    border-color: rgba(255, 194, 133, 0.18);
  }

  .device-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
  }

  .row-icon {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }

  .device-copy {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    display: block;
    font-size: 14px;
    font-weight: 700;
  }

  .device-status {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.62);
  }

  .device-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .device-meta-count {
    font-size: 10px;
    color: rgba(255, 189, 156, 0.88);
  }

  .chevron {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
  }

  .sheet-mask {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 24px 12px 96px;
    background: rgba(8, 15, 28, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .device-sheet-panel {
    width: min(100%, 760px);
    max-height: calc(100vh - 132px);
    padding: 12px;
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(22, 24, 37, 0.98) 0%, rgba(29, 31, 46, 0.96) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.38);
  }

  .sheet-handle {
    width: 54px;
    height: 5px;
    margin: 0 auto 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
  }

  .detail-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding: 0 4px;
  }

  .detail-copy {
    flex: 1;
    min-width: 0;
  }

  .detail-room {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .detail-title {
    display: block;
    margin-top: 4px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.35;
  }

  .detail-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.88);
    flex-shrink: 0;
  }

  .sheet-scroll {
    height: 56vh;
    max-height: calc(100vh - 280px);
  }

  .entity-group-list {
    display: grid;
    gap: 14px;
  }

  .entity-group {
    display: grid;
    gap: 10px;
  }

  .entity-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 4px;
  }

  .entity-group-title {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.72);
    letter-spacing: 0.2px;
  }

  .entity-group-pill {
    min-width: 28px;
    color: rgba(255, 255, 255, 0.82);
  }

  .entity-list {
    display: grid;
    gap: 10px;
    padding-bottom: 2px;
  }

  .entity-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .entity-row.pending {
    border-color: rgba(134, 195, 255, 0.24);
    background: rgba(84, 126, 174, 0.08);
  }

  .entity-leading {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .entity-icon-circle {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(83, 132, 188, 0.22);
    color: #8cc4ff;
    font-size: 19px;
    flex-shrink: 0;
  }

  .entity-copy {
    min-width: 0;
  }

  .entity-name {
    display: block;
    font-size: 14px;
    font-weight: 700;
  }

  .entity-desc {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .entity-tail {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    font-size: 24px;
    flex-shrink: 0;
  }

  .entity-tail.active {
    background: rgba(70, 116, 168, 0.3);
    color: #86c3ff;
  }

  .entity-tail.inactive {
    background: rgba(96, 78, 90, 0.34);
    color: #ffb7c0;
  }

  .entity-tail.readonly {
    background: rgba(83, 83, 98, 0.28);
    color: rgba(255, 255, 255, 0.56);
  }

  .entity-tail.pending {
    background: rgba(70, 116, 168, 0.22);
    color: #86c3ff;
  }

  .entity-loading-spinner {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid rgba(134, 195, 255, 0.22);
    border-top-color: #86c3ff;
    animation: device-spin 0.8s linear infinite;
  }

  .empty-card {
    text-align: center;
    padding: 24px 16px;
  }

  @keyframes device-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (min-width: 960px) {
    .room-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 767px) {
    .room-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .room-card {
      border-radius: 20px;
    }

    .device-row {
      padding: 10px;
    }

    .detail-title {
      font-size: 15px;
    }

    .device-sheet-panel {
      padding: 10px;
      border-radius: 24px 24px 22px 22px;
    }

    .sheet-mask {
      padding: 16px 10px 92px;
    }

    .sheet-scroll {
      height: 58vh;
      max-height: calc(100vh - 256px);
    }

    .entity-row {
      padding: 11px;
    }

    .entity-icon-circle {
      width: 40px;
      height: 40px;
      font-size: 18px;
    }

    .entity-tail {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      font-size: 20px;
    }
  }
</style>
