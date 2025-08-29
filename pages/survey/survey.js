// survey.js
// 引入日志模块（置于顶部，避免在使用前未定义）
const logger = require('../../utils/logger.js')
// 统一题库模块：集中管理题目、计分与解析
const questionsRepo = require('../../utils/questions.js')

Page({
  data: {
    // 改为从题库模块拉取题目，避免重复定义带来的不一致风险
    questions: [],
    answers: {},
    currentStep: 0,
    remainingQuestions: 0,
    // 防重复提交标记，避免多次点击导致重复跳转
    isSubmitting: false
  },

  /**
   * 根据题目类型初始化答案结构
   * - 单选：存储选项key字符串
   * - 多选：存储选项key的映射对象
   * - 文本：存储字符串
   */
  initAnswersByQuestions(questions) {
    const answers = {}
    questions.forEach(q => {
      if (q.type === 'multiple') {
        answers[q.id] = {}
      } else {
        answers[q.id] = ''
      }
    })
    return answers
  },

  // 计算剩余题目数
  calculateRemainingQuestions: function() {
    const { questions, answers } = this.data
    let completed = 0
    
    for (let question of questions) {
      if (question.type === 'text') {
        if (answers[question.id] && answers[question.id].trim() !== '') {
          completed++
        }
      } else if (question.type === 'multiple') {
        if (answers[question.id] && Object.keys(answers[question.id]).length > 0) {
          completed++
        }
      } else {
        // 单选题：选项使用字母 key 存储，非空即作答
        if (answers[question.id] !== '' && answers[question.id] !== undefined) {
          completed++
        }
      }
    }
    
    const remaining = questions.length - completed
    this.setData({ remainingQuestions: remaining })
    // 调试日志：剩余题目数
    logger.debug('Survey', '剩余题目数更新', { remaining })
  },

  onLoad: function() {
    // 页面生命周期日志
    logger.logPageLifecycle('Survey', 'onLoad')

    // 从题库拉取18题，并初始化答案
    const questions = questionsRepo.getAllQuestions()
    const answers = this.initAnswersByQuestions(questions)

    this.setData({ 
      questions, 
      answers, 
      remainingQuestions: questions.length 
    })

    // 初始化后立即计算，保证 UI 显示正确
    this.calculateRemainingQuestions()
    logger.info('Survey', '题库加载完成', { count: questions.length })
  },

  // 单选题选择
  onSingleSelect: function(e) {
    // 使用 optionKey 存储，便于后续计分规则按选项标识映射
    const { questionId, optionKey } = e.currentTarget.dataset
    // 注意：避免使用对象展开（...）以规避 Babel runtime 依赖（defineProperty）
    // 这里用 Object.assign 创建浅拷贝，兼容小程序编译环境
    const answers = Object.assign({}, this.data.answers)
    answers[questionId] = optionKey
    this.setData({ answers })
    this.calculateRemainingQuestions()
    // 行为日志：单选
    logger.debug('Survey', '单选', { questionId, optionKey })
  },

  // 多选题选择
  onMultipleSelect: function(e) {
    const { questionId, optionKey } = e.currentTarget.dataset
    // 统一使用 Object.assign 避免对象展开触发 Babel helper 注入
    const answers = Object.assign({}, this.data.answers)
    const currentAnswers = Object.assign({}, answers[questionId] || {})
    
    // 使用对象存储选中状态（key 为选项标识）
    if (currentAnswers[optionKey]) {
      // 取消选择
      delete currentAnswers[optionKey]
    } else {
      // 选择
      currentAnswers[optionKey] = true
    }
    
    answers[questionId] = currentAnswers
    this.setData({ answers })
    this.calculateRemainingQuestions()
    // 行为日志：多选切换
    logger.debug('Survey', '多选切换', { questionId, optionKey, checked: !!currentAnswers[optionKey] })
  },

  // 文本输入
  onTextInput: function(e) {
    const { questionId } = e.currentTarget.dataset
    const value = e.detail.value
    // 避免对象展开，改用 Object.assign
    const answers = Object.assign({}, this.data.answers)
    answers[questionId] = value
    this.setData({ answers })
    this.calculateRemainingQuestions()
    // 行为日志：文本输入长度
    logger.debug('Survey', '文本输入', { questionId, length: (value || '').length })
  },

  // 提交问卷
  submitSurvey: function() {
    // 若正在提交，直接忽略，防止重复触发
    if (this.data.isSubmitting) {
      logger.warn('Survey', '重复提交阻止')
      return
    }

    // 验证是否所有必填题都已回答
    const { questions, answers } = this.data
    let isValid = true
    
    for (let question of questions) {
      if (question.type === 'text') {
        if (!answers[question.id] || answers[question.id].trim() === '') {
          isValid = false
          break
        }
      } else if (question.type === 'multiple') {
        if (!answers[question.id] || Object.keys(answers[question.id]).length === 0) {
          isValid = false
          break
        }
      } else {
        if (answers[question.id] === '' || answers[question.id] === undefined) {
          isValid = false
          break
        }
      }
    }

    if (!isValid) {
      wx.showToast({
        title: '请完成所有题目',
        icon: 'none'
      })
      // 校验失败日志
      logger.warn('Survey', '提交校验失败')
      return
    }

    // 进入提交中状态，防止重复点击
    this.setData({ isSubmitting: true })

    // 保存答案到本地存储
    wx.setStorageSync('surveyAnswers', answers)

    // 视觉提醒：显示成功 Toast，但不等待其结束，立即跳转
    wx.showToast({ title: '提交成功', icon: 'success', duration: 1200 })
    logger.info('Survey', '提交成功，立即跳转结果页', { answered: Object.keys(answers).length })

    // 立即跳转到结果页（不设置延迟）
    try {
      wx.navigateTo({ url: '/pages/result/result' })
    } finally {
      // 页面将很快被销毁，这里重置仅作为防御
      this.setData({ isSubmitting: false })
    }
  }
})