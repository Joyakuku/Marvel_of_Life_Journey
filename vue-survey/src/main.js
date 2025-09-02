import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'

/**
 * Vue应用程序入口文件
 * 配置Pinia状态管理、Vue Router路由和全局样式
 */
const app = createApp(App)

// 配置Pinia状态管理
app.use(createPinia())

// 配置Vue Router
app.use(router)

// 挂载应用到DOM
app.mount('#app')

console.log('Vue问卷调查应用已启动')