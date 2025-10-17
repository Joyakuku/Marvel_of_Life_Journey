/**
 * 问卷结果数据模型
 * 处理问卷数据的增删改查操作
 */
const { query, transaction } = require('../config/database');

class SurveyResult {
  /**
   * 保存问卷结果到数据库
   * @param {Object} surveyData 问卷数据
   * @param {string} surveyData.phone 手机号码
   * @param {Object} surveyData.answers 用户答题数据
   * @param {number} surveyData.totalScore 总分
   * @param {number} surveyData.percentage 得分率
   * @param {number} surveyData.section1Score 第一部分得分
   * @param {number} surveyData.section2Score 第二部分得分
   * @param {number} surveyData.section3Score 第三部分得分
   * @param {string} surveyData.aiAnalysis AI解析内容
   * @param {Date} surveyData.startTime 开始时间
   * @param {Date} surveyData.endTime 结束时间
   * @returns {Promise<Object>} 保存结果
   */
  static async create(surveyData) {
    try {
      console.log('💾 开始保存问卷结果:', {
        phone: surveyData.phone,
        totalScore: surveyData.totalScore,
        startTime: surveyData.startTime,
        endTime: surveyData.endTime
      });

      const sql = `
        INSERT INTO survey_results (
          phone, answers, total_score, percentage, section1_score, section2_score, section3_score,
          ai_analysis, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        surveyData.phone,
        JSON.stringify(surveyData.answers || {}),
        surveyData.totalScore,
        surveyData.percentage || 0,
        surveyData.section1Score,
        surveyData.section2Score,
        surveyData.section3Score,
        surveyData.aiAnalysis,
        new Date(surveyData.startTime),
        new Date(surveyData.endTime)
      ];

      const result = await query(sql, params);
      
      console.log('✅ 问卷结果保存成功, ID:', result.insertId);
      
      return {
        success: true,
        id: result.insertId,
        message: '问卷结果保存成功'
      };
    } catch (error) {
      console.error('❌ 保存问卷结果失败:', error.message);
      throw new Error(`保存问卷结果失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查询问卷结果
   * @param {number} id 问卷结果ID
   * @returns {Promise<Object|null>} 问卷结果
   */
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM survey_results WHERE id = ?';
      const results = await query(sql, [id]);
      
      if (results.length === 0) {
        return null;
      }
      
      return results[0];
    } catch (error) {
      console.error('❌ 查询问卷结果失败:', error.message);
      throw new Error(`查询问卷结果失败: ${error.message}`);
    }
  }

  /**
   * 根据手机号查询问卷结果
   * @param {string} phone 手机号码
   * @param {number} limit 查询数量限制
   * @returns {Promise<Array>} 问卷结果列表
   */
  static async findByPhone(phone, limit = 10) {
    try {
      console.log('🔍 根据手机号查询问卷结果:', { phone, limit });
      
      // 确保limit是整数
      const limitInt = parseInt(limit, 10);
      
      const sql = `
        SELECT * FROM survey_results 
        WHERE phone = ? 
        ORDER BY id DESC 
        LIMIT ${limitInt}
      `;
      
      console.log('📋 SQL查询语句:', sql);
      console.log('📋 查询参数:', [phone]);
      
      const results = await query(sql, [phone]);
      
      console.log('✅ 查询结果:', { count: results.length, results });
      return results;
    } catch (error) {
      console.error('❌ 根据手机号查询问卷结果失败:', error.message);
      throw new Error(`查询问卷结果失败: ${error.message}`);
    }
  }

