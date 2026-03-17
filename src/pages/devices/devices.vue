<template>
  <view class="devices-page">
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
    <text class="page-title gradient-text-blue">设备</text>

    <!-- 房间分组列表 -->
    <view 
      v-for="room in rooms" 
      :key="room.id"
      class="room-group"
    >
      <view class="room-title">
        <text :class="['iconfont', room.icon]"></text>
        <text>{{ room.name }}</text>
      </view>
      
      <view class="device-list">
        <view 
          v-for="device in room.devices" 
          :key="device.entity_id"
          class="device-row"
          @click="toggleDeviceExpand(device)"
        >
          <view class="device-icon-small">
            <text :class="['iconfont', getDeviceIcon(device)]"></text>
          </view>
          <view class="device-info">
            <text class="device-name">{{ getDeviceName(device) }}</text>
            <text class="device-status">{{ getDeviceSummary(device) }}</text>
          </view>
          <text 
            :class="['iconfont', device.expanded ? 'icon-chevron-down' : 'icon-chevron-right', 'chevron']"
          ></text>
        </view>
        
        <!-- 实体列表 -->
        <view v-if="device.expanded" class="entity-list">
          <view 
            v-for="entity in device.entities" 
            :key="entity.entity_id"
            :class="['entity-item', isOperable(entity) ? 'operable' : 'sensor']"
            @click="handleEntityClick(entity)"
          >
            <view class="entity-icon">
              <text :class="['iconfont', getEntityIcon(entity)]"></text>
            </view>
            <text class="entity-name">{{ getEntityName(entity) }}</text>
            <text :class="['entity-state', isOperable(entity) ? '' : 'sensor']">
              {{ getEntityState(entity) }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 设备页面组件
   * 功能: 按房间分组展示设备,支持展开查看实体
   */
  import { ref, computed, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()
      
      // 当前时间
      const currentTime = ref('')
      
      // 房间列表 (模拟数据,实际应从配置或实体属性中获取)
      const rooms = ref([
        {
          id: 'living_room',
          name: '客厅',
          icon: 'icon-couch',
          devices: []
        },
        {
          id: 'bedroom',
          name: '卧室',
          icon: 'icon-bed',
          devices: []
        },
        {
          id: 'system',
          name: '系统设备',
          icon: 'icon-server',
          devices: []
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
       * 切换设备展开状态
       * @param {object} device - 设备对象
       */
      function toggleDeviceExpand(device) {
        device.expanded = !device.expanded
      }
      
      /**
       * 获取设备图标
       * @param {object} device - 设备对象
       * @returns {string} 图标类名
       */
      function getDeviceIcon(device) {
        const entityId = device.entity_id
        const domain = entityId.split('.')[0]
        
        const iconMap = {
          light: 'icon-lightbulb',
          switch: 'icon-toggle-on',
          climate: 'icon-snowflake',
          cover: 'icon-curtain',
          lock: 'icon-lock',
          fan: 'icon-fan',
          media_player: 'icon-tv'
        }
        
        return iconMap[domain] || 'icon-microchip'
      }
      
      /**
       * 获取设备名称
       * @param {object} device - 设备对象
       * @returns {string} 设备名称
       */
      function getDeviceName(device) {
        return device.attributes.friendly_name || device.entity_id
      }
      
      /**
       * 获取设备摘要信息
       * @param {object} device - 设备对象
       * @returns {string} 摘要文本
       */
      function getDeviceSummary(device) {
        const entities = device.entities || []
        const operableCount = entities.filter(e => isOperable(e)).length
        const onCount = entities.filter(e => e.state === 'on').length
        
        if (entities.length > 1) {
          return `${entities.length}个设备 · ${onCount}个开启`
        }
        
        return getDeviceStatus(device)
      }
      
      /**
       * 获取设备状态
       * @param {object} device - 设备对象
       * @returns {string} 状态文本
       */
      function getDeviceStatus(device) {
        const state = device.state
        const domain = device.entity_id.split('.')[0]
        
        if (domain === 'light') {
          return state === 'on' ? '已开启' : '已关闭'
        } else if (domain === 'climate') {
          return state === 'cool' ? '制冷' : state === 'heat' ? '制热' : '自动'
        } else if (domain === 'cover') {
          return `开合 ${device.attributes.current_position || 0}%`
        }
        
        return state
      }
      
      /**
       * 判断实体是否可操作
       * @param {object} entity - 实体对象
       * @returns {boolean} 是否可操作
       */
      function isOperable(entity) {
        const domain = entity.entity_id.split('.')[0]
        return ['light', 'switch', 'climate', 'cover', 'lock', 'fan'].includes(domain)
      }
      
      /**
       * 获取实体图标
       * @param {object} entity - 实体对象
       * @returns {string} 图标类名
       */
      function getEntityIcon(entity) {
        const domain = entity.entity_id.split('.')[0]
        
        const iconMap = {
          light: 'icon-lightbulb',
          switch: 'icon-toggle-on',
          climate: 'icon-snowflake',
          sensor: 'icon-thermometer',
          binary_sensor: 'icon-motion-sensor',
          cover: 'icon-curtain',
          lock: 'icon-lock'
        }
        
        return iconMap[domain] || 'icon-microchip'
      }
      
      /**
       * 获取实体名称
       * @param {object} entity - 实体对象
       * @returns {string} 实体名称
       */
      function getEntityName(entity) {
        return entity.attributes.friendly_name || entity.entity_id
      }
      
      /**
       * 获取实体状态
       * @param {object} entity - 实体对象
       * @returns {string} 状态文本
       */
      function getEntityState(entity) {
        const domain = entity.entity_id.split('.')[0]
        
        if (domain === 'light' && entity.state === 'on') {
          const brightness = entity.attributes.brightness
          return brightness ? `开启 ${Math.round(brightness / 2.55)}%` : '开启'
        }
        
        if (domain === 'sensor') {
          return `${entity.state} ${entity.attributes.unit_of_measurement || ''}`
        }
        
        return entity.state
      }
      
      /**
       * 处理实体点击
       * @param {object} entity - 实体对象
       */
      async function handleEntityClick(entity) {
        if (!isOperable(entity)) {
          return
        }
        
        const domain = entity.entity_id.split('.')[0]
        const newState = entity.state === 'on' ? 'off' : 'on'
        
        try {
          if (domain === 'light') {
            await store.controlLight(entity.entity_id, { state: newState })
          } else if (domain === 'switch') {
            await store.controlSwitch(entity.entity_id, newState)
          }
          
          uni.showToast({
            title: '操作成功',
            icon: 'success'
          })
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'none'
          })
        }
      }
      
      /**
       * 组织设备数据
       */
      function organizeDevices() {
        // 这里应该根据实际的设备配置来组织
        // 暂时使用模拟数据
        const allEntities = Array.from(store.entities.values())
        
        // 按房间分组
        // 实际应该从实体属性中读取房间信息
        rooms.value.forEach(room => {
          if (room.id === 'living_room') {
            room.devices = allEntities
              .filter(e => e.entity_id.includes('living') || e.entity_id.includes('客厅'))
              .map(e => ({
                ...e,
                expanded: false,
                entities: [e]
              }))
          } else if (room.id === 'bedroom') {
            room.devices = allEntities
              .filter(e => e.entity_id.includes('bedroom') || e.entity_id.includes('卧室'))
              .map(e => ({
                ...e,
                expanded: false,
                entities: [e]
              }))
          } else if (room.id === 'system') {
            room.devices = allEntities
              .filter(e => e.entity_id.includes('gateway') || e.entity_id.includes('router'))
              .map(e => ({
                ...e,
                expanded: false,
                entities: [e]
              }))
          }
        })
      }
      
      onMounted(() => {
        updateTime()
        setInterval(updateTime, 60000)
        
        // 组织设备数据
        organizeDevices()
      })
      
      return {
        currentTime,
        rooms,
        toggleDeviceExpand,
        getDeviceIcon,
        getDeviceName,
        getDeviceSummary,
        isOperable,
        getEntityIcon,
        getEntityName,
        getEntityState,
        handleEntityClick
      }
    }
  }
</script>

<style scoped>
  .devices-page {
    padding: 20px 18px 24px 18px;
  }

  .page-title {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 10px;
    display: block;
  }

  .room-group {
    margin-bottom: 24px;
  }

  .room-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    padding-left: 8px;
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .device-row {
    display: flex;
    align-items: center;
    background: rgba(30, 30, 42, 0.4);
    backdrop-filter: blur(12px);
    border-radius: 28px;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .device-row:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  }

  .device-row:active {
    background: rgba(30, 30, 42, 0.5);
  }

  .device-icon-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 200, 150, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 14px;
    font-size: 20px;
    color: #ffc89c;
    border: 1px solid rgba(255, 200, 150, 0.4);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  }

  .device-info {
    flex: 1;
  }

  .device-name {
    font-size: 16px;
    font-weight: 600;
    display: block;
  }

  .device-status {
    font-size: 13px;
    opacity: 0.7;
    display: block;
  }

  .chevron {
    color: rgba(255, 255, 255, 0.5);
    margin-left: 8px;
  }

  .entity-list {
    margin-top: 8px;
    margin-left: 50px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .entity-item {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
    border-radius: 24px;
    padding: 8px 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
  }

  .entity-item.operable {
    border-left: 4px solid #ffc285;
    cursor: pointer;
  }

  .entity-item.operable:hover {
    background: rgba(0, 0, 0, 0.35);
    transform: translateX(4px);
  }

  .entity-item.sensor {
    opacity: 0.7;
    border-left: 4px solid #6c8c9c;
  }

  .entity-icon {
    width: 32px;
    text-align: center;
    margin-right: 12px;
    font-size: 18px;
    color: #b0d0ff;
  }

  .entity-name {
    flex: 1;
    font-size: 14px;
  }

  .entity-state {
    font-size: 12px;
    color: #aaffaa;
  }

  .entity-state.sensor {
    color: #cccccc;
  }
</style>
