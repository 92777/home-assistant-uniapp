<script>
  /**
   * 应用入口组件
   * 功能: 初始化应用,检查连接状态,加载配置
   */
  import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
  import { useHAStore } from './store/ha-store.js'

  export default {
    setup() {
      const store = useHAStore()

      /**
       * 应用启动
       */
      onLaunch(async () => {
        console.log('App Launch')
        
        // 开发模式：使用提供的 token 自动登录
        const devToken = ''
        const devUrl = 'https://demo.example.com'
        
        // 检查是否有保存的配置
        const hasConfig = store.loadConfig()
        
        if (hasConfig) {
          // 尝试自动连接
          try {
            await store.initConnection(
              uni.getStorageSync('ha_url'),
              uni.getStorageSync('ha_token')
            )
            
            console.log('自动连接成功')
          } catch (error) {
            console.error('自动连接失败:', error)
            // 连接失败，使用开发 token
            try {
              await store.initConnection(devUrl, devToken)
              console.log('使用开发 token 连接成功')
            } catch (devError) {
              console.error('开发 token 连接失败:', devError)
              // 跳转到登录页
              uni.redirectTo({
                url: '/pages/login/login'
              })
            }
          }
        } else {
          // 没有配置，使用开发 token 自动登录
          try {
            await store.initConnection(devUrl, devToken)
            console.log('使用开发 token 连接成功')
          } catch (error) {
            console.error('开发 token 连接失败:', error)
            // 跳转到登录页
            uni.redirectTo({
              url: '/pages/login/login'
            })
          }
        }
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
</style>
