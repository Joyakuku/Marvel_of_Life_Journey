/**
 * app.js
 * 全局JavaScript逻辑，负责初始化日志模块和其他全局功能
 */

// 初始化日志模块
function initLogger() {
  // 如果已经加载了logger模块，直接返回
  if (window.logger) return window.logger;
  
  // 日志级别定义
  const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
  let currentLevel = LEVELS.info;
  
  // 尝试从本地存储读取日志级别
  try {
    const level = localStorage.getItem('logLevel') || 'info';
    if (LEVELS[level] !== undefined) {
      currentLevel = LEVELS[level];
      console.log(`[Logger] 日志级别已设置为: ${level}`);
    }
  } catch (e) {
    console.warn('[Logger] 读取日志级别失败，使用默认级别', e);
  }
  
  // 格式化日志内容
  function formatLog(tag, message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${tag}] ${message}${dataStr}`;
  }
  
  // 创建日志对象
  const logger = {
    setLevel(level) {
      if (LEVELS[level] !== undefined) {
        currentLevel = LEVELS[level];
        localStorage.setItem('logLevel', level);
        console.log(`[Logger] 日志级别已设置为: ${level}`);
      } else {
        console.warn(`[Logger] 无效的日志级别: ${level}，使用默认级别: info`);
      }
    },
    
    getLevel() {
      return Object.keys(LEVELS).find(k => LEVELS[k] === currentLevel) || 'info';
    },
    
    debug(tag, message, data) {
      if (currentLevel >= LEVELS.debug) {
        console.debug(formatLog(tag, message, data));
      }
    },
    
    info(tag, message, data) {
      if (currentLevel >= LEVELS.info) {
        console.info(formatLog(tag, message, data));
      }
    },
    
    warn(tag, message, data) {
      if (currentLevel >= LEVELS.warn) {
        console.warn(formatLog(tag, message, data));
      }
    },
    
    error(tag, message, data) {
      if (currentLevel >= LEVELS.error) {
        console.error(formatLog(tag, message, data));
      }
    },
    
    logPageLifecycle(pageName, eventName, extra) {
      this.info(pageName, `生命周期: ${eventName}`, extra || {});
    },
    
    captureError(pageName, error, extra) {
      const errorData = {
        message: error.message,
        stack: error.stack,
        ...extra
      };
      this.error(pageName, '异常捕获', errorData);
    }
  };
  
  // 挂载到全局对象
  window.logger = logger;
  
  return logger;
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 初始化日志模块
  const logger = initLogger();
  logger.info('App', '应用初始化');
  
  // 记录页面加载完成事件
  const pageName = document.title || window.location.pathname.split('/').pop() || 'Unknown';
  logger.logPageLifecycle(pageName, 'onLoad');
  
  // 全局错误捕获
  window.onerror = function(message, source, lineno, colno, error) {
    logger.captureError('Global', error || new Error(message), { source, lineno, colno });
    return false;
  };
  
  // 未捕获的Promise错误
  window.addEventListener('unhandledrejection', function(event) {
    logger.captureError('Promise', event.reason || new Error('Unhandled Promise Rejection'), {});
  });
});

// 页面卸载前执行
window.addEventListener('beforeunload', function() {
  const logger = window.logger;
  if (logger) {
    const pageName = document.title || window.location.pathname.split('/').pop() || 'Unknown';
    logger.logPageLifecycle(pageName, 'onUnload');
  }
});