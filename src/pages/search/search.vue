<template>
  <view class="page-shell search-page">
    <WeatherBackdrop />
    <view class="page-content search-content">
      <view class="search-topbar">
        <view class="back-btn" data-tv-focus @click="goBack">
          <text class="iconfont icon-chevron-right back-icon"></text>
        </view>
        <view class="glass-card search-input-shell">
          <text class="iconfont icon-search search-icon"></text>
          <input
            v-model="searchText"
            class="search-input"
            data-tv-focus
            type="text"
            focus
            placeholder="搜索设备、房间、传感器..."
            placeholder-class="input-placeholder"
            @input="handleSearch"
          />
          <text
            v-if="searchText"
            class="iconfont icon-times clear-icon"
            data-tv-focus
            @click="clearSearch"
          ></text>
        </view>
      </view>

      <view v-if="searchText" class="result-section">
        <view class="glass-card result-summary">
          <text class="result-title">找到 {{ filteredDevices.length }} 个结果</text>
          <text class="result-desc">点击后会跳转到设备页并自动展开对应实体。</text>
        </view>

        <view v-if="filteredDevices.length > 0" class="result-list">
          <view
            v-for="device in filteredDevices"
            :key="device.entity_id"
            class="glass-card result-item"
            data-tv-focus
            @click="handleDeviceClick(device)"
          >
            <view :class="['device-icon', 'result-icon', getDeviceTone(device)]">
              <text :class="['iconfont', getDeviceIcon(device)]"></text>
            </view>
            <view class="result-copy">
              <text class="result-name">{{ getDeviceName(device) }}</text>
              <text class="result-status">{{ getDeviceState(device) }}</text>
            </view>
            <text class="iconfont icon-chevron-right result-arrow"></text>
          </view>
        </view>

        <view v-else class="glass-card empty-result">
          <text class="iconfont icon-search empty-icon"></text>
          <text class="empty-title">没有找到匹配项</text>
          <text class="empty-desc">换个关键词试试，比如房间名、设备名或实体类型。</text>
        </view>
      </view>

      <view v-else class="discover-section">
        <view v-if="searchHistory.length > 0" class="glass-card history-card">
          <view class="section-header compact-header">
            <text class="section-title">搜索历史</text>
            <text class="section-link" @click="clearHistory">清空</text>
          </view>
          <view class="tag-list">
            <view
              v-for="(item, index) in searchHistory"
              :key="`${item}-${index}`"
              class="tag-item"
              data-tv-focus
              @click="handleHistoryClick(item)"
            >
              {{ item }}
            </view>
          </view>
        </view>

        <view class="glass-card hot-card">
          <view class="section-header compact-header">
            <text class="section-title">热门搜索</text>
            <text class="section-link">快捷进入</text>
          </view>
          <view class="tag-list">
            <view
              v-for="(item, index) in hotSearches"
              :key="`${item}-${index}`"
              class="tag-item hot"
              data-tv-focus
              @click="handleHotClick(item)"
            >
              {{ item }}
            </view>
          </view>
        </view>

        <view class="glass-card hint-card">
          <text class="hint-title">搜索支持哪些内容</text>
          <text class="hint-desc">支持设备名称、实体 ID、房间关键字和常见类型，比如“客厅灯”、“空调”、“温度”。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
  /**
   * 搜索页面
   * 功能: 快速查找设备和传感器，并跳转到设备页定位
   */
  import { ref, computed, onMounted } from 'vue'
  import { useHAStore } from '../../store/ha-store.js'
  import WeatherBackdrop from '../../components/WeatherBackdrop.vue'

  const SEARCHABLE_DOMAINS = [
    'light',
    'switch',
    'climate',
    'cover',
    'lock',
    'fan',
    'media_player',
    'sensor',
    'binary_sensor'
  ]

  export default {
    components: {
      WeatherBackdrop
    },

    setup() {
      const store = useHAStore()
      const searchText = ref('')
      const searchHistory = ref([])
      const hotSearches = ref([
        '客厅灯',
        '卧室空调',
        '窗帘',
        '温度',
        '门锁'
      ])

      const filteredDevices = computed(() => {
        if (!searchText.value) {
          return []
        }

        const keyword = searchText.value.toLowerCase().trim()

        return Array.from(store.entities.values())
          .filter((entity) => SEARCHABLE_DOMAINS.includes(entity.entity_id.split('.')[0]))
          .filter((entity) => {
            const name = (entity.attributes?.friendly_name || '').toLowerCase()
            const entityId = (entity.entity_id || '').toLowerCase()
            return name.includes(keyword) || entityId.includes(keyword)
          })
          .sort((a, b) => {
            const aName = (a.attributes?.friendly_name || a.entity_id || '').toLowerCase()
            const bName = (b.attributes?.friendly_name || b.entity_id || '').toLowerCase()
            const aScore = aName.startsWith(keyword) ? 2 : aName.includes(keyword) ? 1 : 0
            const bScore = bName.startsWith(keyword) ? 2 : bName.includes(keyword) ? 1 : 0
            return bScore - aScore
          })
      })

      function handleSearch() {
        // 预留搜索防抖能力
      }

      function clearSearch() {
        searchText.value = ''
      }

      function goBack() {
        const pages = getCurrentPages()

        if (pages.length > 1) {
          uni.navigateBack()
          return
        }

        uni.switchTab({
          url: '/pages/home/home'
        })
      }

      function getDeviceDomain(device) {
        return device.entity_id.split('.')[0]
      }

      function getDeviceIcon(device) {
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

        return iconMap[getDeviceDomain(device)] || 'icon-microchip'
      }

      function getDeviceTone(device) {
        const domain = getDeviceDomain(device)

        if (domain === 'climate') {
          return 'cool'
        }

        if (domain === 'cover') {
          return 'accent'
        }

        if (domain === 'lock') {
          return 'safe'
        }

        return ''
      }

      function getDeviceName(device) {
        return device.attributes?.friendly_name || device.entity_id
      }

      function getDeviceState(device) {
        const domain = getDeviceDomain(device)

        if (domain === 'light') {
          return device.state === 'on' ? '灯光已开启' : '灯光已关闭'
        }

        if (domain === 'sensor') {
          const unit = device.attributes?.unit_of_measurement || ''
          return `${device.state} ${unit}`.trim()
        }

        if (domain === 'cover') {
          return `开合 ${device.attributes?.current_position || 0}%`
        }

        if (domain === 'lock') {
          return device.state === 'locked' ? '门锁已上锁' : '门锁未锁定'
        }

        return device.state
      }

      function handleDeviceClick(device) {
        saveSearchHistory(searchText.value)
        uni.setStorageSync('search_focus_entity_id', device.entity_id)

        uni.switchTab({
          url: '/pages/devices/devices'
        })
      }

      function saveSearchHistory(keyword) {
        const value = keyword.trim()

        if (!value) {
          return
        }

        const index = searchHistory.value.indexOf(value)
        if (index > -1) {
          searchHistory.value.splice(index, 1)
        }

        searchHistory.value.unshift(value)

        if (searchHistory.value.length > 10) {
          searchHistory.value.pop()
        }

        uni.setStorageSync('search_history', searchHistory.value)
      }

      function clearHistory() {
        searchHistory.value = []
        uni.removeStorageSync('search_history')
      }

      function handleHistoryClick(keyword) {
        searchText.value = keyword
      }

      function handleHotClick(keyword) {
        searchText.value = keyword
      }

      onMounted(() => {
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
        getDeviceTone,
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
  .search-content {
    padding-bottom: 40px;
  }

  .search-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .back-btn {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.82);
  }

  .back-icon {
    transform: rotate(180deg);
  }

  .search-input-shell {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
  }

  .search-icon {
    color: rgba(255, 255, 255, 0.58);
    font-size: 16px;
  }

  .search-input {
    flex: 1;
    height: 28px;
    color: #ffffff;
    font-size: 14px;
  }

  .input-placeholder {
    color: rgba(255, 255, 255, 0.38);
  }

  .clear-icon {
    color: rgba(255, 255, 255, 0.48);
    font-size: 14px;
  }

  .result-section,
  .discover-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .result-summary {
    padding: 16px 18px;
  }

  .result-title {
    display: block;
    font-size: 18px;
    font-weight: 600;
  }

  .result-desc {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.64);
    line-height: 1.6;
  }

  .result-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
  }

  .result-icon {
    width: 42px;
    height: 42px;
    font-size: 20px;
    flex-shrink: 0;
  }

  .result-copy {
    flex: 1;
    min-width: 0;
  }

  .result-name {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
  }

  .result-status {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.62);
  }

  .result-arrow {
    color: rgba(255, 255, 255, 0.45);
    font-size: 14px;
  }

  .empty-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 34px 20px;
  }

  .empty-icon {
    font-size: 28px;
    color: rgba(255, 255, 255, 0.4);
  }

  .empty-title {
    font-size: 16px;
    font-weight: 600;
  }

  .empty-desc {
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.62);
  }

  .compact-header {
    margin-bottom: 12px;
    padding: 0;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 9px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
    font-size: 13px;
  }

  .tag-item.hot {
    color: #ffd7ab;
    background: rgba(255, 194, 133, 0.08);
    border-color: rgba(255, 194, 133, 0.16);
  }

  .hint-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
  }

  .hint-desc {
    display: block;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.64);
  }
</style>
