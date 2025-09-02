/**
 * 数据库初始化脚本
 * 自动创建数据库和表结构
 */
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * 初始化数据库
 */
async function initDatabase() {
  let connection;
  
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });
    
    console.log('✅ 已连接到MySQL服务器');
    
    // 读取SQL文件
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const sqlContent = await fs.readFile(schemaPath, 'utf8');
    
    // 分割SQL语句（按分号分割，过滤空语句和注释）
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => {
        // 移除注释行和空行
        return stmt
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*');
          })
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt && stmt.length > 0);
    
    console.log(`📝 准备执行 ${sqlStatements.length} 条SQL语句`);
    
    // 执行每条SQL语句
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      if (statement) {
        try {
          await connection.query(statement);
          console.log(`✅ 执行成功 (${i + 1}/${sqlStatements.length}): ${statement.substring(0, 50)}...`);
        } catch (error) {
          console.warn(`⚠️  执行警告 (${i + 1}/${sqlStatements.length}): ${error.message}`);
        }
      }
    }
    
    console.log('🎉 数据库初始化完成！');
    
    // 验证表是否创建成功
    await connection.query('USE survey_db');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 已创建的表:', tables.map(row => Object.values(row)[0]));
    
    // 显示表结构
    const [columns] = await connection.query('DESCRIBE survey_results');
    console.log('🏗️  survey_results表结构:');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Extra}`);
    });
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

/**
 * 检查数据库连接
 */
async function checkConnection() {
  try {
    const { testConnection } = require('../config/database');
    const isConnected = await testConnection();
    return isConnected;
  } catch (error) {
    console.error('❌ 数据库连接检查失败:', error.message);
    return false;
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('\n✨ 数据库初始化脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 数据库初始化失败:', error.message);
      process.exit(1);
    });
}

module.exports = {
  initDatabase,
  checkConnection
};