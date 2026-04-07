/**
 * Winston日志模块
 * - 统一将关键操作与错误写入日志文件
 * - 保留控制台输出便于本地调试
 */
const path = require('path')
const { createLogger, format, transports } = require('winston')

const logsDir = path.join(__dirname, '..', 'logs')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logsDir, 'combined.log') })
  ]
})

// 非生产环境同时输出到控制台，便于开发调试
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ level, message, timestamp, ...meta }) => {
        const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
        return `${timestamp} [${level}] ${message}${rest}`
      })
    )
  }))
}

// 专用：管理员操作日志，便于审计与追踪
const adminLogger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.File({ filename: path.join(logsDir, 'admin-operations.log') })
  ]
})
if (process.env.NODE_ENV !== 'production') {
  adminLogger.add(new transports.Console({
    format: format.combine(format.colorize(), format.simple())
  }))
}

// 以属性挂载，保持现有引用方式不变
logger.admin = adminLogger

module.exports = logger