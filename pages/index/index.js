// index.js
// 引入日志模块（置于顶部，避免在使用前未定义）
const logger = require('../../utils/logger.js')

Page({
  data: {
    
  },

  onLoad: function() {
    // 记录页面生命周期
    logger.logPageLifecycle('Index', 'onLoad')
  },

  // 开始问卷
  startSurvey: function() {
    // 记录用户行为：开始问卷
    logger.info('Index', '开始问卷')
    wx.navigateTo({
      url: '/pages/survey/survey'
    })
  }
})
