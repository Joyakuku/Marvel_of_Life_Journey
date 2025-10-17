<template>
  <div id="app">
    <!--
      路由视图容器包裹在具有透视的外层，以支持3D翻页动画
      使用动态过渡名称，可由UI Store按需切换（如首页页脚入口触发）
    -->
    <div class="view-wrapper">
      <!--
        使用过渡包裹统一的页面容器，确保入/出场并行叠加，减少中间空白
        通过 slot 提供的 route.fullPath 作为 key，保证两页并存时可稳定分层
      -->
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in" @after-enter="resetTransition">
          <div class="page" :key="route.fullPath">
            <component :is="Component" />
          </div>
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

/**
 * 根组件App.vue
 * - 包含路由视图并统一管理页面过渡效果
 * - 通过Pinia的UI Store动态切换过渡名称（默认fade）
 */
export default {
  name: 'App',
  setup() {
    const ui = useUIStore()
    // 响应式绑定当前过渡名称
    const transitionName = computed(() => ui.transitionName)
    // 路由进入后重置为默认过渡，避免影响后续普通导航
    const resetTransition = () => ui.resetTransition()
    return { transitionName, resetTransition }
  },
  mounted() {
    console.log('Vue问卷调查应用根组件已挂载')
  }
}
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
}

/*
  3D翻页动画容器：为子视图提供透视环境
  注意：使用 overflow hidden 避免翻页过程中出现滚动条闪烁
*/
.view-wrapper {
  min-height: 100vh;
  overflow: hidden;
}

/* 默认淡入淡出过渡 */
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }


/* 页面统一样式：承担背景与尺寸，降低白屏风险 */
.page {
  min-height: 100vh;
  background: var(--app-bg, #f5f5f5);
  backface-visibility: hidden; /* 防止背面渲染导致闪白 */
  will-change: transform, opacity;
  position: relative;
  overflow: hidden;
}

.view-wrapper { background: var(--app-bg, #f5f5f5); isolation: isolate; }
/* 降级支持：减少动效时保持淡入淡出 */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active { transition: opacity .01s linear; }
}
</style>