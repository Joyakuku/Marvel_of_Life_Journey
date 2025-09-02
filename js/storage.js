/**
 * storage.js
 * 本地存储工具模块，替代微信小程序的wx.setStorageSync等API
 * 
 * 注意：此文件依赖于logger.js先加载
 */

// 使用全局日志模块

/**
 * 存储数据到本地
 * @param {string} key - 存储键名
 * @param {any} data - 要存储的数据
 */
function setStorage(key, data) {
  try {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(key, jsonData);
    logger.debug('Storage', `数据已存储: ${key}`);
  } catch (error) {
    logger.error('Storage', `存储数据失败: ${key}`, error);
  }
}

/**
 * 从本地获取数据
 * @param {string} key - 存储键名
 * @param {any} defaultValue - 默认值（当数据不存在时返回）
 * @returns {any} 存储的数据或默认值
 */
function getStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      logger.debug('Storage', `数据不存在: ${key}，返回默认值`);
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (error) {
    logger.error('Storage', `获取数据失败: ${key}`, error);
    return defaultValue;
  }
}

/**
 * 从本地删除数据
 * @param {string} key - 存储键名
 */
function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    logger.debug('Storage', `数据已删除: ${key}`);
  } catch (error) {
    logger.error('Storage', `删除数据失败: ${key}`, error);
  }
}

/**
 * 清除所有本地存储数据
 */
function clearStorage() {
  try {
    localStorage.clear();
    logger.debug('Storage', '所有数据已清除');
  } catch (error) {
    logger.error('Storage', '清除所有数据失败', error);
  }
}

// 导出模块接口
const storage = {
  setStorage,
  getStorage,
  removeStorage,
  clearStorage
};

// 适配Web环境，将模块挂载到全局window对象
window.storage = storage;