/**
 * Express服务器主文件
 * 整合数据库连接、路由和中间件
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
// 配置dotenv从项目根目录加载.env文件
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 导入路由和工具
const surveyRoutes = require('./routes/survey');
// 新增：摇一摇路由（不影响原有survey功能）
const shakeRoutes = require('./routes/shake');
const { testConnection } = require('./config/database');
const { commonLimiter, strictLimiter, uploadLimiter, aiLimiter } = require('./middleware/rateLimit');
const { initDatabase, checkConnection } = require('./utils/initDatabase');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;
// 新增：是否启用无数据库模式（保持向后兼容，不改变默认行为）
const DISABLE_DB = String(process.env.DISABLE_DB || 'false').toLowerCase() === 'true'
// 识别反向代理的 HTTPS 头部
app.set('trust proxy', 1)

/**
 * 中间件配置
 */
// CORS配置
app.use(cors({
  origin: (origin, callback) => {
    // 支持本地无Origin（如curl、Postman）
    if (!origin) return callback(null, true)
    // 从环境变量读取白名单，支持逗号分隔
    const list = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim())
    if (list.includes(origin)) {
      return callback(null, true)
    }
    // 允许直接访问IP本身（防止遗漏80/443端口）
    if (origin.startsWith('http://82.157.38.149') || origin.startsWith('https://82.157.38.149')) {
      return callback(null, true)
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // 允许前端携带管理员令牌请求头
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 600 // 预检结果缓存10分钟
}))

// 安全响应头（Helmet）
// 允许跨域资源加载（如前端从不同源访问 /uploads/* 图片）
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));
if (String(process.env.NODE_ENV).toLowerCase() === 'production') {
  // 仅生产环境启用HSTS，避免本地开发影响
  app.use(helmet.hsts({ maxAge: 15552000 })); // 180天
}

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 处理私有网络访问（Private Network Access）
app.use((req, res, next) => {
  // 为响应添加 'Access-Control-Allow-Private-Network: true' 头
  // 这是为了解决从公共网络地址（如部署的前端）访问本地开发服务器（localhost）
  // 时出现的CORS策略问题。
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

// 请求日志中间件（脱敏敏感字段，避免泄露密码/令牌）
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // 跳过GET与multipart/form-data体日志，防止日志膨胀与文件内容泄露
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const isMultipart = contentType.startsWith('multipart/form-data');

  if (req.method !== 'GET' && !isMultipart && req.body) {
    const SENSITIVE_KEYS = new Set([
      'password', 'oldpassword', 'token', 'authorization', 'x-admin-token', 'admintoken'
    ]);
    const sanitizeBody = (body = {}) => {
      const out = {};
      for (const [key, val] of Object.entries(body)) {
        const k = String(key);
        const kl = k.toLowerCase();
        if (kl === 'phone' && typeof val === 'string') {
          out[k] = val.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        } else if (SENSITIVE_KEYS.has(kl)) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = val;
        }
      }
      return out;
    };

    const logBody = sanitizeBody(req.body);
    console.log('📝 请求数据(已脱敏):', logBody);
  }

  next();
});

/**
 * 静态资源托管：用于用户上传的祝福主题图片
 * - 路径：/uploads/blessings
 * - 在服务器启动时确保目录存在
 */
try {
  const uploadBase = path.join(__dirname, 'uploads');
  const blessingsDir = path.join(uploadBase, 'blessings');
  fs.mkdirSync(blessingsDir, { recursive: true });
  app.use('/uploads', express.static(uploadBase, {
    etag: true,
    lastModified: true,
    cacheControl: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    }
  }));
  console.log(`📁 静态上传目录已就绪: ${uploadBase}`);
} catch (e) {
  console.warn('⚠️ 初始化上传目录失败:', e.message);
}

/**
 * 路由配置
 */
