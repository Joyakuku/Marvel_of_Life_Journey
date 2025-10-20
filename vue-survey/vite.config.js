import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 允许通过环境变量切换代理目标（默认仍指向远端，便于生产预览；开发可设置 VITE_PROXY_TARGET=http://localhost:3001）
const TARGET = process.env.VITE_PROXY_TARGET || 'http://82.157.38.149:3001'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 移除所有 console 与 debugger（开发与构建阶段均生效）
  esbuild: {
    drop: ['console', 'debugger']
  },
  server: {
    port: 3000,
    open: true,
    // 通过代理解决开发环境下的跨域问题
    proxy: {
      // 代理API请求到后端服务
      '/api': {
        target: TARGET,
        changeOrigin: true,
        // 保留原始路径
        rewrite: (path) => path
      },
      // 代理健康检查
      '/health': {
        target: TARGET,
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