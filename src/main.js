/**
 * 应用主入口
 * 功能: 初始化 Vue 应用,配置 Pinia 状态管理
 */
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  
  return {
    app,
    pinia
  }
}
