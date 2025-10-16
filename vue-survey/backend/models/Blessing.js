/**
 * 公益祝福数据模型（摇一摇）
 * 负责 blessings 表的CRUD与简单统计
 */
const { query } = require('../config/database')

class Blessing {
  /**
   * 创建祝福内容
   * @param {Object} data { phone, title, tag, content, image_url, audio_url }
   */
  static async create(data) {
    try {
      const sql = `
        INSERT INTO blessings (phone, title, tag, content, image_url, audio_url, review_status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `
      const params = [data.phone, data.title, data.tag || null, data.content, data.image_url || null, data.audio_url || null]
      const res = await query(sql, params)
      return { success: true, id: res.insertId }
    } catch (error) {
      console.error('❌ 创建祝福失败:', error.message)
      throw new Error(`创建祝福失败: ${error.message}`)
    }
  }

  /**
   * 随机获取一条祝福（默认仅返回审核通过的，若无则退化到全部）
   */
  static async findRandom(tag) {
    try {
      // 严格要求：仅返回审核通过的记录，不再回退到全部
      let sqlApproved = 'SELECT * FROM blessings WHERE review_status = "approved"'
      const params = []
      if (tag) { sqlApproved += ' AND tag = ?'; params.push(tag) }
      sqlApproved += ' ORDER BY RAND() LIMIT 1'
      const rowsApproved = await query(sqlApproved, params)
      return rowsApproved.length ? rowsApproved[0] : null
    } catch (error) {
      console.error('❌ 随机获取祝福失败:', error.message)
      throw new Error(`随机获取祝福失败: ${error.message}`)
    }
  }

  static async incrementLike(id) {
    try {
      const sql = 'UPDATE blessings SET likes = likes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      const res = await query(sql, [id])
      return { success: res.affectedRows > 0 }
    } catch (error) {
      console.error('❌ 点赞失败:', error.message)
      throw new Error(`点赞失败: ${error.message}`)
    }
  }

  static async incrementMedal(id) {
    try {
      const sql = 'UPDATE blessings SET medals = medals + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      const res = await query(sql, [id])
      return { success: res.affectedRows > 0 }
    } catch (error) {
      console.error('❌ 赠章失败:', error.message)
      throw new Error(`赠章失败: ${error.message}`)
    }
  }

  /**
   * 根据审核状态分页获取祝福列表
   * @param {Object} opts 查询选项 { status, tag, page, pageSize }
   * @returns {Promise<Array>} 祝福列表
   */
  static async listByStatus(opts = {}) {
    try {
      const status = opts.status || null
      const tag = opts.tag || null
      const page = Math.max(1, Number(opts.page) || 1)
      const pageSize = Math.max(1, Math.min(100, Number(opts.pageSize) || 20))
      const offset = (page - 1) * pageSize
      const params = []

      let sql = 'SELECT * FROM blessings'
      const where = []
      if (status) { where.push('review_status = ?'); params.push(status) }
      if (tag) { where.push('tag = ?'); params.push(tag) }
      if (where.length) sql += ' WHERE ' + where.join(' AND ')
      // 兼容部分MySQL环境不支持在LIMIT/OFFSET中使用占位符的情况：
      // 使用经过边界校验的数字内联，避免SQL注入风险（仅数字）。
      sql += ` ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`

      const rows = await query(sql, params)
      return rows
    } catch (error) {
      console.error('❌ 获取祝福列表失败:', error.message)
      throw new Error(`获取祝福列表失败: ${error.message}`)
    }
  }

  /**
   * 更新祝福审核状态
   * @param {number} id 祝福ID
   * @param {string} status 审核状态('approved'|'rejected'|'pending')
   * @returns {Promise<Object>} 更新结果
   */
  static async updateReviewStatus(id, status) {
    try {
      const allowed = ['pending', 'approved', 'rejected']
      if (!allowed.includes(String(status))) {
        throw new Error('非法审核状态')
      }
      const sql = 'UPDATE blessings SET review_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      const res = await query(sql, [status, id])
      return { success: res.affectedRows > 0 }
    } catch (error) {
      console.error('❌ 更新审核状态失败:', error.message)
      throw new Error(`更新审核状态失败: ${error.message}`)
    }
  }

  /**
   * 获取单条祝福详情
   * @param {number} id 祝福ID
   * @returns {Promise<Object|null>} 祝福记录
   */
  static async getById(id) {
    try {
      const sql = 'SELECT * FROM blessings WHERE id = ?'
      const rows = await query(sql, [id])
      return rows.length ? rows[0] : null
    } catch (error) {
      console.error('❌ 获取祝福详情失败:', error.message)
      throw new Error(`获取祝福详情失败: ${error.message}`)
    }
  }

  /**
   * 删除单条祝福
   * @param {number} id 祝福ID
   * @returns {Promise<Object>} 删除结果
   */
  static async deleteById(id) {
    try {
      const sql = 'DELETE FROM blessings WHERE id = ?'
      const res = await query(sql, [id])
      return { success: res.affectedRows > 0 }
    } catch (error) {
      console.error('❌ 删除祝福失败:', error.message)
      throw new Error(`删除祝福失败: ${error.message}`)
    }
  }

  /**
   * 获取祝福统计数据
   * @returns {Promise<Object>} 统计
   */
  static async getStats() {
    try {
      const rowsStatus = await query('SELECT review_status, COUNT(*) AS count FROM blessings GROUP BY review_status', [])
      const rowsTotals = await query('SELECT COALESCE(SUM(likes),0) AS total_likes, COALESCE(SUM(medals),0) AS total_medals FROM blessings', [])
      const stats = { statusCounts: {}, totals: rowsTotals[0] || { total_likes: 0, total_medals: 0 } }
      for (const r of rowsStatus) { stats.statusCounts[r.review_status] = Number(r.count) || 0 }
      return stats
    } catch (error) {
      console.error('❌ 获取祝福统计失败:', error.message)
      throw new Error(`获取祝福统计失败: ${error.message}`)
    }
  }

  /**
   * 关键字搜索祝福（按标题/内容/手机号）
   * @param {Object} opts { q, status, page, pageSize }
   * @returns {Promise<Array>} 列表
   */
  static async searchByKeyword(opts = {}) {
    try {
      const q = String(opts.q || '').trim()
      const status = opts.status || null
      const page = Math.max(1, Number(opts.page) || 1)
      const pageSize = Math.max(1, Math.min(100, Number(opts.pageSize) || 20))
      const offset = (page - 1) * pageSize
      const params = []

      let sql = 'SELECT * FROM blessings'
      const where = []
      if (q) { where.push('(title LIKE ? OR content LIKE ? OR phone LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`) }
      if (status) { where.push('review_status = ?'); params.push(status) }
      if (where.length) sql += ' WHERE ' + where.join(' AND ')
      // 同上，避免LIMIT/OFFSET占位符兼容性问题
      sql += ` ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`

      const rows = await query(sql, params)
      return rows
    } catch (error) {
      console.error('❌ 搜索祝福失败:', error.message)
      throw new Error(`搜索祝福失败: ${error.message}`)
    }
  }
}

module.exports = Blessing