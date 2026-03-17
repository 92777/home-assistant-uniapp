<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="iconfont icon-search search-icon"></text>
        <input 
          v-model="searchText"
          class="search-input"
          type="text"
          placeholder="搜索设备、房间..."
          placeholder-class="input-placeholder"
          @input="handleSearch"
        />
        <text 
          v-if="searchText"
          class="iconfont icon-times clear-icon"
          @click="clearSearch"
        ></text>
      </view>
      <text class="cancel-btn" @click="goBack">取消</text>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searchText" class="search-results">
      <!-- 搜索结果统计 -->
      <view class="result-stats">
        <text class="stats-text">找到 {{ filteredDevices.length }} 个设备</text>
      </view>

      <!-- 设备列表 -->
      <view v-if="filteredDevices.length > 0" class="device-list">
        <view 
          v-for="device in filteredDevices" 
          :key="device.entity_id"
          class="device-item"
          @click="handleDeviceClick(device)"
        >
          <view class="device-icon-small">
            <text :class="['iconfont', getDeviceIcon(device)]"></text>
          </view>
          <view class="device-info">
            <text class="device-name">{{ getDeviceName(device) }}</text>
            <text class="device-status">{{ getDeviceState(device) }}</text>
          </view>
        </view>
      </view>

      <!-- 无结果 -->
      <view v-else class="empty-result">
        <text class="iconfont icon-search empty-icon"></text>
        <text class="empty-text">未找到相关设备</text>
      </view>
    </view>

    <!-- 搜索历史和热门搜索 -->
    <view v-else class="search-history">
      <!-- 搜索历史 -->
      <view v-if="searchHistory.length > 0" class="history-section">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <text class="clear-history" @click="clearHistory">清空</text>
        </view>
        <view class="history-tags">
          <view 
            v-for="(item, index) in searchHistory" 
            :key="index"
            class="history-tag"
            @click="handleHistoryClick(item)"
          >
            {{ item }}
          </view>
        </view>
      </view>

      <!-- 热门搜索 -->
      <view class="hot-section">
        <view class="section-header">
          <text class="section-title">热门搜索</text>
        </view>
        <view class="hot-tags">
          <view 
            v-for="(item, index) in hotSearches" 
            :key="index"
            class="hot-tag"
            @click="handleHotClick(item)"
          >
            {{ item }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 搜索页面
   * 功能: 快速查找设备和房间
   */
  import { ref, computed, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()
      
      // 搜索文本
      const searchText = ref('')
      
      // 搜索历史
      const searchHistory = ref([])
      
      // 热门搜索
      const hotSearches = ref([
        '客厅灯',
        '空调',
        '窗帘',
        '温度',
        '湿度'
      ])
      
      /**
       * 过滤后的设备列表
       */
      const filteredDevices = computed(() => {
        if (!searchText.value) {
          return []
        }
        
        const keyword = searchText.value.toLowerCase()
        const allEntities = Array.from(store.entities.values())
        
        return allEntities.filter(entity => {
          const name = entity.attributes?.friendly_name || ''
          const entityId = entity.entity_id || ''
          
          return name.toLowerCase().includes(keyword) || 
                 entityId.toLowerCase().includes(keyword)
        })
      })
      
      /**
       * 处理搜索输入
       */
      function handleSearch() {
        // 可以添加防抖优化
      }
      
      /**
       * 清空搜索
       */
      function clearSearch() {
        searchText.value = ''
      }
      
      /**
       * 返回上一页
       */
      function goBack() {
        uni.navigateBack()
      }
      
      /**
       * 获取设备图标
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
          media_player: 'icon-tv',
          sensor: 'icon-thermometer',
          binary_sensor: 'icon-motion-sensor'
        }
        
        return iconMap[domain] || 'icon-microchip'
      }
      
      /**
       * 获取设备名称
       */
      function getDeviceName(device) {
        return device.attributes?.friendly_name || device.entity_id
      }
      
      /**
       * 获取设备状态
       */
      function getDeviceState(device) {
        const domain = device.entity_id.split('.')[0]
        
        if (domain === 'light') {
          return device.state === 'on' ? '已开启' : '已关闭'
        }
        
        if (domain === 'sensor') {
          const unit = device.attributes?.unit_of_measurement || ''
          return `${device.state} ${unit}`.trim()
        }
        
        return device.state
      }
      
      /**
       * 处理设备点击
       */
      function handleDeviceClick(device) {
        // 保存搜索历史
        saveSearchHistory(searchText.value)
        
        // 跳转到设备详情页
        uni.navigateTo({
          url: `/pages/device-detail/device-detail?entity_id=${device.entity_id}`
        })
      }
      
      /**
       * 保存搜索历史
       */
      function saveSearchHistory(keyword) {
        // 移除重复项
        const index = searchHistory.value.indexOf(keyword)
        if (index > -1) {
          searchHistory.value.splice(index, 1)
        }
        
        // 添加到开头
        searchHistory.value.unshift(keyword)
        
        // 最多保存10条
        if (searchHistory.value.length > 10) {
          searchHistory.value.pop()
        }
        
        // 保存到本地存储
        uni.setStorageSync('search_history', searchHistory.value)
      }
      
      /**
       * 清空搜索历史
       */
      function clearHistory() {
        searchHistory.value = []
        uni.removeStorageSync('search_history')
      }
      
      /**
       * 处理历史记录点击
       */
      function handleHistoryClick(keyword) {
        searchText.value = keyword
      }
      
      /**
       * 处理热门搜索点击
       */
      function handleHotClick(keyword) {
        searchText.value = keyword
      }
      
      onMounted(() => {
        // 加载搜索历史
        const history = uni.getStorageSync('search_history')
        if (history) {
          searchHistory.value = history
        }
      })
      
      return {
        searchText,
        searchHistory,
        hotSearches,
        filteredDevices,
        handleSearch,
        clearSearch,
        goBack,
        getDeviceIcon,
        getDeviceName,
        getDeviceState,
        handleDeviceClick,
        clearHistory,
        handleHistoryClick,
        handleHotClick
      }
    }
  }
</script>

<style scoped>
  .search-page {
    padding: 20px 18px;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.4);
    z-index: 1;
  }

  .search-input {
    width: 100%;
    height: 40px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 0 40px 0 40px;
    color: #ffffff;
    font-size: 14px;
  }

  .input-placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .clear-icon {
    position: absolute;
    right: 12px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.4);
    z-index: 1;
  }

  .cancel-btn {
    font-size: 15px;
    color: #ffc285;
  }

  .search-results {
    margin-top: 20px;
  }

  .result-stats {
    margin-bottom: 16px;
  }

  .stats-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .device-item {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .device-icon-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 200, 150, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 14px;
    font-size: 20px;
    color: #ffc89c;
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

  .empty-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
  }

  .empty-icon {
    font-size: 48px;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
  }

  .search-history {
    margin-top: 20px;
  }

  .history-section,
  .hot-section {
    margin-bottom: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .clear-history {
    font-size: 14px;
    color: #ffc285;
  }

  .history-tags,
  .hot-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .history-tag,
  .hot-tag {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hot-tag {
    background: rgba(255, 200, 150, 0.1);
    border-color: rgba(255, 200, 150, 0.2);
    color: #ffc89c;
  }
</style>
