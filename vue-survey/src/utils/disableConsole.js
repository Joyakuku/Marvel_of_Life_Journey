// 全局禁用前端控制台输出
// 说明：覆盖所有常见 console 方法为空函数，避免任何日志输出
// 如需临时启用，可注释本文件的内容或在入口移除引入

const noop = () => {}

// 要禁用的 console 方法列表
const methods = ['log', 'info', 'debug', 'warn', 'error', 'trace']

try {
  for (const m of methods) {
    // 仅当存在该方法时才覆盖
    if (typeof console[m] === 'function') {
      console[m] = noop
    }
  }
} catch (_) {
  // 覆盖失败时静默处理，确保不抛出异常影响运行
}