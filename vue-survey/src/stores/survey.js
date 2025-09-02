/**
 * 问卷调查状态管理 Store
 * 使用Pinia管理问卷的全局状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useQuestions, QUESTION_SECTIONS } from '@/composables/useQuestions'

export const useSurveyStore = defineStore('survey', () => {
  // 使用问题管理composable
  const {
    questions,
    getAllQuestions,
    getQuestionById,
    calculateScore,
    getQuestionsBySection
  } = useQuestions()

  // 从localStorage恢复状态的辅助函数
  const loadFromStorage = () => {
    try {
      const savedState = localStorage.getItem('survey-state')
      if (savedState) {
        const parsed = JSON.parse(savedState)
        console.log('从localStorage恢复状态:', parsed)
        return parsed
      }
    } catch (error) {
      console.warn('恢复状态失败:', error)
    }
    return null
  }

  // 保存状态到localStorage的辅助函数
  const saveToStorage = (state) => {
    try {
      localStorage.setItem('survey-state', JSON.stringify(state))
      console.log('状态已保存到localStorage')
    } catch (error) {
      console.warn('保存状态失败:', error)
    }
  }

  // 从localStorage恢复的状态
  const savedState = loadFromStorage()

  // 状态数据
  const currentQuestionIndex = ref(savedState?.currentQuestionIndex || 0)
  const answers = ref(savedState?.answers || {})
  const isSubmitted = ref(savedState?.isSubmitted || false)
  const surveyResult = ref(savedState?.surveyResult || null)
  const startTime = ref(savedState?.startTime || null)
  const endTime = ref(savedState?.endTime || null)
  const userPhone = ref(savedState?.userPhone || '') // 用户手机号

  // 计算属性
  const currentQuestion = computed(() => {
    return questions[currentQuestionIndex.value] || null
  })

  const totalQuestions = computed(() => questions.length)

  const progress = computed(() => {
    return Math.round(((currentQuestionIndex.value + 1) / totalQuestions.value) * 100)
  })

  const isLastQuestion = computed(() => {
    // 修复：totalQuestions 是一个 computed 引用，必须通过 .value 访问其数值，否则 length 为 undefined 将导致始终判定为非最后一题
    return currentQuestionIndex.value === (totalQuestions.value - 1)
  })

  const isFirstQuestion = computed(() => {
    return currentQuestionIndex.value === 0
  })

  const answeredCount = computed(() => {
    return Object.keys(answers.value).length
  })

  const allAnswered = computed(() => {
    return answeredCount.value === totalQuestions.value
  })

  const unansweredQuestions = computed(() => {
    const unanswered = []
    questions.forEach((question, index) => {
      if (!answers.value[question.id]) {
        unanswered.push({
          index,
          question
        })
      }
    })
    return unanswered
  })

  const surveyDuration = computed(() => {
    if (startTime.value && endTime.value) {
      return Math.round((endTime.value - startTime.value) / 1000) // 秒
    }
    return 0
  })

  // 操作方法
  const startSurvey = (forceReset = false) => {
    console.log('开始问卷调查', forceReset ? '(强制重置)' : '(检查现有状态)')
    
    // 如果不是强制重置且已有进行中的问卷，则不重置状态
    if (!forceReset && (Object.keys(answers.value).length > 0 || startTime.value)) {
      console.log('检测到现有问卷进度，继续之前的问卷')
      return
    }
    
    // 重置状态开始新问卷
    console.log('开始新的问卷调查')
    startTime.value = Date.now()
    currentQuestionIndex.value = 0
    answers.value = {}
    isSubmitted.value = false
    surveyResult.value = null
    
    // 保存开始状态到localStorage
    saveToStorage({
      answers: answers.value,
      isSubmitted: isSubmitted.value,
      surveyResult: surveyResult.value,
      startTime: startTime.value,
      endTime: endTime.value,
      userPhone: userPhone.value,
      currentQuestionIndex: currentQuestionIndex.value
    })
  }

  const setAnswer = (questionId, answer) => {
    console.log(`设置答案 - 问题ID: ${questionId}, 答案: ${answer}`)
    answers.value[questionId] = answer
    
    // 实时保存答题进度到localStorage
    saveToStorage({
      answers: answers.value,
      isSubmitted: isSubmitted.value,
      surveyResult: surveyResult.value,
      startTime: startTime.value,
      endTime: endTime.value,
      userPhone: userPhone.value,
      currentQuestionIndex: currentQuestionIndex.value
    })
  }

  const getAnswer = (questionId) => {
    return answers.value[questionId]
  }

  const nextQuestion = () => {
    if (!isLastQuestion.value) {
      currentQuestionIndex.value++
      console.log(`切换到下一题: ${currentQuestionIndex.value + 1}`)
      
      // 保存题目切换进度到localStorage
      saveToStorage({
        answers: answers.value,
        isSubmitted: isSubmitted.value,
        surveyResult: surveyResult.value,
        startTime: startTime.value,
        endTime: endTime.value,
        userPhone: userPhone.value,
        currentQuestionIndex: currentQuestionIndex.value
      })
      
      return true
    }
    return false
  }

  const prevQuestion = () => {
    if (!isFirstQuestion.value) {
      currentQuestionIndex.value--
      console.log(`切换到上一题: ${currentQuestionIndex.value + 1}`)
      
      // 保存题目切换进度到localStorage
      saveToStorage({
        answers: answers.value,
        isSubmitted: isSubmitted.value,
        surveyResult: surveyResult.value,
        startTime: startTime.value,
        endTime: endTime.value,
        userPhone: userPhone.value,
        currentQuestionIndex: currentQuestionIndex.value
      })
      
      return true
    }
    return false
  }

  const goToQuestion = (index) => {
    if (index >= 0 && index < totalQuestions.value) {
      currentQuestionIndex.value = index
      console.log(`跳转到问题: ${index + 1}`)
      return true
    }
    return false
  }

  const submitSurvey = async () => {
    console.log('=== submitSurvey 开始 ===')
    console.log('allAnswered:', allAnswered.value)
    console.log('answeredCount:', answeredCount.value)
    console.log('totalQuestions:', totalQuestions.value)
    console.log('当前答案:', answers.value)
    
    if (!allAnswered.value) {
      console.warn('问卷未完成，无法提交')
      console.log('未回答的问题:', unansweredQuestions.value)
      return false
    }

    console.log('开始计算得分...')
    endTime.value = Date.now()
    
    // 计算得分
    const result = calculateScore(answers.value)
    console.log('计算得分结果:', result)
    
    // 添加额外信息
    surveyResult.value = {
      ...result,
      answers: { ...answers.value },
      duration: surveyDuration.value,
      submittedAt: new Date().toISOString(),
      questionCount: totalQuestions.value
    }
    
    isSubmitted.value = true
    
    // 保存状态到localStorage
    saveToStorage({
      answers: answers.value,
      isSubmitted: isSubmitted.value,
      surveyResult: surveyResult.value,
      startTime: startTime.value,
      endTime: endTime.value,
      userPhone: userPhone.value
    })
    
    // 提交数据到后端数据库
    try {
      console.log('开始提交数据到后端数据库...')
      
      // 动态导入API服务
      const { surveyAPI } = await import('@/services/api.js')
      
      // 准备提交的数据
      const submitData = {
        phone: userPhone.value,
        totalScore: result.totalScore,
        section1Score: result.section1Score,
        section2Score: result.section2Score,
        section3Score: result.section3Score,
        aiAnalysis: result.analysis || '',
        startTime: new Date(startTime.value).toISOString(),
        endTime: new Date(endTime.value).toISOString()
      }
      
      console.log('提交数据:', submitData)
      
      // 调用后端API
      const apiResponse = await surveyAPI.submitSurvey(submitData)
      
      if (apiResponse.success) {
        console.log('数据库保存成功:', apiResponse)
        // 将数据库ID添加到结果中
        surveyResult.value.databaseId = apiResponse.data?.id
      } else {
        console.warn('数据库保存失败:', apiResponse.message)
      }
      
    } catch (error) {
      console.error('提交到数据库失败:', error.message)
      // 即使数据库保存失败，也不影响本地问卷完成状态
      // 用户仍然可以看到结果，只是数据没有保存到服务器
    }
    
    console.log('问卷提交成功')
    console.log('最终 surveyResult:', surveyResult.value)
    console.log('isSubmitted:', isSubmitted.value)
    console.log('=== submitSurvey 结束 ===')
    return true
  }

  const resetSurvey = () => {
    console.log('重置问卷')
    currentQuestionIndex.value = 0
    answers.value = {}
    isSubmitted.value = false
    surveyResult.value = null
    startTime.value = null
    endTime.value = null
    userPhone.value = '' // 重置手机号
    
    // 清除localStorage中的状态
    try {
      localStorage.removeItem('survey-state')
      console.log('已清除localStorage中的问卷状态')
    } catch (error) {
      console.warn('清除localStorage状态失败:', error)
    }
  }

  // 设置用户手机号
  const setUserPhone = (phone) => {
    console.log(`设置用户手机号: ${phone}`)
    userPhone.value = phone
    
    // 保存手机号到localStorage
    saveToStorage({
      answers: answers.value,
      isSubmitted: isSubmitted.value,
      surveyResult: surveyResult.value,
      startTime: startTime.value,
      endTime: endTime.value,
      userPhone: userPhone.value
    })
  }

  // 加载已有的问卷结果数据
  const loadExistingSurveyResult = (surveyData) => {
    console.log('加载已有的问卷结果数据:', surveyData)
    
    try {
      // 设置用户手机号
      userPhone.value = surveyData.phone || ''
      
      // 重构问卷结果数据
      surveyResult.value = {
        totalScore: surveyData.totalScore || 0,
        section1Score: surveyData.section1Score || 0,
        section2Score: surveyData.section2Score || 0,
        section3Score: surveyData.section3Score || 0,
        analysis: surveyData.aiAnalysis || '',
        submittedAt: surveyData.createdAt || new Date().toISOString(),
        databaseId: surveyData.id,
        // 计算百分比和等级（基于总分计算）
        percentage: Math.round((surveyData.totalScore / 100) * 100), // 假设满分100
        level: {
          level: surveyData.totalScore >= 80 ? '优秀' : 
                 surveyData.totalScore >= 60 ? '良好' : 
                 surveyData.totalScore >= 40 ? '一般' : '需改进',
          description: '基于历史问卷数据的评估结果'
        },
        // 分段得分
        sectionScores: {
          section1: surveyData.section1Score || 0,
          section2: surveyData.section2Score || 0,
          section3: surveyData.section3Score || 0
        }
      }
      
      // 标记为已提交
      isSubmitted.value = true
      
      // 设置时间信息
      if (surveyData.startTime) {
        startTime.value = new Date(surveyData.startTime).getTime()
      }
      if (surveyData.endTime) {
        endTime.value = new Date(surveyData.endTime).getTime()
      }
      
      // 保存到localStorage
      saveToStorage({
        answers: answers.value,
        isSubmitted: isSubmitted.value,
        surveyResult: surveyResult.value,
        startTime: startTime.value,
        endTime: endTime.value,
        userPhone: userPhone.value
      })
      
      console.log('已有问卷数据加载完成')
      
    } catch (error) {
      console.error('加载已有问卷数据失败:', error)
    }
  }

  const exportResults = () => {
    if (!surveyResult.value) {
      console.warn('没有可导出的结果')
      return null
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      survey: {
        title: '造血干细胞捐献潜力评估问卷',
        version: '1.0',
        totalQuestions: totalQuestions.value
      },
      participant: {
        submittedAt: surveyResult.value.submittedAt,
        duration: surveyResult.value.duration
      },
      results: {
        score: {
          total: surveyResult.value.totalScore,
          max: surveyResult.value.maxScore,
          percentage: surveyResult.value.percentage,
          level: surveyResult.value.level.level,
          description: surveyResult.value.level.description
        },
        sectionScores: surveyResult.value.sectionScores,
        answers: surveyResult.value.answers
      }
    }

    console.log('导出问卷结果', exportData)
    return exportData
  }

  const getQuestionProgress = (questionId) => {
    const question = getQuestionById(questionId)
    if (!question) return null
    
    const questionIndex = questions.findIndex(q => q.id === questionId)
    return {
      current: questionIndex + 1,
      total: totalQuestions.value,
      percentage: Math.round(((questionIndex + 1) / totalQuestions.value) * 100)
    }
  }

  const getSectionProgress = () => {
    const sections = getQuestionsBySection()
    const sectionProgress = {}
    
    Object.keys(sections).forEach(sectionKey => {
      const sectionQuestions = sections[sectionKey]
      const answeredInSection = sectionQuestions.filter(q => answers.value[q.id]).length
      
      sectionProgress[sectionKey] = {
        answered: answeredInSection,
        total: sectionQuestions.length,
        percentage: Math.round((answeredInSection / sectionQuestions.length) * 100)
      }
    })
    
    return sectionProgress
  }

  return {
    // 状态
    currentQuestionIndex,
    answers,
    isSubmitted,
    surveyResult,
    startTime,
    endTime,
    userPhone,
    
    // 计算属性
    currentQuestion,
    totalQuestions,
    progress,
    isLastQuestion,
    isFirstQuestion,
    answeredCount,
    allAnswered,
    unansweredQuestions,
    surveyDuration,
    
    // 方法
    startSurvey,
    setAnswer,
    getAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitSurvey,
    resetSurvey,
    exportResults,
    getQuestionProgress,
    getSectionProgress,
    setUserPhone,
    loadExistingSurveyResult,
    
    // 工具方法
    getAllQuestions,
    getQuestionById,
    calculateScore,
    getQuestionsBySection
  }
})