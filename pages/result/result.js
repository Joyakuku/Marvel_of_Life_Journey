// result.js
Page({
  data: {
    surveyAnswers: {},
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
        type: 'text',
        title: '您对我们的服务有什么建议？',
        placeholder: '请输入您的建议...'
      }
    ],
    resultData: [],
    submitTime: ''
  },

  onLoad: function() {
    this.loadSurveyResults()
  },

  // 加载问卷结果
  loadSurveyResults: function() {
    try {
      const answers = wx.getStorageSync('surveyAnswers')
      if (answers) {
        this.setData({
          surveyAnswers: answers,
          submitTime: this.formatCurrentTime()
        })
        this.processResults()
      } else {
        wx.showToast({
          title: '未找到问卷数据',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载问卷结果失败:', error)
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    }
  },

  // 处理结果数据
  processResults: function() {
    const { questions, surveyAnswers } = this.data
    const resultData = []

    questions.forEach(question => {
      const answer = surveyAnswers[question.id]
      let displayAnswer = ''

      if (question.type === 'single') {
        displayAnswer = question.options[answer] || '未选择'
      } else if (question.type === 'multiple') {
        const selectedOptions = Object.keys(answer).map(index => question.options[parseInt(index, 10)]);
        if (selectedOptions.length > 0) {
          displayAnswer = selectedOptions.join('、');
        } else {
          displayAnswer = '未选择';
        }
      } else if (question.type === 'text') {
        displayAnswer = answer || '未填写'
      }

      resultData.push({
        question: question.title,
        answer: displayAnswer,
        type: question.type
      })
    })

    this.setData({ resultData })
  },

  // 格式化当前时间
  formatCurrentTime: function() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 重新填写问卷
  retakeSurvey: function() {
    wx.navigateBack()
  },

  // 分享结果
  shareResult: function() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  },

  // 返回首页
  goHome: function() {
    wx.navigateBack({
      delta: 2
    })
  },

  // 保存结果到相册（模拟功能）
  saveToAlbum: function() {
    wx.showToast({
      title: '保存功能开发中',
      icon: 'none'
    })
  }
})