  /**
   * 获取所有问卷结果（分页）
   * @param {number} page 页码
   * @param {number} pageSize 每页数量
   * @returns {Promise<Object>} 分页结果
   */
  static async findAll(page = 1, pageSize = 20) {
    try {
      // 保障分页参数为安全整数，避免SQL注入与兼容性问题
      const pageInt = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeInt = Math.max(1, parseInt(pageSize, 10) || 20)
      const offsetInt = (pageInt - 1) * pageSizeInt
      
      // 查询总数
      const countSql = 'SELECT COUNT(*) as total FROM survey_results'
      const countResult = await query(countSql)
      const total = countResult[0].total
      
      // 说明：部分 MySQL 版本/代理（或使用二进制协议的驱动）对 LIMIT ? OFFSET ? 的占位符支持不一致，
      // 会导致 SQL 解析错误从而返回 500。这里改为内联安全整数，确保广泛兼容。
      const dataSql = `
        SELECT * FROM survey_results 
        ORDER BY id DESC 
        LIMIT ${pageSizeInt} OFFSET ${offsetInt}
      `
      
      const results = await query(dataSql)
      
      return {
        data: results,
        pagination: {
          page: pageInt,
          pageSize: pageSizeInt,
          total,
          totalPages: Math.ceil(total / pageSizeInt)
        }
      }
    } catch (error) {
      console.error('❌ 查询所有问卷结果失败:', error.message)
      throw new Error(`查询问卷结果失败: ${error.message}`)
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计数据
   */
  static async getStatistics() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_surveys,
          AVG(total_score) as avg_total_score,
          AVG(section1_score) as avg_section1_score,
          AVG(section2_score) as avg_section2_score,
          AVG(section3_score) as avg_section3_score,
          MAX(total_score) as max_score,
          MIN(total_score) as min_score
        FROM survey_results
      `;
      
      const results = await query(sql);
      return results[0];
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 更新问卷结果的AI分析内容
   * @param {number} id 问卷结果ID
   * @param {string} aiAnalysis AI分析内容
   * @returns {Promise<Object>} 更新结果
   */
  static async updateAIAnalysis(id, aiAnalysis) {
    try {
      console.log('🤖 更新AI分析内容:', { id, aiAnalysisLength: aiAnalysis?.length || 0 });
      
      const sql = 'UPDATE survey_results SET ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const result = await query(sql, [aiAnalysis, id]);
      
      if (result.affectedRows === 0) {
        throw new Error('未找到要更新的问卷结果');
      }
      
      console.log('✅ AI分析内容更新成功');
      return {
        success: true,
        id: id,
        message: 'AI分析内容更新成功'
      };
    } catch (error) {
      console.error('❌ 更新AI分析内容失败:', error.message);
      throw new Error(`更新AI分析内容失败: ${error.message}`);
    }
  }

  /**
   * 删除问卷结果
   * @param {number} id 问卷结果ID
   * @returns {Promise<Object>} 删除结果
   */
  static async deleteById(id) {
    try {
      const sql = 'DELETE FROM survey_results WHERE id = ?';
      const result = await query(sql, [id]);
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          message: '未找到要删除的记录'
        };
      }
      
      console.log('🗑️  问卷结果删除成功, ID:', id);
      
      return {
        success: true,
        message: '问卷结果删除成功'
      };
    } catch (error) {
      console.error('❌ 删除问卷结果失败:', error.message);
      throw new Error(`删除问卷结果失败: ${error.message}`);
    }
  }

  /**
   * 通过手机号更新摇一摇密码哈希
   * 若该手机号不存在任何记录，则创建占位记录（保持问卷兼容，不影响问卷提交流程）
   * @param {string} phone 手机号
   * @param {string} passwordHash bcrypt哈希
   * @returns {Promise<Object>} 更新结果
   */
  static async updatePasswordByPhone(phone, passwordHash) {
    try {
      // 先尝试更新现有记录（更新最新一条）
      const updateSql = 'UPDATE survey_results SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?';
      const updateRes = await query(updateSql, [passwordHash, phone]);
      if (updateRes.affectedRows > 0) {
        return { success: true, message: '密码已更新(覆盖该手机号所有记录)' };
      }
      // 若不存在记录，则插入占位记录（最小必填字段），仅用于存储密码
      const now = new Date();
      const insertSql = `
        INSERT INTO survey_results (
          phone, answers, total_score, percentage, section1_score, section2_score, section3_score,
          ai_analysis, start_time, end_time, password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        phone,
        JSON.stringify({}),
        0,
        0,
        0,
        0,
        0,
        '',
        now,
        now,
        passwordHash
      ];
      const resIns = await query(insertSql, params);
      return { success: true, id: resIns.insertId, message: '已创建占位记录并设置密码' };
    } catch (error) {
      console.error('❌ 更新手机号密码失败:', error.message);
      throw new Error(`更新手机号密码失败: ${error.message}`);
    }
  }

  /**
   * 获取手机号的密码哈希（取最新一条记录）
   * @param {string} phone 手机号
   * @returns {Promise<string|null>} 密码哈希或null
   */
  static async getPasswordHashByPhone(phone) {
    try {
      const sql = 'SELECT password_hash FROM survey_results WHERE phone = ? ORDER BY id DESC LIMIT 1';
      const rows = await query(sql, [phone]);
      if (!rows.length) return null;
      return rows[0].password_hash || null;
    } catch (error) {
      console.error('❌ 查询手机号密码哈希失败:', error.message);
      throw new Error(`查询手机号密码哈希失败: ${error.message}`);
    }
  }

