/**
 * 问卷相关API路由
 * 提供问卷数据的增删改查接口
 */
const express = require('express');
const router = express.Router();
const SurveyResult = require('../models/SurveyResult');
const AIService = require('../services/aiService');

/**
 * 保存问卷结果
 * POST /api/survey/submit
 */
router.post('/submit', async (req, res) => {
  try {
    console.log('📝 收到问卷提交请求:', req.body);
    
    // 验证必填字段
    const { phone, answers, totalScore, percentage, section1Score, section2Score, section3Score, startTime, endTime } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号码不能为空'
      });
    }
    
    if (totalScore === undefined || totalScore === null) {
      return res.status(400).json({
        success: false,
        message: '总分不能为空'
      });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: '开始时间和结束时间不能为空'
      });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号码格式不正确'
      });
    }
    
    // 构建问卷数据
    const surveyData = {
      phone,
      answers: answers || {},
      totalScore: Number(totalScore),
      percentage: Number(percentage) || 0,
      section1Score: Number(section1Score) || 0,
      section2Score: Number(section2Score) || 0,
      section3Score: Number(section3Score) || 0,
      startTime,
      endTime
    };
    
    // 生成AI分析
    console.log('🤖 正在生成AI分析...');
    let aiAnalysis = '';
    try {
      aiAnalysis = await AIService.generateAnalysis(surveyData, {
        percentage: surveyData.percentage,
        section1Score: surveyData.section1Score,
        section2Score: surveyData.section2Score,
        section3Score: surveyData.section3Score
      });
      console.log('✅ AI分析生成成功');
    } catch (error) {
      console.warn('⚠️ AI分析生成失败，使用默认分析:', error.message);
      aiAnalysis = AIService.getDefaultAnalysis({
        percentage: surveyData.percentage,
        section1Score: surveyData.section1Score,
        section2Score: surveyData.section2Score,
        section3Score: surveyData.section3Score
      });
    }
    
    // 添加AI分析到问卷数据
    surveyData.aiAnalysis = aiAnalysis;
    
    // 保存到数据库
    const result = await SurveyResult.create(surveyData);
    
    console.log('✅ 问卷提交成功:', result);
    
    res.json({
      success: true,
      message: '问卷提交成功',
      data: {
        id: result.id,
        aiAnalysis: aiAnalysis
      }
    });
    
  } catch (error) {
    console.error('❌ 问卷提交失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 根据ID查询问卷结果
 * GET /api/survey/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的问卷ID'
      });
    }
    
    const result = await SurveyResult.findById(Number(id));
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: '未找到问卷结果'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ 查询问卷结果失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 根据手机号查询问卷结果
 * GET /api/survey/phone/:phone
 */
router.get('/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { limit = 10 } = req.query;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号码不能为空'
      });
    }
    
    const results = await SurveyResult.findByPhone(phone, Number(limit));
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
    
  } catch (error) {
    console.error('❌ 根据手机号查询问卷结果失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 检查手机号是否已存在问卷记录
 * GET /api/survey/check/:phone
 */
router.get('/check/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号码不能为空'
      });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号码格式不正确'
      });
    }
    
    const results = await SurveyResult.findByPhone(phone, 1);
    const exists = results.length > 0;
    
    res.json({
      success: true,
      exists: exists,
      data: exists ? results[0] : null,
      message: exists ? '该手机号已有问卷记录' : '该手机号暂无问卷记录'
    });
    
  } catch (error) {
    console.error('❌ 检查手机号问卷记录失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 获取所有问卷结果（分页）
 * GET /api/survey
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    
    const result = await SurveyResult.findAll(Number(page), Number(pageSize));
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('❌ 获取问卷结果列表失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 获取统计信息
 * GET /api/survey/stats/overview
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await SurveyResult.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 生成AI分析
 * POST /api/survey/ai-analysis
 */
router.post('/ai-analysis', async (req, res) => {
  try {
    console.log('🤖 收到AI分析请求:', req.body);
    
    const { answers, totalScore, percentage, section1Score, section2Score, section3Score } = req.body;
    
    // 验证必填字段
    if (totalScore === undefined || percentage === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的评分数据'
      });
    }
    
    // 构建分析数据
    const analysisData = {
      answers: answers || {},
      totalScore: Number(totalScore),
      percentage: Number(percentage),
      section1Score: Number(section1Score) || 0,
      section2Score: Number(section2Score) || 0,
      section3Score: Number(section3Score) || 0
    };
    
    // 生成AI分析
    const aiAnalysis = await AIService.generateAnalysis(analysisData, {
      percentage: analysisData.percentage,
      section1Score: analysisData.section1Score,
      section2Score: analysisData.section2Score,
      section3Score: analysisData.section3Score
    });
    
    console.log('✅ AI分析生成成功');
    
    res.json({
      success: true,
      message: 'AI分析生成成功',
      data: {
        aiAnalysis: aiAnalysis
      }
    });
    
  } catch (error) {
    console.error('❌ AI分析生成失败:', error.message);
    
    // 返回默认分析作为备选方案
    const defaultAnalysis = AIService.getDefaultAnalysis({
      percentage: req.body.percentage || 0,
      section1Score: req.body.section1Score || 0,
      section2Score: req.body.section2Score || 0,
      section3Score: req.body.section3Score || 0
    });
    
    res.json({
      success: true,
      message: 'AI分析生成成功（使用默认分析）',
      data: {
        aiAnalysis: defaultAnalysis
      }
    });
  }
});

/**
 * 检查AI服务状态
 * GET /api/survey/ai-status
 */
router.get('/ai-status', async (req, res) => {
  try {
    const isAvailable = await AIService.checkServiceAvailability();
    
    res.json({
      success: true,
      data: {
        available: isAvailable,
        service: 'DeepSeek AI',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ AI服务状态检查失败:', error.message);
    res.status(500).json({
      success: false,
      message: 'AI服务状态检查失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 删除问卷结果
 * DELETE /api/survey/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: '无效的问卷ID'
      });
    }
    
    const result = await SurveyResult.deleteById(Number(id));
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ 删除问卷结果失败:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;