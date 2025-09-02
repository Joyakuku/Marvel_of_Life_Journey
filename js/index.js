/**
 * index.js
 * 首页JavaScript逻辑
 */

// 使用全局日志模块

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 记录页面生命周期
  logger.info('Index', '页面加载完成');
  
  // 获取开始问卷按钮
  const startSurveyBtn = document.getElementById('startSurveyBtn');
  
  // 绑定开始问卷按钮点击事件
  if (startSurveyBtn) {
    startSurveyBtn.addEventListener('click', function() {
      logger.info('Index', '点击开始问卷按钮');
      // 跳转到问卷页面
      window.location.href = 'survey.html';
    });
  }
  

});