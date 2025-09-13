/**
 * MySQL数据库连接配置
 * 管理数据库连接池和配置参数
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'survey_db',
  charset: 'utf8mb4',
  timezone: '+08:00',
  // 连接池配置
  connectionLimit: 10,
  // acquireTimeout: 60000,  // MySQL2中无效，已移除
  //timeout: 60000,
  //reconnect: true
  idleTimeout: 60000,    // 空闲连接超时时间
  queueLimit: 0,         // 队列限制，0表示无限制
  // 添加有效的MySQL2连接池配置
  waitForConnections: true,  // 当连接池满时是否等待
  maxIdle: 10,              // 最大空闲连接数
  idleTimeout: 60000,       // 空闲连接超时时间（毫秒）
  enableKeepAlive: true,    // 启用TCP keep-alive
  keepAliveInitialDelay: 0  // keep-alive初始延迟
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

/**
 * 测试数据库连接
 * @returns {Promise<boolean>} 连接是否成功
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL数据库连接成功');
    console.log(`📊 连接到数据库: ${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL数据库连接失败:', error.message);
    return false;
  }
}

/**
 * 执行SQL查询
 * @param {string} sql SQL语句
 * @param {Array} params 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ SQL查询执行失败:', error.message);
    console.error('SQL语句:', sql);
    console.error('参数:', params);
    throw error;
  }
}

/**
 * 执行事务
 * @param {Function} callback 事务回调函数
 * @returns {Promise<any>} 事务结果
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 关闭数据库连接池
 */
async function closePool() {
  try {
    await pool.end();
    console.log('📴 数据库连接池已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接池失败:', error.message);
  }
}

// 导出模块
module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool,
  dbConfig
};

// 程序退出时关闭连接池
process.on('SIGINT', async () => {
  console.log('\n🔄 正在关闭数据库连接...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 正在关闭数据库连接...');
  await closePool();
  process.exit(0);
});