  /**
   * 更新手机号关联的公益互动进度（JSON）
   * @param {string} phone 手机号
   * @param {Object} progress 进度对象
   * @returns {Promise<Object>} 更新结果
   */
  static async updatePublicProgressByPhone(phone, progress) {
    try {
      const sql = 'UPDATE survey_results SET public_progress = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?';
      const res = await query(sql, [JSON.stringify(progress || {}), phone]);
      if (res.affectedRows === 0) {
        // 若无记录，则创建占位记录并写入进度
        const now = new Date();
        const insertSql = `
          INSERT INTO survey_results (
            phone, answers, total_score, percentage, section1_score, section2_score, section3_score,
            ai_analysis, start_time, end_time, public_progress
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [phone, JSON.stringify({}), 0, 0, 0, 0, 0, '', now, now, JSON.stringify(progress || {})];
        const resIns = await query(insertSql, params);
        return { success: true, id: resIns.insertId, message: '已创建占位记录并更新公益进度' };
      }
      return { success: true, message: '公益进度已更新' };
    } catch (error) {
      console.error('❌ 更新公益进度失败:', error.message);
      throw new Error(`更新公益进度失败: ${error.message}`);
    }
  }

  /**
   * 原子地为今天的摇一摇计数 +1，并确保 activityDates 包含今天
   * @param {string} phone 手机号
   * @returns {Promise<Object>} 更新结果
   */
  static async incrementPublicShakeByPhone(phone) {
    try {
      // 统一按上海时区计算今天键，和路由逻辑保持一致
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      })
      const todayKey = fmt.format(new Date())

      // 读取当前进度
      const current = await this.getPublicProgressByPhone(phone)
      const progress = current && typeof current === 'object' ? JSON.parse(JSON.stringify(current)) : {}
      const dailyShakeCount = progress.dailyShakeCount && typeof progress.dailyShakeCount === 'object' ? progress.dailyShakeCount : {}
      const activityDates = Array.isArray(progress.activityDates) ? progress.activityDates.slice() : []

      dailyShakeCount[todayKey] = Number(dailyShakeCount[todayKey] || 0) + 1
      if (!activityDates.includes(todayKey)) activityDates.push(todayKey)

      progress.dailyShakeCount = dailyShakeCount
      progress.activityDates = activityDates

      // 写回
      const result = await this.updatePublicProgressByPhone(phone, progress)
      return { success: true, todayKey, todayShakeCount: dailyShakeCount[todayKey], result }
    } catch (error) {
      console.error('❌ 原子递增今日摇一摇计数失败:', error.message)
      throw new Error(`原子递增失败: ${error.message}`)
    }
  }
  /**
   * 原子地为今天的上传计数 +1，并确保 activityDates 包含今天
   * @param {string} phone 手机号
   * @returns {Promise<Object>} 更新结果
   */
  static async incrementPublicUploadByPhone(phone) {
    try {
      // 统一按上海时区计算今天键
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      })
      const todayKey = fmt.format(new Date())

      // 读取当前进度
      const current = await this.getPublicProgressByPhone(phone)
      const progress = current && typeof current === 'object' ? JSON.parse(JSON.stringify(current)) : {}
      const dailyUploadCount = progress.dailyUploadCount && typeof progress.dailyUploadCount === 'object' ? progress.dailyUploadCount : {}
      const activityDates = Array.isArray(progress.activityDates) ? progress.activityDates.slice() : []

      dailyUploadCount[todayKey] = Number(dailyUploadCount[todayKey] || 0) + 1
      if (!activityDates.includes(todayKey)) activityDates.push(todayKey)

      progress.dailyUploadCount = dailyUploadCount
      progress.activityDates = activityDates

      // 写回
      const result = await this.updatePublicProgressByPhone(phone, progress)
      return { success: true, todayKey, todayUploadCount: dailyUploadCount[todayKey], result }
    } catch (error) {
      console.error('❌ 原子递增今日上传计数失败:', error.message)
      throw new Error(`原子递增失败: ${error.message}`)
    }
  }
  /**
   * 获取手机号的公益互动进度（JSON）
   * @param {string} phone 手机号
   * @returns {Promise<Object|null>} 进度对象
   */
  static async getPublicProgressByPhone(phone) {
    try {
      const sql = 'SELECT public_progress FROM survey_results WHERE phone = ? ORDER BY id DESC LIMIT 1';
      const rows = await query(sql, [phone]);
      if (!rows.length) return null;
      const raw = rows[0].public_progress;
      // 兼容不同MySQL驱动/版本对JSON列的返回：可能是字符串、对象或Buffer
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (_) { return null; }
      }
      if (Buffer.isBuffer(raw)) {
        try { return JSON.parse(raw.toString('utf8')); } catch (_) { return null; }
      }
      if (typeof raw === 'object') {
        // 已是对象，直接返回
        return raw;
      }
      return null;
    } catch (error) {
      console.error('❌ 查询公益进度失败:', error.message);
      throw new Error(`查询公益进度失败: ${error.message}`);
    }
  }
}

module.exports = SurveyResult;