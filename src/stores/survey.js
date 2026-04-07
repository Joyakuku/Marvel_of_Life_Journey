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
        console.log('从localStorage恢复状态(原始):', parsed)

        // === 迁移本地存储的旧数据结构到新结构 ===
        // 说明：老版本无 source/sectionScores/maxTotal/percentage 等字段，或字段名不一致
        const migrateSavedState = (state) => {
          if (!state || typeof state !== 'object') return state
          const cloned = { ...state }

          // 仅在存在 surveyResult 时进行迁移
          if (cloned.surveyResult && typeof cloned.surveyResult === 'object') {
            const sr = { ...cloned.surveyResult }

            // 1) 统一 AI 分析字段名
            if (!sr.aiAnalysis && sr.analysis) {
              sr.aiAnalysis = sr.analysis
            }

            // 2) 构造 sectionScores（兼容旧的 section1/2/3Score 字段）
            if (!sr.sectionScores || typeof sr.sectionScores !== 'object') {
              const sectionScores = {
                health: { score: sr.section1Score ?? 0, max: sr.section1Max ?? 0 },
                intention: { score: sr.section2Score ?? 0, max: sr.section2Max ?? 0 },
                knowledge: { score: sr.section3Score ?? 0, max: sr.section3Max ?? 0 }
              }
              sr.sectionScores = sectionScores
            }

            // 3) 计算各分区最大分（若缺失），避免 max 为 0 导致百分比异常
            const ensureSectionMaxes = () => {
              try {
                // 基于题库动态计算分区最大分，增强可移植性
                const calcMaxForSection = (sectionKey) => {
                  const sectionQuestions = getQuestionsBySection(sectionKey)
                  return sectionQuestions.reduce((acc, q) => {
                    const maxForQ = q?.scoreMap ? Math.max(...Object.values(q.scoreMap)) : 0
                    return acc + (isFinite(maxForQ) ? maxForQ : 0)
                  }, 0)
                }

                const maxHealth = sr.sectionScores?.health?.max || calcMaxForSection(QUESTION_SECTIONS.HEALTH)
                const maxIntention = sr.sectionScores?.intention?.max || calcMaxForSection(QUESTION_SECTIONS.INTENTION)
                const maxKnowledge = sr.sectionScores?.knowledge?.max || calcMaxForSection(QUESTION_SECTIONS.KNOWLEDGE)

                sr.sectionScores.health.max = maxHealth
                sr.sectionScores.intention.max = maxIntention
                sr.sectionScores.knowledge.max = maxKnowledge

                // 记录总最大分
                sr.maxTotal = maxHealth + maxIntention + maxKnowledge
              } catch (e) {
                console.warn('迁移: 计算分区最大分失败，使用现有 max 值', e)
                const h = sr.sectionScores?.health?.max || 0
                const i = sr.sectionScores?.intention?.max || 0
                const k = sr.sectionScores?.knowledge?.max || 0
                sr.maxTotal = h + i + k
              }
            }
            ensureSectionMaxes()

            // 4) 统一 totalScore（若缺失则按分区分数求和）
            const sumSectionScores = (
              (sr.sectionScores?.health?.score || 0) +
              (sr.sectionScores?.intention?.score || 0) +
              (sr.sectionScores?.knowledge?.score || 0)
            )
            sr.totalScore = (typeof sr.totalScore === 'number' && isFinite(sr.totalScore)) ? sr.totalScore : sumSectionScores

            // 5) 统一 percentage（始终以 total/max 重新计算，避免旧缓存不一致）
            const maxTotalSafe = (typeof sr.maxTotal === 'number' && sr.maxTotal > 0) ? sr.maxTotal : 100
            sr.percentage = Math.round((sr.totalScore / maxTotalSafe) * 100)

            // 6) 标记来源：若存在 databaseId 且无 source，则设为 database
            if (!sr.source && (sr.databaseId || sr._id)) {
              sr.source = 'database'
            }

            cloned.surveyResult = sr
          }

          return cloned
        }

        const migrated = migrateSavedState(parsed)
        console.log('从localStorage恢复状态(迁移后):', migrated)
        return migrated
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

    // 兼容性处理：将分类得分映射为 section1/2/3 的扁平字段，确保后续提交时不会丢失
    const mappedSection1Score = result.sectionScores?.[QUESTION_SECTIONS.HEALTH]?.score || 0
    const mappedSection2Score = result.sectionScores?.[QUESTION_SECTIONS.INTENTION]?.score || 0
    const mappedSection3Score = result.sectionScores?.[QUESTION_SECTIONS.KNOWLEDGE]?.score || 0
    console.log('分区得分映射:', { mappedSection1Score, mappedSection2Score, mappedSection3Score })
    
    // 添加额外信息
    surveyResult.value = {
      ...result,
      // 扁平化分区得分，便于API序列化与后端入库
      section1Score: mappedSection1Score,
      section2Score: mappedSection2Score,
      section3Score: mappedSection3Score,
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
    
    // 注意：不再在这里提交到数据库，延后到结果页面AI分析完成后再提交
    console.log('问卷本地提交成功，等待结果页面完成AI分析后提交到数据库')
    console.log('最终 surveyResult:', surveyResult.value)
    console.log('isSubmitted:', isSubmitted.value)
    console.log('=== submitSurvey 结束 ===')
    return true
  }

  // 提交数据到数据库（在AI分析完成后调用）
  const submitToDatabase = async (aiAnalysisResult) => {
    console.log('=== submitToDatabase 开始 ===')
    console.log('AI分析结果:', aiAnalysisResult)
    
    // 确保AI分析结果不为空，避免创建空记录
    if (!aiAnalysisResult || aiAnalysisResult.trim() === '') {
      console.warn('⚠️ AI分析结果为空，跳过数据库提交')
      return { success: false, message: 'AI分析结果为空' }
    }
    
    try {
      // 动态导入API服务
      const { surveyAPI } = await import('@/services/api.js')
      
      // 检查是否已有数据库记录ID
      const databaseId = surveyResult.value?.databaseId
      
      if (databaseId) {
        // 如果已有数据库记录，只更新AI分析内容
        console.log('🔄 更新现有记录的AI分析内容:', { databaseId, aiAnalysisLength: aiAnalysisResult.length })
        
        const updateResponse = await surveyAPI.updateAIAnalysis(databaseId, aiAnalysisResult)
        
        if (updateResponse.success) {
          console.log('✅ AI分析内容更新成功:', updateResponse)
          
          // 将最新AI分析同步到本地状态，保证刷新后可见
          try {
            surveyResult.value.aiAnalysis = aiAnalysisResult
            surveyResult.value.analysis = aiAnalysisResult // 向后兼容
          } catch (e) {
            console.warn('同步AI分析到本地状态时出错:', e)
          }
          
          // 更新localStorage
          saveToStorage({
            answers: answers.value,
            isSubmitted: isSubmitted.value,
            surveyResult: surveyResult.value,
            startTime: startTime.value,
            endTime: endTime.value,
            userPhone: userPhone.value
          })
          
          return { success: true, data: updateResponse.data }
        } else {
          console.warn('❌ AI分析内容更新失败:', updateResponse.message)
          return { success: false, message: updateResponse.message }
        }
        
      } else {
        // 如果没有数据库记录，先创建基础记录，再更新AI分析
        console.log('📝 第一步：创建基础数据库记录')

        // 兜底：当 surveyResult 中没有扁平字段时，基于 sectionScores 动态计算，避免提交0
        const s1 = surveyResult.value?.section1Score ?? (surveyResult.value?.sectionScores?.[QUESTION_SECTIONS.HEALTH]?.score ?? 0)
        const s2 = surveyResult.value?.section2Score ?? (surveyResult.value?.sectionScores?.[QUESTION_SECTIONS.INTENTION]?.score ?? 0)
        const s3 = surveyResult.value?.section3Score ?? (surveyResult.value?.sectionScores?.[QUESTION_SECTIONS.KNOWLEDGE]?.score ?? 0)
        console.log('将要提交的分区得分:', { s1, s2, s3 })
        
        const submitData = {
          phone: userPhone.value,
          answers: answers.value,
          totalScore: surveyResult.value.totalScore,
          percentage: surveyResult.value.percentage,
          section1Score: s1,
          section2Score: s2,
          section3Score: s3,
          aiAnalysis: '', // 先创建空的AI分析
          startTime: new Date(startTime.value).toISOString(),
          endTime: new Date(endTime.value).toISOString()
        }
        
        console.log('创建基础记录:', submitData)
        
        // 调用后端API创建记录
        const createResponse = await surveyAPI.submitSurvey(submitData)
        
        if (createResponse.success) {
          console.log('✅ 基础记录创建成功:', createResponse)
          const newId = createResponse.data?.id
          
          // 将数据库ID保存到结果中
          surveyResult.value.databaseId = newId
          
          // 第二步：更新AI分析内容
          console.log('📝 第二步：更新AI分析内容')
          const updateResponse = await surveyAPI.updateAIAnalysis(newId, aiAnalysisResult)
          
          if (updateResponse.success) {
            console.log('✅ AI分析内容更新成功:', updateResponse)
            
            // 将最新AI分析同步到本地状态，保证刷新后可见
            try {
              surveyResult.value.aiAnalysis = aiAnalysisResult
              surveyResult.value.analysis = aiAnalysisResult // 向后兼容
            } catch (e) {
              console.warn('同步AI分析到本地状态时出错:', e)
            }
            
            // 更新localStorage
            saveToStorage({
              answers: answers.value,
              isSubmitted: isSubmitted.value,
              surveyResult: surveyResult.value,
              startTime: startTime.value,
              endTime: endTime.value,
              userPhone: userPhone.value
            })
            
            return { success: true, data: { id: newId, ...updateResponse.data } }
          } else {
            console.warn('❌ AI分析内容更新失败:', updateResponse.message)
            return { success: false, message: updateResponse.message }
          }
        } else {
          console.warn('❌ 基础记录创建失败:', createResponse.message)
          return { success: false, message: createResponse.message }
        }
      }
      
    } catch (error) {
      console.error('❌ 提交到数据库失败:', error.message)
      return { success: false, message: error.message }
    } finally {
      console.log('=== submitToDatabase 结束 ===')
    }
  }

  /**
   * 将AI分析结果写入到本地store，并立即持久化到localStorage
   * 用于在生成AI分析成功后，数据库提交之前，确保刷新不丢失
   * @param {string} aiText - AI分析文本
   */
  const updateLocalAIAnalysis = (aiText) => {
    try {
      if (!aiText || typeof aiText !== 'string') return
      // 同步到本地的surveyResult
      if (!surveyResult.value) surveyResult.value = {}
      surveyResult.value.aiAnalysis = aiText
      surveyResult.value.analysis = aiText // 兼容旧字段
      // 持久化
      saveToStorage({
        answers: answers.value,
        isSubmitted: isSubmitted.value,
        surveyResult: surveyResult.value,
        startTime: startTime.value,
        endTime: endTime.value,
        userPhone: userPhone.value
      })
      console.log('📝 已将AI分析写入本地状态并持久化，长度:', aiText.length)
    } catch (e) {
      console.warn('持久化AI分析失败:', e)
    }
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

      // 解析历史答案并写入全局 answers（非常关键：题目解析依赖该字段展示“您的答案”）
      // 兼容后端可能以字符串或JSON对象存储的场景，确保前端拿到的是对象
      const parsedAnswers = (() => {
        const raw = surveyData.answers
        if (raw == null) return {}
        if (typeof raw === 'string') {
          try {
            const obj = JSON.parse(raw)
            return obj && typeof obj === 'object' ? obj : {}
          } catch (e) {
            console.warn('历史记录 answers 为字符串但解析失败，将置为空。原始值:', raw)
            return {}
          }
        }
        if (typeof raw === 'object') {
          // 浅拷贝，避免后续意外修改原对象
          return { ...raw }
        }
        return {}
      })()
      answers.value = parsedAnswers
      console.log('历史答案已载入，条目数:', Object.keys(answers.value).length)
      
      // 计算本问卷的最大可得分（不依赖用户答案）
      // 使用 calculateScore({}) 可遍历题库并统计每题的最大分，从而得到总maxScore与分区max
      const maxInfo = calculateScore({})
      const totalMaxScore = maxInfo?.maxScore || 100 // 兜底100分
      const sectionMaxMap = maxInfo?.sectionScores || {
        [QUESTION_SECTIONS.HEALTH]: { max: 0, score: 0 },
        [QUESTION_SECTIONS.INTENTION]: { max: 0, score: 0 },
        [QUESTION_SECTIONS.KNOWLEDGE]: { max: 0, score: 0 }
      }

      // 将数据库中的扁平字段映射为按枚举键的分区对象，结构为 { score, max }
      const sectionScores = {
        [QUESTION_SECTIONS.HEALTH]: {
          // 健康状况
          score: Number(surveyData.section1_score || surveyData.section1Score || 0),
          max: Number(sectionMaxMap[QUESTION_SECTIONS.HEALTH]?.max || 0)
        },
        [QUESTION_SECTIONS.INTENTION]: {
          // 捐献意愿
          score: Number(surveyData.section2_score || surveyData.section2Score || 0),
          max: Number(sectionMaxMap[QUESTION_SECTIONS.INTENTION]?.max || 0)
        },
        [QUESTION_SECTIONS.KNOWLEDGE]: {
          // 知识认知
          score: Number(surveyData.section3_score || surveyData.section3Score || 0),
          max: Number(sectionMaxMap[QUESTION_SECTIONS.KNOWLEDGE]?.max || 0)
        }
      }

      // 统一解析总分：优先数据库字段(total_score)，其次驼峰(totalScore)，否则回退为各分区之和
      // 这样可以避免由于字段名不一致导致的总分计算错误
      const parsedTotalScore = (() => {
        const fromDb = Number(surveyData.total_score)
        if (!Number.isNaN(fromDb) && fromDb > 0) return fromDb
        const fromCamel = Number(surveyData.totalScore)
        if (!Number.isNaN(fromCamel) && fromCamel > 0) return fromCamel
        const sumSections =
          Number(surveyData.section1_score || surveyData.section1Score || 0) +
          Number(surveyData.section2_score || surveyData.section2Score || 0) +
          Number(surveyData.section3_score || surveyData.section3Score || 0)
        return Number(sumSections) || 0
      })()

      // 计算总百分比（优先使用后端值，其次使用统一后的总分 / 最大分）
      const percentage = (() => {
        const raw = Number(surveyData.percentage)
        if (!Number.isNaN(raw) && raw >= 0) return Math.round(raw)
        return totalMaxScore > 0 ? Math.round((parsedTotalScore / totalMaxScore) * 100) : 0
      })()

      // 统一构造 surveyResult，字段与提交流程保持一致，避免Result.vue读取结构不一致
      surveyResult.value = {
        // 基础分数
        totalScore: Number(parsedTotalScore),
        maxScore: Number(totalMaxScore),
        percentage,

        // 分区扁平字段（兼容历史逻辑）
        section1Score: Number(surveyData.section1_score || surveyData.section1Score || 0),
        section2Score: Number(surveyData.section2_score || surveyData.section2Score || 0),
        section3Score: Number(surveyData.section3_score || surveyData.section3Score || 0),

        // 分区对象（供Result.vue等组件使用）
        sectionScores,

        // 同步历史答案，保证导出/展示一致
        answers: answers.value,

        // AI分析字段：同时保留 aiAnalysis 与 analysis 两个字段，向后兼容
        aiAnalysis: surveyData.ai_analysis || surveyData.aiAnalysis || '',
        analysis: surveyData.ai_analysis || surveyData.aiAnalysis || '',

        // 等级描述（与计算结果保持一致的简单分档）
        level: {
          level: percentage >= 80 ? '优秀' : percentage >= 60 ? '良好' : percentage >= 40 ? '一般' : '需改进',
          description: '基于历史问卷数据的评估结果'
        },

        // 其他元数据
        submittedAt: surveyData.created_at || surveyData.createdAt || new Date().toISOString(),
        databaseId: surveyData.id,
        
        /**
         * 来源标记：用于前端逻辑判断（例如Result.vue避免对历史数据自动生成AI分析）
         * database 表示该结果来自后端已有数据，而非本次新提交
         */
        source: 'database'
      }
      
      console.log('历史结果已映射为标准结构:', {
        totalScore: surveyResult.value.totalScore,
        maxScore: surveyResult.value.maxScore,
        percentage: surveyResult.value.percentage,
        sectionScores: surveyResult.value.sectionScores
      })
      
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
    submitToDatabase,
    resetSurvey,
    exportResults,
    getQuestionProgress,
    getSectionProgress,
    setUserPhone,
    loadExistingSurveyResult,
    updateLocalAIAnalysis,
    
    // 工具方法
    getAllQuestions,
    getQuestionById,
    calculateScore,
    getQuestionsBySection
  }
})