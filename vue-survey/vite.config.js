import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    open: true,
    // 通过代理解决开发环境下的跨域问题
    proxy: {
      // 代理API请求到后端服务
      '/api': {
        target: 'http://82.157.38.149:3001',
        changeOrigin: true,
        // 保留原始路径
        rewrite: (path) => path
      },
      // 代理健康检查
      '/health': {
        target: 'http://82.157.38.149:3001',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})