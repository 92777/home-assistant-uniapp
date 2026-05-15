<script>
  /**
   * 应用入口组件
   * 功能: 初始化应用,检查连接状态,加载配置
   */
  import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
  import { useHAStore } from './store/ha-store.js'
  import { apiService } from './api/ha-api.js'
  import { setupTvFocusNavigation } from './utils/tv-focus.js'

  export default {
    setup() {
      const store = useHAStore()

      function goHome() {
        uni.reLaunch({
          url: '/pages/home/home'
        })
      }

      /**
       * 应用启动
       */
      onLaunch(async () => {
        console.log('App Launch')
        setupTvFocusNavigation()

        const hasConfig = store.loadConfig()
        const savedUrl = uni.getStorageSync('ha_url')
        const savedToken = uni.getStorageSync('ha_token')

        if (hasConfig && savedUrl && savedToken && apiService.isRuntimeCompatibleUrl(savedUrl)) {
          try {
            await store.initConnection(savedUrl, savedToken)

            console.log('自动连接成功')
            goHome()
            return
          } catch (error) {
            console.error('自动连接失败:', error)
            apiService.clearSavedConfig()
            store.clearCache()
          }
        } else if (savedUrl || savedToken) {
          apiService.clearSavedConfig()
          store.clearCache()
        }

        uni.reLaunch({
          url: '/pages/login/login'
        })
      })

      /**
       * 应用显示
       */
      onShow(() => {
        console.log('App Show')
      })

      /**
       * 应用隐藏
       */
      onHide(() => {
        console.log('App Hide')
      })

      return {}
    }
  }
</script>

<style>
  /* 全局样式 */
  @import './styles/common.css';
  
  /* 图标字体 */
  @import './styles/iconfont.css';

  /* Android TV / large landscape prototype styles */
  @import './styles/tv.css';
</style>
