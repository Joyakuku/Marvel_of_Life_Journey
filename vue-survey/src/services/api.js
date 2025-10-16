/**
 * API服务模块
 * 处理与后端服务器的通信
 */

// API基础配置
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || '')
const API_TIMEOUT = 10000 // 10秒超时
const AI_TIMEOUT = 30000 // AI分析专用30秒超时
// 说明：开发环境下通过Vite代理转发到后端，避免浏览器CORS预检；生产环境使用环境变量配置的后端地址

/**
 * 通用请求函数
 * @param {string} url 请求URL
 * @param {Object} options 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function request(url, options = {}) {
  const controller = new AbortController()
  const timeout = options.timeout || API_TIMEOUT // 支持自定义超时
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    console.log(`API请求: ${options.method || 'GET'} ${url}`);
    
    // 从options中移除timeout，避免传递给fetch
    const { timeout: _, ...fetchOptions } = options
    // 仅在非FormData时设置JSON头，避免multipart被错误覆盖
    const isForm = fetchOptions.body instanceof FormData
    const headers = {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...fetchOptions.headers
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers,
      signal: controller.signal,
      ...fetchOptions
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`API响应成功:`, data)
    return data
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      console.error('API请求超时:', url)
      throw new Error('请求超时，请检查网络连接')
    }
    
    console.error('API请求失败:', error.message)
    throw error
  }
}

/**
 * 问卷API服务
 */
export const surveyAPI = {
  /**
   * 提交问卷结果
   * @param {Object} surveyData 问卷数据
   * @returns {Promise<Object>} 提交结果
   */
  async submitSurvey(surveyData) {
    try {
      console.log('准备提交问卷数据:', surveyData)
      
      // 验证必填字段
      if (!surveyData.phone) {
        throw new Error('手机号码不能为空')
      }
      
      if (surveyData.totalScore === undefined || surveyData.totalScore === null) {
        throw new Error('总分不能为空')
      }
      
      if (!surveyData.startTime || !surveyData.endTime) {
        throw new Error('开始时间和结束时间不能为空')
      }
      
      const response = await request('/api/survey/submit', {
        method: 'POST',
        body: JSON.stringify(surveyData)
      })
      
      return response
      
    } catch (error) {
      console.error('提交问卷失败:', error.message)
      throw error
    }
  },
  
  /**
   * 根据ID查询问卷结果
   * @param {number} id 问卷ID
   * @returns {Promise<Object>} 问卷结果
   */
  async getSurveyById(id) {
    try {
      const response = await request(`/api/survey/${id}`)
      return response
    } catch (error) {
      console.error('查询问卷结果失败:', error.message)
      throw error
    }
  },
  
  /**
   * 根据手机号获取问卷结果
   * @param {string} phone 手机号
   * @param {number} limit 限制数量
   * @returns {Promise<Object>} 问卷结果列表
   */
  async getSurveyByPhone(phone, limit = 10) {
    const response = await request(`/api/survey/phone/${phone}?limit=${limit}`)
    return response
  },

  /**
   * 检查手机号是否已存在问卷记录
   * @param {string} phone 手机号
   * @returns {Promise<Object>} 检查结果
   */
  async checkPhoneExists(phone) {
    try {
      console.log(`检查手机号是否存在: ${phone}`);
      const response = await request(`/api/survey/check/${phone}`)
      console.log(`手机号检查结果:`, response);
      return response
    } catch (error) {
      console.error('检查手机号失败:', error.message);
      throw error;
    }
  },
  
  /**
   * 获取问卷统计信息
   * @returns {Promise<Object>} 统计数据
   */
  async getStatistics() {
    try {
      const response = await request('/api/survey/stats/overview')
      return response
    } catch (error) {
      console.error('获取统计信息失败:', error.message)
      throw error
    }
  },

  /**
   * 生成AI分析
   * @param {Object} analysisData 分析数据
   * @returns {Promise<Object>} AI分析结果
   */
  async generateAIAnalysis(analysisData) {
    try {
      console.log('请求AI分析:', analysisData)
      
      // 使用专门的AI超时设置
      const response = await request('/api/survey/ai-analysis', {
        method: 'POST',
        body: JSON.stringify(analysisData),
        timeout: AI_TIMEOUT // 使用30秒超时
      })
      
      console.log('AI分析结果:', response)
      return response
      
    } catch (error) {
      console.error('AI分析生成失败:', error.message)
      throw error
    }
  },

  /**
   * 检查AI服务状态
   * @returns {Promise<Object>} AI服务状态
   */
  async checkAIStatus() {
    try {
      const response = await request('/api/survey/ai-status')
      return response
    } catch (error) {
      console.error('检查AI服务状态失败:', error.message)
      throw error
    }
  },

  /**
   * 更新问卷结果的AI分析内容
   * @param {number} id 问卷结果ID
   * @param {string} aiAnalysis AI分析内容
   * @returns {Promise<Object>} 更新结果
   */
  async updateAIAnalysis(id, aiAnalysis) {
    try {
      console.log('更新AI分析内容:', { id, aiAnalysisLength: aiAnalysis?.length || 0 })
      
      if (!id) {
        throw new Error('问卷ID不能为空')
      }
      
      if (typeof aiAnalysis !== 'string') {
        throw new Error('AI分析内容必须是字符串类型')
      }
      
      const response = await request(`/api/survey/${id}/ai-analysis`, {
        method: 'PUT',
        body: JSON.stringify({ aiAnalysis })
      })
      
      return response
      
    } catch (error) {
      console.error('更新AI分析内容失败:', error.message)
      throw error
    }
  }
}

