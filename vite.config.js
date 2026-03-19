import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

function attachChinaWeatherHeaders(proxy) {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.setHeader('Referer', 'https://www.weather.com.cn/')
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0')
  })
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const haProxyTarget = env.VITE_HA_PROXY_TARGET || env.HA_PROXY_TARGET || ''

  return {
    plugins: [uni()],
    server: {
      port: 8080,
      host: true,
      open: false,
      proxy: {
        ...(haProxyTarget
          ? {
              '/api': {
                target: haProxyTarget,
                changeOrigin: true,
                rewrite: (path) => path,
                secure: false,
                ws: true
              },
              '/auth': {
                target: haProxyTarget,
                changeOrigin: true,
                rewrite: (path) => path,
                secure: false
              }
            }
          : {}),
        '/weather-search': {
          target: 'https://toy1.weather.com.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/weather-search/, '/search'),
          secure: false,
          configure: attachChinaWeatherHeaders
        },
        '/weather-now': {
          target: 'https://d1.weather.com.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/weather-now/, '/sk_2d'),
          secure: false,
          configure: attachChinaWeatherHeaders
        },
        '/weather-index': {
          target: 'https://d1.weather.com.cn',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/weather-index/, '/weather_index'),
          secure: false,
          configure: attachChinaWeatherHeaders
        }
      }
    }
  }
})
