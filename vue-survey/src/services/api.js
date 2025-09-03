/**
 * API服务模块
 * 处理与后端服务器的通信
 */

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const API_TIMEOUT = 10000 // 10秒超时
const AI_TIMEOUT = 30000 // AI分析专用30秒超时

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
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      },
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

export default {
  surveyAPI,
  healthAPI,
  checkAPIConnection
}