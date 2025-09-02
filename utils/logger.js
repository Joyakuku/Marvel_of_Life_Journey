/**
 * 简易Web应用日志模块
 * - 无第三方依赖，体积小
 * - 提供日志级别、时间戳、Tag（模块名/页面名）
 * - 提供页面生命周期与异常捕获辅助方法
 * @module utils/logger
 */

// 日志级别定义（数字越大越详细）
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
let currentLevel = LEVELS.info

// 初始化：从本地存储读取日志级别
function initialize() {
  try {
    const level = localStorage.getItem('logLevel') || 'info'
    setLevel(level)
    console.log(`[Logger] 日志级别已设置为: ${level}`)
  } catch (e) {
    console.warn('[Logger] 读取日志级别失败，使用默认级别', e)
  }
}

// 自动初始化
initialize()

/**
 * 设置日志级别
 * @param {('error'|'warn'|'info'|'debug')} level - 期望级别
 */
function setLevel(level) {
  if (Object.prototype.hasOwnProperty.call(LEVELS, level)) {
    currentLevel = LEVELS[level]
  }
}

/**
 * 获取当前日志级别
 * @returns {string}
 */
function getLevel() {
  return Object.keys(LEVELS).find(k => LEVELS[k] === currentLevel) || 'info'
}

/**
 * 生成时间戳（YYYY-MM-DD HH:mm:ss）
 * @returns {string}
 */
function ts() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 基础日志输出
 * @param {'error'|'warn'|'info'|'debug'} level
 * @param {string} tag - 模块/页面标识
 * @param  {...any} args - 其他内容
 */
function baseLog(level, tag, ...args) {
  if (LEVELS[level] <= currentLevel) {
    const prefix = `[${ts()}][${level.toUpperCase()}]${tag ? `[${tag}]` : ''}`
    switch (level) {
      case 'error':
        console.error(prefix, ...args)
        break
      case 'warn':
        console.warn(prefix, ...args)
        break
      case 'info':
        // 某些端没有 console.info，回退到 log
        ;(console.info || console.log).call(console, prefix, ...args)
        break
      default:
        console.log(prefix, ...args)
    }
  }
}

// 创建日志对象
const logger = {
  /** 切换日志级别 */
  setLevel,
  /** 获取当前日志级别 */
  getLevel,
  /** 细粒度日志 */
  debug: (tag, ...args) => baseLog('debug', tag, ...args),
  info: (tag, ...args) => baseLog('info', tag, ...args),
  warn: (tag, ...args) => baseLog('warn', tag, ...args),
  error: (tag, ...args) => baseLog('error', tag, ...args),

  /**
   * 页面生命周期快捷记录
   * @param {string} pageName - 页面名
   * @param {string} eventName - 生命周期事件
   * @param {object} [extra] - 额外上下文
   */
  logPageLifecycle(pageName, eventName, extra) {
    baseLog('info', pageName, `生命周期: ${eventName}`, extra || {})
  },

  /**
   * 错误捕获统一出口
   * @param {string} pageName - 页面名
   * @param {Error|any} error - 错误对象
   * @param {object} [extra] - 额外上下文
   */
  captureError(pageName, error, extra) {
    baseLog('error', pageName, '异常捕获', error, extra || {})
  }
}

// 将日志对象挂载到全局window对象
window.logger = logger;