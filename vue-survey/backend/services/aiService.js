/**
 * AI服务模块
 * 处理DeepSeek API调用，提供智能分析功能
 */
const OpenAI = require('openai');
const path = require('path');

// 配置dotenv从项目根目录加载.env文件
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * DeepSeek API客户端配置
 */
const openai = new OpenAI({
  baseURL: process.env.DS_API_URL || 'https://api.deepseek.com',
  apiKey: process.env.DS_API_KEY
});

/**
 * AI分析服务类
 */
class AIService {
  /**
   * 生成问卷结果的AI分析
   * @param {Object} surveyData - 问卷数据
   * @param {Object} result - 评估结果
   * @returns {Promise<string>} AI分析结果
   */
  static async generateAnalysis(surveyData, result) {
    try {
      console.log('🤖 开始生成AI分析...');
      
      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(surveyData, result);
      
      // 调用DeepSeek API
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "你是一个专业的造血干细胞捐献潜力线上评估专家。请根据用户的问卷答题情况，提供专业、客观、有建设性的分析和详细的饮食、作息、运动建议。回答要简洁明了，重点突出，语言温和友善。交流使用中文，禁止出现‘*’符号"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "deepseek-chat",
        max_tokens: 800,
        temperature: 0.7
      });
      
      const analysis = completion.choices[0].message.content;
      console.log('✅ AI分析生成成功');
      
      return analysis;
      
    } catch (error) {
      console.error('❌ AI分析生成失败:', error.message);
      
      // 返回默认分析，确保系统正常运行
      return this.getDefaultAnalysis(result);
    }
  }
  
  /**
   * 构建AI分析提示词
   * @param {Object} surveyData - 问卷数据
   * @param {Object} result - 评估结果
   * @returns {string} 分析提示词
   */
  static buildAnalysisPrompt(surveyData, result) {
    const { answers, totalScore, percentage, section1Score, section2Score, section3Score } = surveyData;
    
    return `请分析以下问卷调查结果：

**基本信息：**
- 总得分：${totalScore}分
- 得分率：${percentage}%
- 第一部分得分：${section1Score}分
- 第二部分得分：${section2Score}分  
- 第三部分得分：${section3Score}分

**用户答题情况：**
${JSON.stringify(answers, null, 2)}

**评估等级：**
根据得分率，用户处于${this.getScoreLevel(percentage)}水平。

请提供：
1. 对用户整体表现的客观评价
2. 各部分得分的具体分析
3. 针对性的改进建议
4. 积极正面的鼓励

要求：
- 语言温和友善，避免负面表述
- 分析要具体且有针对性
- 建议要实用可行
- 控制在300字以内`;
  }
  
  /**
   * 根据得分率获取评估等级
   * @param {number} percentage - 得分率
   * @returns {string} 评估等级描述
   */
  static getScoreLevel(percentage) {
    if (percentage >= 85) return '优秀';
    if (percentage >= 70) return '良好';
    if (percentage >= 60) return '中等';
    if (percentage >= 40) return '一般';
    return '需要改进';
  }
  
  /**
   * 获取默认分析（当AI服务不可用时）
   * @param {Object} result - 评估结果
   * @returns {string} 默认分析内容
   */
  static getDefaultAnalysis(result) {
    const { percentage, section1Score, section2Score, section3Score } = result;
    
    let analysis = `根据您的问卷结果分析：\n\n`;
    
    // 总体评价
    if (percentage >= 80) {
      analysis += `🎉 您的总体表现优秀，得分率达到${percentage}%，展现出良好的综合素质。\n\n`;
    } else if (percentage >= 65) {
      analysis += `👍 您的总体表现良好，得分率为${percentage}%，具备一定的基础能力。\n\n`;
    } else if (percentage >= 50) {
      analysis += `📈 您的总体表现中等，得分率为${percentage}%，还有提升的空间。\n\n`;
    } else {
      analysis += `💪 您的得分率为${percentage}%，建议加强相关方面的学习和实践。\n\n`;
    }
    
    // 分部分分析
    analysis += `**各部分表现：**\n`;
    analysis += `• 第一部分：${section1Score}分\n`;
    analysis += `• 第二部分：${section2Score}分\n`;
    analysis += `• 第三部分：${section3Score}分\n\n`;
    
    // 建议
    analysis += `**改进建议：**\n`;
    if (percentage < 70) {
      analysis += `• 建议多关注得分较低的部分，有针对性地提升\n`;
      analysis += `• 可以通过学习相关知识来改善表现\n`;
    }
    analysis += `• 保持积极的学习态度，持续改进\n`;
    analysis += `• 定期进行自我评估，跟踪进步情况`;
    
    return analysis;
  }
  
  /**
   * 检查AI服务可用性
   * @returns {Promise<boolean>} 服务是否可用
   */
  static async checkServiceAvailability() {
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "deepseek-chat",
        max_tokens: 10
      });
      
      console.log('✅ AI服务连接正常');
      return true;
      
    } catch (error) {
      console.warn('⚠️ AI服务连接失败:', error.message);
      return false;
    }
  }
}

module.exports = AIService;