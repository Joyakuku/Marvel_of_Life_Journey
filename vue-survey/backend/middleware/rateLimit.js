const rateLimit = require('express-rate-limit')

// 通用限流：每15分钟最多300次请求（每IP）
const commonLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试' }
})

// 严格限流：写入类接口（提交/点赞/赠章/密码），每10分钟最多30次
const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '操作过于频繁，请稍后再试' }
})

// 上传限流：图片上传，每10分钟最多10次
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '上传过于频繁，请稍后再试' }
})

// AI分析限流：避免外部API滥用，每10分钟最多20次
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '分析请求过于频繁，请稍后再试' }
})

// 管理员审核限流：更宽松，支持较高频次列表/搜索/审核操作
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '操作过于频繁，请稍后再试' }
})

module.exports = {
  commonLimiter,
  strictLimiter,
  uploadLimiter,
  aiLimiter,
  adminLimiter
}