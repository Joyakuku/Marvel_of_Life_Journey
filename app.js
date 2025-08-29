// app.js
// 引入日志模块，用于记录应用级生命周期与关键事件
const logger = require('./utils/logger.js')

App({
  /**
   * 小程序初始化时触发（仅一次）
   */
  onLaunch() {
    // 从本地读取日志级别（可通过控制台 wx.setStorageSync('logLevel', 'debug') 设置）
    try {
      const level = wx.getStorageSync('logLevel') || 'info'
      logger.setLevel(level)
      logger.info('App', '应用启动', { level })
    } catch (e) {
      // 若本地存储不可用，使用默认级别并记录警告
      logger.warn('App', '读取日志级别失败，使用默认级别', { message: e && e.message })
    }
  },

  /** 小程序前台显示时触发 */
  onShow() {
    logger.info('App', '应用显示')
  },

  /** 小程序退到后台时触发 */
  onHide() {
    logger.info('App', '应用隐藏')
  },

  // 全局数据，可按需扩展
  globalData: {
    version: '1.0.0'
  }
})
