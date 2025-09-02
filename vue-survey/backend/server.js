/**
 * Express服务器主文件
 * 整合数据库连接、路由和中间件
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
// 配置dotenv从项目根目录加载.env文件
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 导入路由和工具
const surveyRoutes = require('./routes/survey');
const { testConnection } = require('./config/database');
const { initDatabase, checkConnection } = require('./utils/initDatabase');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

/**
 * 中间件配置
 */
// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  // 记录请求体（排除敏感信息）
  if (req.method !== 'GET' && req.body) {
    const logBody = { ...req.body };
    if (logBody.phone) {
      logBody.phone = logBody.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    console.log('📝 请求数据:', logBody);
  }
  
  next();
});

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
app.use('/api/survey', surveyRoutes);

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
 * 服务器启动函数
 */
async function startServer() {
  try {
    console.log('🚀 正在启动问卷系统后端服务器...');
    
    // 检查数据库连接
    console.log('🔍 检查数据库连接...');
    const dbConnected = await checkConnection();
    
    if (!dbConnected) {
      console.log('⚠️  数据库未连接，尝试初始化数据库...');
      await initDatabase();
      console.log('✅ 数据库初始化完成');
    } else {
      console.log('✅ 数据库连接正常');
    }
    
    // 启动服务器
    const server = app.listen(PORT, () => {
      console.log(`\n🎉 服务器启动成功!`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`📋 API文档: http://localhost:${PORT}/`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📡 API接口:`);
      console.log(`   POST /api/survey/submit - 提交问卷`);
      console.log(`   GET  /api/survey/:id - 查询问卷`);
      console.log(`   GET  /api/survey/phone/:phone - 根据手机号查询`);
      console.log(`   GET  /api/survey - 获取所有问卷（分页）`);
      console.log(`   GET  /api/survey/stats/overview - 获取统计信息`);
      console.log(`\n✨ 服务器就绪，等待请求...\n`);
    });
    
    // 优雅关闭处理
    process.on('SIGTERM', () => {
      console.log('\n🛑 收到SIGTERM信号，正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('\n🛑 收到SIGINT信号，正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('💥 服务器启动失败:', error.message);
    process.exit(1);
  }
}

// 启动服务器
if (require.main === module) {
  startServer();
}

module.exports = app;