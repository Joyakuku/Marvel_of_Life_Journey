/**
 * Vue Router 路由配置
 * 定义应用的路由结构和导航逻辑
 */
import { createRouter, createWebHistory } from 'vue-router'
import Survey from '@/views/Survey.vue'
import Result from '@/views/Result.vue'
import Home from '@/views/Home.vue'

/**
 * 路由配置数组
 */
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '造血干细胞捐献潜力评估',
      description: '欢迎参与造血干细胞捐献潜力评估问卷'
    }
  },
  {
    path: '/survey',
    name: 'Survey',
    component: Survey,
    meta: {
      title: '问卷调查',
      description: '造血干细胞捐献潜力评估问卷',
      requiresStart: true // 需要开始问卷才能访问
    }
  },
  {
    path: '/result',
    name: 'Result',
    component: Result,
    meta: {
      title: '评估结果',
      description: '您的造血干细胞捐献潜力评估结果',
      requiresCompletion: true // 需要完成问卷才能访问
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

/**
 * 创建路由实例
 */
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 路由切换时的滚动行为
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

/**
 * 全局前置守卫
 * 处理路由访问权限和页面标题
 */
router.beforeEach((to, from, next) => {
  console.log(`路由导航: ${from.path} -> ${to.path}`)
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  // 检查路由访问权限
  if (to.meta.requiresStart || to.meta.requiresCompletion) {
    // 这里可以添加状态检查逻辑
    // 例如检查用户是否已开始问卷或完成问卷
    // 暂时允许所有访问
    console.log(`检查路由权限: ${to.name}`)
  }
  
  next()
})

/**
 * 全局后置钩子
 * 路由切换完成后的处理
 */
router.afterEach((to, from) => {
  console.log(`路由切换完成: ${to.name}`)
  
  // 可以在这里添加页面访问统计等逻辑
})

export default router