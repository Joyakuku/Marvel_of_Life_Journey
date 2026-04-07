import { defineStore } from 'pinia'

/**
 * UI状态管理（过渡控制）
 * 管理路由过渡动画名称，使不同入口可控地切换动画效果
 * 默认使用淡入淡出，不再提供翻页动画
 *
 * @module stores/ui
 */
export const useUIStore = defineStore('ui', {
  state: () => ({
    /** 当前路由过渡名称，默认使用 'fade' */
    transitionName: 'fade'
  }),
  actions: {
    /**
     * 设置临时过渡动画名称
     * @param {string} name - 过渡名，例如 'fade'
     */
    setTransition(name) {
      this.transitionName = name || 'fade'
      // 使用调试日志记录过渡切换，便于定位视觉交互问题
      console.debug('[UI] 路由过渡切换为:', this.transitionName)
    },
    /**
     * 重置为默认过渡动画
     */
    resetTransition() {
      this.transitionName = 'fade'
      console.debug('[UI] 路由过渡已重置为默认')
    }
  }
})