import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    port: 8080,
    host: true,
    open: false,
    // 配置代理来解决 CORS 问题
    proxy: {
      '/api': {
        target: 'https://demo.example.com',
        changeOrigin: true,
        rewrite: (path) => path,
        // 配置 HTTPS
        secure: false,
        // 配置 WebSocket
        ws: true
      },
      '/auth': {
        target: 'https://demo.example.com',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false
      }
    }
  }
})