// 健康检查接口
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkConnection();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API路由
// 在挂载具体路由前应用限流器
app.use('/api', (req, res, next) => {
  const p = req.path || ''
  if (p.startsWith('/shake/blessing/random')) return next()
  return commonLimiter(req, res, next)
});
app.use('/api/survey/submit', strictLimiter);
app.use('/api/survey/ai-analysis', aiLimiter);
app.use('/api/shake/upload/image', uploadLimiter);
app.use('/api/shake/upload/audio', uploadLimiter);
app.use('/api/shake/blessing', (req, res, next) => {
  const m = String(req.method || '').toUpperCase()
  const p = req.path || ''
  if (m === 'POST') return strictLimiter(req, res, next)
  if (p.endsWith('/like') || p.endsWith('/medal')) return strictLimiter(req, res, next)
  return next()
});
app.use('/api/shake/password', strictLimiter);
app.use('/api/shake/admin', require('./middleware/rateLimit').adminLimiter);
app.use('/api/survey', surveyRoutes);
// 新增：挂载摇一摇模块API（路径前缀与survey保持一致为 /api/*）
app.use('/api/shake', shakeRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '问卷系统后端API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      survey: '/api/survey',
      submit: '/api/survey/submit',
      stats: '/api/survey/stats/overview'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  console.error('💥 服务器错误:', error);
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
});

/**
 * 服务器启动函数（非阻塞启动）
 * - 保持原有行为：HTTP服务优先启动
 * - 新增后台DB检查/初始化，避免阻塞导致上游502
 */
async function startServer() {
  try {
    console.log('🚀 正在启动问卷系统后端服务器...')

    // 先启动服务器，避免因DB检查阻塞导致未监听端口
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎉 服务器启动成功!`)
      console.log(`📍 服务地址: http://localhost:${PORT}`)
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`)
      console.log(`📋 API文档: http://localhost:${PORT}/`)
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🗄️  无数据库模式: ${DISABLE_DB ? '启用' : '禁用'}`)
      console.log(`\n📡 API接口:`)
      console.log(`   POST /api/survey/submit - 提交问卷`)
      console.log(`   GET  /api/survey/:id - 查询问卷`)
      console.log(`   GET  /api/survey/phone/:phone - 根据手机号查询`)
      console.log(`   GET  /api/survey - 获取所有问卷（分页）`)
      console.log(`   GET  /api/survey/stats/overview - 获取统计信息`)
      console.log(`   POST /api/shake/password/set - 设置密码`)
      console.log(`   POST /api/shake/password/verify - 验证密码`)
      console.log(`   POST /api/shake/blessing - 发布祝福`)
      console.log(`   GET  /api/shake/blessing/random - 随机祝福`)
      console.log(`   POST /api/shake/blessing/:id/like - 点赞`)
      console.log(`   POST /api/shake/blessing/:id/medal - 赠章`)
      console.log(`   GET  /api/shake/progress/:phone - 获取公益进度`)
      console.log(`   POST /api/shake/progress/:phone - 更新公益进度`)
      console.log(`   GET  /api/shake/admin/blessings - 管理员获取祝福列表(需X-Admin-Token)`) 
      console.log(`   POST /api/shake/admin/blessing/:id/review - 管理员更新审核状态(需X-Admin-Token)`) 
      console.log(`\n✨ 服务器就绪，等待请求...\n`)
    })

    // 优雅关闭处理（保持原有逻辑）
    process.on('SIGTERM', () => {
      console.log('\n🛑 收到SIGTERM信号，正在关闭服务器...')
      server.close(() => { console.log('✅ 服务器已关闭'); process.exit(0) })
    })
    process.on('SIGINT', () => {
      console.log('\n🛑 收到SIGINT信号，正在关闭服务器...')
      server.close(() => { console.log('✅ 服务器已关闭'); process.exit(0) })
    })

    // 后台异步检查/初始化数据库（新增，避免阻塞）
    setImmediate(async () => {
      const withTimeout = (promise, ms, name = 'operation') => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timeout after ${ms}ms`)), ms))
        ])
      }

      try {
        if (DISABLE_DB) {
          console.warn('⚠️  已启用无数据库模式(DISABLE_DB=true)，跳过数据库检查与初始化。')
          return
        }

        console.log('🔍 后台检查数据库连接...')
        const dbConnected = await withTimeout(checkConnection(), 5000, 'checkConnection')
        if (dbConnected) {
          console.log('✅ 数据库连接正常')
        } else {
          console.warn('⚠️  数据库未连接，尝试后台初始化...')
          await withTimeout(initDatabase(), 15000, 'initDatabase')
          console.log('✅ 数据库初始化完成')
        }
      } catch (e) {
        console.warn(`⚠️  后台DB检查/初始化异常：${e.message}`)
      }
    })
  } catch (error) {
    console.error('💥 服务器启动失败:', error.message)
    process.exit(1)
  }
}

// 启动服务器
if (require.main === module) {
  startServer();
}

module.exports = app;