/**
 * 健康检查API
 */
export const healthAPI = {
  /**
   * 检查服务器健康状态
   * @returns {Promise<Object>} 健康状态
   */
  async checkHealth() {
    try {
      const response = await request('/health')
      return response
    } catch (error) {
      console.error('健康检查失败:', error.message)
      throw error
    }
  }
}

/**
 * 工具函数：检查API连接状态
 * @returns {Promise<boolean>} 连接状态
 */
export async function checkAPIConnection() {
  try {
    await healthAPI.checkHealth()
    console.log('API连接正常')
    return true
  } catch (error) {
    console.warn('API连接失败:', error.message)
    return false
  }
}

/**
 * 摇一摇API服务
 */
export const shakeAPI = {
  /** 设置或更新密码（按手机号） */
  async setPassword(phone, password, oldPassword) {
    // 传递新旧密码，后端会在已存在密码时要求原密码校验
    return await request('/api/shake/password/set', {
      method: 'POST',
      body: JSON.stringify({ phone, password, oldPassword })
    })
  },
  /** 验证密码（进入页面或发布前） */
  async verifyPassword(phone, password) {
    return await request('/api/shake/password/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    })
  },
  /** 发布祝福（需要密码通过） */
  async createBlessing(payload) {
    return await request('/api/shake/blessing', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  /** 上传主题图片（multipart） */
  async uploadImage(file) {
    const fd = new FormData()
    fd.append('file', file)
    return await request('/api/shake/upload/image', {
      method: 'POST',
      body: fd
    })
  },
  /** 随机获取祝福 */
  async randomBlessing(tag) {
    const q = tag ? `?tag=${encodeURIComponent(tag)}` : ''
    return await request(`/api/shake/blessing/random${q}`)
  },
  /** 点赞 */
  async like(id) {
    return await request(`/api/shake/blessing/${id}/like`, { method: 'POST' })
  },
  /** 赠章 */
  async medal(id) {
    return await request(`/api/shake/blessing/${id}/medal`, { method: 'POST' })
  },
  /** 获取/更新公益进度 */
  async getProgress(phone) { return await request(`/api/shake/progress/${phone}`) },
  async setProgress(phone, progress) {
    return await request(`/api/shake/progress/${phone}`, {
      method: 'POST',
      body: JSON.stringify({ progress })
    })
  }
}

/**
 * 摇一摇审核管理API（管理员）
 * 使用自定义头 X-Admin-Token 进行简单鉴权
 */
export const shakeAdminAPI = {
  /** 获取祝福列表（按状态分页） */
  async listBlessings({ status = 'pending', tag = '', page = 1, pageSize = 20, adminToken }) {
    const q = new URLSearchParams()
    if (status) q.set('status', status)
    if (tag) q.set('tag', tag)
    q.set('page', String(page))
    q.set('pageSize', String(pageSize))
    return await request(`/api/shake/admin/blessings?${q.toString()}`, {
      headers: { 'X-Admin-Token': adminToken || '' }
    })
  },
  /** 更新审核状态 */
  async reviewBlessing(id, status, adminToken) {
    // 兼容性增强：同时通过 body、query 与自定义头传递 status，避免代理丢失请求体
    const s = String(status || '').toLowerCase()
    const url = `/api/shake/admin/blessing/${id}/review?status=${encodeURIComponent(s)}`
    return await request(url, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken || '', 'X-Status': s },
      body: JSON.stringify({ status: s })
    })
  },
  /** 获取祝福详情 */
  async getBlessing(id, adminToken) {
    return await request(`/api/shake/admin/blessing/${id}`, {
      headers: { 'X-Admin-Token': adminToken || '' }
    })
  },
  /** 删除祝福 */
  async deleteBlessing(id, adminToken) {
    return await request(`/api/shake/admin/blessing/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': adminToken || '' }
    })
  },
  /** 批量审核 */
  async reviewBulk(ids, status, adminToken) {
    return await request(`/api/shake/admin/blessings/review-bulk`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken || '' },
      body: JSON.stringify({ ids, status })
    })
  },
  /** 管理员统计 */
  async getStats(adminToken) {
    return await request(`/api/shake/admin/stats`, {
      headers: { 'X-Admin-Token': adminToken || '' }
    })
  },
  /** 搜索祝福 */
  async search({ q = '', status = '', page = 1, pageSize = 20, adminToken }) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (status) p.set('status', status)
    p.set('page', String(page))
    p.set('pageSize', String(pageSize))
    return await request(`/api/shake/admin/search?${p.toString()}`, {
      headers: { 'X-Admin-Token': adminToken || '' }
    })
  }
}
/**
 * 解析文件URL为可访问的绝对地址
 * - 若原始url为http(s)，直接返回
 * - 若为相对路径（如/uploads/...），在开发环境使用 `VITE_PROXY_TARGET` 前缀；生产使用 `VITE_API_BASE_URL`
 */
export function resolveFileUrl(url) {
  try {
    if (!url) return ''
    const isAbsolute = /^https?:\/\//i.test(url)
    const dev = import.meta.env.DEV
    const devBase = import.meta.env.VITE_PROXY_TARGET || ''
    const prodBase = import.meta.env.VITE_API_BASE_URL || ''
    const baseStr = dev ? devBase : prodBase

    if (isAbsolute) {
      // 处理后端返回的 localhost/127.0.0.1 绝对地址在生产环境下不可访问的问题
      const u = new URL(url)
      const b = baseStr ? new URL(baseStr) : null
      // 若是上传静态路径（/uploads），统一按后端基址重写，保证端口正确
      if (b && u.pathname.startsWith('/uploads')) {
        const b = new URL(baseStr)
        u.protocol = b.protocol
        u.host = b.host
        return u.toString()
      }
      // 若缺少端口，且我们有后端基址，补齐端口
      if (b && !u.port && (!dev || u.hostname === b.hostname)) {
        u.protocol = b.protocol
        u.host = b.host
        return u.toString()
      }
      return u.toString()
    }
    // 相对路径：拼接环境基址
    if (!baseStr) return url
    return new URL(url, baseStr).toString()
  } catch (_) {
    return url || ''
  }
}

export default {
  surveyAPI,
  healthAPI,
  checkAPIConnection
}