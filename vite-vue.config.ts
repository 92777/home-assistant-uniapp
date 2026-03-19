import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const haProxyTarget = env.VITE_HA_PROXY_TARGET || env.HA_PROXY_TARGET || ''

  return {
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
      proxy: haProxyTarget
        ? {
            '/api': {
              target: haProxyTarget,
              changeOrigin: true,
              rewrite: (path) => path
            }
          }
        : undefined
    }
  }
})
