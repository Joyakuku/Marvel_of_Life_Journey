// survey.js
Page({
  data: {
    questions: [
      {
        id: 1,
        type: 'single',
        title: '您的年龄段是？',
        options: ['18-25岁', '26-35岁', '36-45岁', '46岁以上']
      },
      {
        id: 2,
        type: 'single',
        title: '您的职业是？',
        options: ['学生', '上班族', '自由职业者', '退休人员', '其他']
      },
      {
        id: 3,
        type: 'multiple',
        title: '您平时喜欢的休闲活动有哪些？（多选）',
        options: ['看电影', '运动健身', '阅读', '旅游', '游戏', '音乐']
      },
      {
        id: 4,
        type: 'single',
        title: '您对我们的服务是否满意？',
        options: ['非常满意', '满意', '一般', '不满意']
      }
    ],
    answers: {},
    currentStep: 0,
    remainingQuestions: 4
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
        if (answers[question.id] !== '' && answers[question.id] !== undefined) {
          completed++
        }
      }
    }
    
    const remaining = questions.length - completed
    this.setData({ remainingQuestions: remaining })
  },



  onLoad: function() {
    // 初始化答案对象
    const answers = {}
    this.data.questions.forEach(q => {
      if (q.type === 'multiple') {
        answers[q.id] = {}
      } else {
        answers[q.id] = ''
      }
    })
    this.setData({ answers })
  },

  // 单选题选择
  onSingleSelect: function(e) {
    const { questionId, optionIndex } = e.currentTarget.dataset
    const answers = { ...this.data.answers }
    answers[questionId] = optionIndex
    this.setData({ answers })
    this.calculateRemainingQuestions()
  },

  // 多选题选择
  onMultipleSelect: function(e) {
    const { questionId, optionIndex } = e.currentTarget.dataset
    const answers = { ...this.data.answers }
    const currentAnswers = { ...answers[questionId] } || {}
    
    // 使用对象存储选中状态
    if (currentAnswers[optionIndex]) {
      // 取消选择
      delete currentAnswers[optionIndex]
    } else {
      // 选择
      currentAnswers[optionIndex] = true
    }
    
    answers[questionId] = currentAnswers
    this.setData({ answers })
    this.calculateRemainingQuestions()
  },

  // 文本输入
  onTextInput: function(e) {
    const { questionId } = e.currentTarget.dataset
    const value = e.detail.value
    const answers = { ...this.data.answers }
    answers[questionId] = value
    this.setData({ answers })
    this.calculateRemainingQuestions()
  },

  // 提交问卷
  submitSurvey: function() {
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
      return
    }

    // 保存答案到本地存储
    wx.setStorageSync('surveyAnswers', answers)
    
    wx.showToast({
      title: '提交成功',
      icon: 'success'
    })

    // 跳转到结果页面
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/result/result'
      })
    }, 1500)
  }
})