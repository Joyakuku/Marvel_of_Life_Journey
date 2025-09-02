<template>
  <div id="app">
    <!-- Vue Router视图容器 -->
    <router-view />
  </div>
</template>

<script>
/**
 * 根组件App.vue
 * 作为整个Vue应用的容器，包含路由视图
 */
export default {
  name: 'App',
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
</style>