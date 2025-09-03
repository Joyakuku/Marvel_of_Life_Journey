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
        ORDER BY created_at DESC 
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
      const offset = (page - 1) * pageSize;
      
      // 查询总数
      const countSql = 'SELECT COUNT(*) as total FROM survey_results';
      const countResult = await query(countSql);
      const total = countResult[0].total;
      
      // 查询数据
      const dataSql = `
        SELECT * FROM survey_results 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const results = await query(dataSql, [pageSize, offset]);
      
      return {
        data: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('❌ 查询所有问卷结果失败:', error.message);
      throw new Error(`查询问卷结果失败: ${error.message}`);
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
}

module.exports = SurveyResult;