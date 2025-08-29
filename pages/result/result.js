// result.js
// 引入日志模块（置于顶部，避免在使用前未定义）
const logger = require('../../utils/logger.js')
// 统一题库模块：集中管理题目、计分与解析
const questionsRepo = require('../../utils/questions.js')

Page({
  data: {
    surveyAnswers: {},
    questions: [],
    resultData: [],
    submitTime: '',
    totalScore: 0,
    maxScore: 0,
    level: '',
    levelDescription: '',
    // 提交成功弹窗相关状态（保留字段以便将来需要）
    showSubmitPopup: false,
    popupSubmitTime: '',
    // 展示模式：ai | explain，二选一
    showMode: 'ai',
    // 固定切换条相关：导航高度（px）与占位高度（rpx）
    navHeightPx: 0,
    switchSpacerRpx: 92 // 再次下调默认兜底占位，进一步减少首帧留白
  },

  onLoad: function() {
    logger.logPageLifecycle('Result', 'onLoad')
    // 计算导航栏高度，确保固定切换条紧贴其下方
    this.computeNavHeight()

    // 从题库加载统一问题
    const questions = questionsRepo.getAllQuestions()
    this.setData({ questions })
    this.loadSurveyResults()
  },

  /**
   * 计算自定义导航栏总高度（状态栏 + 导航栏），用于固定切换条的top
   * 不依赖硬编码，动态适配不同机型与安全区域
   */
  onReady: function() {
    // 页面初次渲染完成后再测量固定区高度，保证 spacer 占位准确
    logger.logPageLifecycle('Result', 'onReady')
    this.updateTopSpacerHeight()
    // 再追加一次异步测量，覆盖字体回流/换行导致的高度二次变化
    setTimeout(() => this.updateTopSpacerHeight(), 80)
  },

  /**
   * 页面显示时再次测量，覆盖从其它页面返回/真机首次进入等场景
   */
  onShow: function() {
    logger.logPageLifecycle('Result', 'onShow')
    wx.nextTick(() => this.updateTopSpacerHeight())
    setTimeout(() => this.updateTopSpacerHeight(), 120)
  },

  /**
   * 监听窗口尺寸变化（横竖屏切换/系统字体缩放），重新测量占位
   */
  onResize: function() {
    logger.logPageLifecycle('Result', 'onResize')
    this.updateTopSpacerHeight()
  },

  /**
   * 动态测量顶部固定容器高度，并换算为 rpx 用于内容占位
   * 这样无论“总分概览”的文案长度如何变化，内容区都不会被遮挡
   */
  updateTopSpacerHeight() {
    try {
      // 使用当前页面作用域，避免跨组件/跨页面误选导致高度偏小
      const q = wx.createSelectorQuery().in(this)
      q.select('#fixedTopContainer').boundingClientRect(rect => {
        if (!rect || !rect.height) return
        const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const ratio = sys.windowWidth ? 750 / sys.windowWidth : 2
        // 统一增加 6px 缓冲（由原来的 8px 再下调），尽量减少留白同时兼顾安全
        const spacerRpx = Math.ceil((rect.height + 6) * ratio)
        this.setData({ switchSpacerRpx: spacerRpx })
        logger.debug('Result', '更新顶部占位高度', { fixedHeightPx: rect.height, spacerRpx })
      }).exec()
    } catch (e) {
      logger.warn('Result', 'updateTopSpacerHeight 失败，使用兜底值', {})
    }
  },

  // 修改：在计算导航栏高度后，异步更新占位高度
  computeNavHeight() {
    try {
      const rect = wx.getMenuButtonBoundingClientRect()
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const statusBarHeight = sys.statusBarHeight || 0
      const navBarContentHeight = rect.height + (rect.top - statusBarHeight) * 2
      const navHeightPx = Math.round(statusBarHeight + navBarContentHeight)
      this.setData({ navHeightPx })
      const ratio = (sys.windowWidth ? 750 / sys.windowWidth : 2)
      // 适当下调最小值到 88rpx，并把缓冲从 8px 再下调到 6px
      const spacer = Math.max(88, Math.round((navBarContentHeight + 6) * ratio))
      this.setData({ switchSpacerRpx: spacer })
      logger.debug('Result', '计算导航栏高度成功', { statusBarHeight, navBarContentHeight, navHeightPx, spacerRpx: spacer })
      // 在下一帧测量包含“模式切换+总分概览”的真实高度
      wx.nextTick(() => this.updateTopSpacerHeight())
    } catch (e) {
      logger.warn('Result', '计算导航栏高度失败，使用兜底值', {})
      this.setData({ navHeightPx: 88, switchSpacerRpx: 92 })
    }
  },

  /**
   * 加载问卷结果（从本地存储读取），并触发结果处理
   * 说明：此方法在 onLoad 中调用；此前因编辑冲突被移除，这里恢复
   */
  loadSurveyResults: function() {
    logger.info('Result', '开始加载问卷结果')
    try {
      const answers = wx.getStorageSync('surveyAnswers')
      if (answers) {
        this.setData({
          surveyAnswers: answers,
          submitTime: this.formatCurrentTime()
        })
        logger.info('Result', '加载成功')
        this.processResults()

        // 清理历史提交流程的中间态，避免重复弹窗
        try { wx.removeStorageSync('submitMeta') } catch (e) { /* 忽略 */ }
        this.setData({ showSubmitPopup: false, popupSubmitTime: '' })
      } else {
        logger.warn('Result', '未找到问卷数据')
        wx.showToast({ title: '未找到问卷数据', icon: 'none' })
        setTimeout(() => { wx.navigateBack() }, 1500)
      }
    } catch (error) {
      logger.captureError('Result', error, { stage: 'loadSurveyResults' })
      wx.showToast({ title: '数据加载失败', icon: 'none' })
    }
  },

  // 处理结果数据（展示答案与解析，并计算总分） 完成后重新测量固定区高度
  processResults: function() {
    const { questions, surveyAnswers } = this.data
    const normalizedAnswers = {}
    questions.forEach(q => {
      const answer = surveyAnswers[q.id]
      if (q.type === 'single') {
        if (typeof answer === 'number') {
          const opt = (q.options || [])[answer]
          normalizedAnswers[q.id] = opt ? opt.key : answer
          logger.debug('Result', '迁移单选答案索引为字母key', { qid: q.id, from: answer, to: normalizedAnswers[q.id] })
        } else {
          normalizedAnswers[q.id] = answer
        }
      } else if (q.type === 'multiple') {
        const obj = {}
        const keys = Object.keys(answer || {})
        keys.forEach(k => {
          // 旧格式多选键可能是数字索引字符串，需要映射到对应 key
          if (!isNaN(parseInt(k, 10))) {
            const opt = (q.options || [])[parseInt(k, 10)]
            if (opt && opt.key) obj[opt.key] = true
          } else {
            obj[k] = true
          }
        })
        normalizedAnswers[q.id] = obj
        if (keys.length > 0) {
          logger.debug('Result', '迁移多选答案索引为字母key', { qid: q.id, from: keys })
        }
      } else {
        normalizedAnswers[q.id] = answer
      }
    })

    const resultData = []

    questions.forEach(question => {
      const answer = normalizedAnswers[question.id]
      let displayAnswer = ''

      if (question.type === 'single') {
        const opt = (question.options || []).find(o => o.key === answer)
        displayAnswer = opt ? opt.text : '未选择'
      } else if (question.type === 'multiple') {
        const selectedKeys = Object.keys(answer || {})
        const selectedOptions = selectedKeys.map(k => {
          const opt = (question.options || []).find(o => o.key === k)
          return opt ? opt.text : ''
        }).filter(Boolean)
        displayAnswer = selectedOptions.length > 0 ? selectedOptions.join('、') : '未选择'
      } else if (question.type === 'text') {
        // 避免 0 等 falsy 值被误判为未填写，同时兼容数值类型
        displayAnswer = (answer !== undefined && answer !== null && String(answer).trim() !== '') ? String(answer) : '未填写'
      }

      resultData.push({
        // 使用题目 id 作为稳定唯一键，供 WXML 中 wx:key 使用，避免 index 带来的 diff 风险
        qid: question.id,
        question: question.title,
        answer: displayAnswer,
        explanation: question.explanation, // 展示解析
        type: question.type
      })
    })

    // 使用统一计分函数计算总分与等级说明
    const scoreResult = questionsRepo.calculateScore(normalizedAnswers)

    this.setData({ 
      resultData,
      totalScore: scoreResult.totalScore,
      maxScore: scoreResult.maxScore,
      level: scoreResult.level,
      levelDescription: scoreResult.description
    })

    // 处理结果后的统计日志
    logger.debug('Result', '结果处理完成', { count: resultData.length, totalScore: scoreResult.totalScore, level: scoreResult.level })
    // 结果渲染后测量一次固定区高度，确保 spacer 覆盖“切换+总分”
    wx.nextTick(() => this.updateTopSpacerHeight())
    // 再加一次微延时测量，防止文本换行晚于 nextTick
    setTimeout(() => this.updateTopSpacerHeight(), 80)
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

  /**
   * 格式化任意时间戳为 YYYY-MM-DD HH:mm
   * @param {number} ts - 时间戳（毫秒）
   * @returns {string}
   */
  formatTime: function(ts) {
    try {
      const d = new Date(ts || Date.now())
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}`
    } catch (e) {
      logger.warn('Result', 'formatTime 失败，回退到当前时间', { ts })
      return this.formatCurrentTime()
    }
  },

  // 重新填写问卷
  retakeSurvey: function() {
    logger.info('Result', '重新填写问卷')
    wx.navigateBack()
  },

  /**
   * 切换展示模式（AI解析 / 题目解释）
   * @param {Object} e - 事件对象，需通过 dataset.mode 传入 'ai' 或 'explain'
   */
  switchMode: function(e) {
    const mode = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'ai'
    if (mode === this.data.showMode) return
    // 防御：仅允许两种模式
    const next = (mode === 'ai' || mode === 'explain') ? mode : 'ai'
    this.setData({ showMode: next })
    logger.info('Result', '切换展示模式', { mode: next })
    // 切换模式后，虽然顶部固定区结构不变，但为稳妥仍重新测量
    wx.nextTick(() => this.updateTopSpacerHeight())
    setTimeout(() => this.updateTopSpacerHeight(), 80)
  },

  // 分享结果
  shareResult: function() {
    logger.info('Result', '点击分享结果')
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  },

  // 返回首页
  goHome: function() {
    logger.info('Result', '返回首页')
    wx.navigateBack({
      delta: 2
    })
  },

  // 保存结果到相册（模拟功能）
  saveToAlbum: function() {
    logger.info('Result', '保存结果到相册（模拟）')
    wx.showToast({
      title: '保存功能开发中',
      icon: 'none'
    })
  }
})