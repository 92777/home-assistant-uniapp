import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src-vue'
    }
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    // 配置代理来解决 CORS 问题
    proxy: {
      '/api': {
        target: 'https://demo.example.com',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
