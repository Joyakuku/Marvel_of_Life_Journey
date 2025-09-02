<template>
  <div class="result-container">


    <!-- 评估结果 -->
    <main class="result-content" v-if="surveyStore.surveyResult">
      <!-- 横排布局容器 -->
      <div class="horizontal-layout">
        <!-- 总体得分 -->
        <section class="score-section">
          <div class="score-card main-score">
            <div class="score-header">
              <div class="score-badge" :class="getScoreLevelClass(result.level.level)">
                {{ result.level.level }}
              </div>
            </div>
            
            <div class="score-display">
              <div class="score-circle">
                <svg class="progress-ring" width="120" height="120" @click="handleRingClick">
                  <!-- 背景圆环 -->
                  <circle
                    class="progress-ring-background"
                    stroke="#e9ecef"
                    stroke-width="16"
                    fill="transparent"
                    r="50"
                    cx="60"
                    cy="60"
                  />
                  <!-- 各维度圆环段 -->
                   <circle
                     v-for="(segment, index) in ringSegments"
                     :key="index"
                     class="progress-ring-segment"
                     :stroke="segment.color"
                     stroke-width="16"
                     fill="transparent"
                     r="50"
                     cx="60"
                     cy="60"
                     :stroke-dasharray="segment.dashArray"
                     :stroke-dashoffset="segment.dashOffset"
                     :style="{ cursor: 'pointer', pointerEvents: 'none' }"
                   />
                  <!-- 透明的点击区域，分为三个120度扇形 -->
                  <path
                    v-for="(area, index) in clickAreas"
                    :key="'area-' + index"
                    :d="area.path"
                    fill="transparent"
                    :style="{ cursor: 'pointer' }"
                    @click.stop="selectCategory(area.key)"
                  />
                </svg>
                <div class="score-text">
                  <span class="score-number">{{ result.percentage }}</span>
                  <span class="score-unit">分</span>
                </div>
                
                <!-- 圆环内部小型提示框 -->
                <div v-if="selectedCategory" class="ring-tooltip" :style="getTooltipPosition(selectedCategory)">
                  <div class="tooltip-content">
                    <div class="tooltip-header">
                      <span class="tooltip-icon">{{ categoryDetails[selectedCategory].icon }}</span>
                      <span class="tooltip-name">{{ categoryDetails[selectedCategory].name }}</span>
                      <button @click="selectedCategory = null" class="tooltip-close">×</button>
                    </div>
                    <div class="tooltip-score">
                      <span class="tooltip-percentage">{{ getCategoryPercentage(selectedCategory) }}%</span>
                      <span class="tooltip-fraction">{{ result.sectionScores[selectedCategory].score }}/{{ result.sectionScores[selectedCategory].max }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="score-details">
                <div class="score-description">
                  {{ result.level.description }}
                </div>
                
                <div class="generate-ai-section">
                  <button class="generate-ai-button" @click="generateAIAnalysis" :disabled="aiAnalysisLoading">
                    <span class="ai-icon">🤖</span>
                    生成AI智能分析
                  </button>
                  <p class="generate-ai-tip">点击获取更详细的个性化AI分析</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 分类得分 -->
        <section class="categories-section">
          

        </section>
      </div>



      <!-- AI评析与题目解析切换区域 -->
      <section class="analysis-section">
        <!-- 药丸形切换按钮 -->
        <div class="tab-switcher">
          <div class="tab-container">
            <button 
              :class="['tab-button', { active: activeTab === 'ai' }]"
              @click="activeTab = 'ai'"
            >
              <span class="tab-text">AI评析</span>
            </button>
            <button 
              :class="['tab-button', { active: activeTab === 'questions' }]"
              @click="activeTab = 'questions'"
            >
              <span class="tab-text">题目解析</span>
            </button>
            <div class="tab-indicator" :class="{ 'move-right': activeTab === 'questions' }"></div>
          </div>
        </div>

        <!-- AI评析内容 -->
        <div v-show="activeTab === 'ai'" class="ai-analysis-content">
          <div class="ai-analysis-card">
            <div class="ai-header">
              <div class="ai-info">
                <h4 class="ai-title">AI智能评析</h4>
                <p class="ai-subtitle">基于您的答题情况进行个性化分析</p>
              </div>
            </div>
            
            <div class="ai-content">
              <!-- 加载状态 -->
              <div v-if="aiAnalysisLoading" class="ai-loading">
                <div class="loading-spinner"></div>
                <p class="loading-text">AI正在分析您的问卷结果...</p>
              </div>
              
              <!-- 错误状态 -->
              <div v-else-if="aiAnalysisError" class="ai-error">
                <div class="error-icon">⚠️</div>
                <p class="error-text">{{ aiAnalysisError }}</p>
                <button class="retry-button" @click="refreshAIAnalysis">重新生成</button>
              </div>
              
              <!-- AI分析结果 -->
              <div v-else-if="customAiAnalysis || result.aiAnalysis" class="ai-text">
                <div class="ai-analysis-header">
                  <span class="ai-badge">🤖 AI分析</span>
                  <button class="refresh-button" @click="refreshAIAnalysis" :disabled="aiAnalysisLoading">
                    <span class="refresh-icon">🔄</span>
                    重新分析
                  </button>
                </div>
                <div class="ai-analysis-text">
                  {{ customAiAnalysis || result.aiAnalysis }}
                </div>
              </div>
              
              <!-- 默认AI分析（当没有AI分析时） -->
              <div v-else class="ai-text">
                <p>根据您的评估结果分析：</p>
                <div class="ai-insights">
                  <div class="insight-item">
                    <span class="insight-icon">•</span>
                    <div class="insight-content">
                      <strong>综合评分：</strong>您的总体得分为 {{ result.percentage }}%，
                      <span :class="getScoreLevelClass(result.level.level)">{{ result.level.level }}</span>
                      水平。{{ result.level.description }}
                    </div>
                  </div>
                  
                  <div class="insight-item" v-for="(section, key) in result.sectionScores" :key="key">
                    <span class="insight-icon">{{ categoryDetails[key].icon }}</span>
                    <div class="insight-content">
                      <strong>{{ categoryDetails[key].name }}：</strong>
                      得分 {{ section.score }}/{{ section.max }} ({{ getCategoryPercentage(key) }}%)，
                      {{ getAIInsightForSection(key, getCategoryPercentage(key)) }}
                    </div>
                  </div>
                  
                  <div class="insight-item">
                    <span class="insight-icon">•</span>
                    <div class="insight-content">
                      <strong>建议：</strong>{{ getAIRecommendation() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 题目解析内容 -->
        <div v-show="activeTab === 'questions'" class="questions-analysis-content">
          <div class="analysis-content">
            <div 
              v-for="question in getAllQuestions()" 
              :key="question.id" 
              class="analysis-item"
            >
              <h4 class="question-title">{{ question.title }}</h4>
              
              <!-- 用户答案 -->
              <template v-for="option in question.options" :key="option.key">
                <div 
                  v-if="getUserAnswer(question.id) === option.key"
                  class="user-answer"
                >
                  <span class="answer-label">您的答案：</span>
                  <span class="answer-text">{{ option.text }}</span>
                </div>
              </template>
              
              <!-- 解析 -->
              <div class="explanation">
                <span class="explanation-label">题目解析：</span>
                <p class="explanation-text">{{ question.explanation }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 无结果状态 -->
    <div v-else class="no-result">
      <div class="no-result-icon">?</div>
      <h2>暂无评估结果</h2>
      <p>请先完成问卷调查</p>
      <button @click="goToSurvey" class="action-btn primary">
        开始问卷
      </button>
    </div>

    <!-- 操作按钮 -->
    <footer class="result-actions" v-if="surveyStore.surveyResult">
      <div class="action-buttons">
        <button @click="retakeSurvey" class="action-btn secondary">
          <span class="btn-text">重新测评</span>
        </button>
        
        <button @click="shareResult" class="action-btn primary">
          <span class="btn-text">分享结果</span>
        </button>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
import { QUESTION_SECTIONS, useQuestions } from '@/composables/useQuestions'
import { surveyAPI } from '@/services/api'

/**
 * 评估结果页面
 * 显示问卷评估结果和相关统计信息
 */
export default {
  name: 'Result',
  setup() {
    const router = useRouter()
    const surveyStore = useSurveyStore()
    const { getAllQuestions: getQuestions } = useQuestions()
    
    // 响应式数据
    const selectedCategory = ref(null)
    const activeTab = ref('ai') // 默认显示AI评析
    const aiAnalysisLoading = ref(false)
    const aiAnalysisError = ref('')
    const customAiAnalysis = ref('')
    
    // 计算属性
    const result = computed(() => surveyStore.surveyResult)
    
    const circumference = computed(() => 2 * Math.PI * 26)
    
    const strokeDashoffset = computed(() => {
      if (!result.value) return circumference.value
      const progress = result.value.percentage / 100
      return circumference.value - (progress * circumference.value)
    })
    
    const categoryDetails = computed(() => ({
      [QUESTION_SECTIONS.HEALTH]: {
        name: '健康状况',
        icon: '•',
        description: '基本健康状况评估，包括年龄、体重、疾病史等因素',
        color: '#28a745'
      },
      [QUESTION_SECTIONS.INTENTION]: {
        name: '捐献意愿',
        icon: '•',
        description: '捐献意愿强度、家庭支持度、时间投入意愿等',
        color: '#007bff'
      },
      [QUESTION_SECTIONS.KNOWLEDGE]: {
        name: '知识认知',
        icon: '•',
        description: '对造血干细胞捐献相关知识的了解程度',
        color: '#17a2b8'
      }
    }))
    
    const ringSegments = computed(() => {
          // 防护措施：确保数据完整性
          if (!result.value || !surveyStore.surveyResult) return []
          
          const circumference = 2 * Math.PI * 50
          const totalCategories = 3 // 固定为三个维度
          const segmentAngle = 120 // 每个维度占120度
          const gapAngle = 6 // 各段之间的间隙角度
          const segmentLength = (segmentAngle - gapAngle) * (circumference / 360) // 每段的最大长度
          let currentOffset = 0
          const segments = []
          
          Object.keys(categoryDetails.value).forEach((key, index) => {
            const percentage = getCategoryPercentage(key)
            const actualLength = segmentLength * (percentage / 100) // 根据得分比例计算实际长度
            
            segments.push({
              key,
              color: categoryDetails.value[key].color,
              dashArray: `${actualLength} ${circumference - actualLength}`,
              dashOffset: -currentOffset,
              percentage
            })
            
            // 每段占据120度的空间（包括间隙）
            currentOffset += (120 * circumference) / 360
          })
          
          return segments
        })
    
    // 创建三个120度扇形点击区域
    const clickAreas = computed(() => {
      // 防护措施：确保数据完整性
      if (!result.value || !surveyStore.surveyResult) return []
      const categories = Object.keys(categoryDetails.value)
      const centerX = 60
      const centerY = 60
      const outerRadius = 58 // 稍大于圆环外径
      const innerRadius = 42 // 稍小于圆环内径
      
      return categories.map((key, index) => {
        // 每个扇形从0度开始，每个占120度，与圆环分段对应
        const startAngle = 0 + (index * 120)
        const endAngle = startAngle + 120
        
        // 转换为弧度
        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180
        
        // 计算扇形路径的各个点
        const x1 = centerX + innerRadius * Math.cos(startRad)
        const y1 = centerY + innerRadius * Math.sin(startRad)
        const x2 = centerX + outerRadius * Math.cos(startRad)
        const y2 = centerY + outerRadius * Math.sin(startRad)
        const x3 = centerX + outerRadius * Math.cos(endRad)
        const y3 = centerY + outerRadius * Math.sin(endRad)
        const x4 = centerX + innerRadius * Math.cos(endRad)
        const y4 = centerY + innerRadius * Math.sin(endRad)
        
        // 创建扇形路径
        const path = [
          `M ${x1} ${y1}`, // 移动到内圆起点
          `L ${x2} ${y2}`, // 连接到外圆起点
          `A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}`, // 外圆弧
          `L ${x4} ${y4}`, // 连接到内圆终点
          `A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`, // 内圆弧
          'Z' // 闭合路径
        ].join(' ')
        
        return {
          key,
          path
        }
      })
    })
    
    // 方法
    const getScoreLevelClass = (level) => {
      const levelMap = {
        '优秀': 'excellent',
        '良好': 'good',
        '一般': 'average',
        '待提升': 'poor'
      }
      return levelMap[level] || 'average'
    }
    
    const getScoreColor = (percentage) => {
      if (percentage >= 80) return '#28a745'
      if (percentage >= 65) return '#007bff'
      if (percentage >= 50) return '#ffc107'
      return '#dc3545'
    }
    
    const getCategoryPercentage = (categoryKey) => {
      if (!result.value) return 0
      const category = result.value.sectionScores[categoryKey]
      return category.max > 0 ? Math.round((category.score / category.max) * 100) : 0
    }
    
    const getCategoryColor = (categoryKey) => {
      return categoryDetails.value[categoryKey]?.color || '#6c757d'
    }
    
    const selectCategory = (categoryKey) => {
      selectedCategory.value = selectedCategory.value === categoryKey ? null : categoryKey
    }
    
    // 处理整个圆环的点击事件（备用）
    const handleRingClick = (event) => {
      // 如果点击的是扇形区域，会被阻止冒泡，这里不会执行
      // 这个方法主要作为备用，确保点击圆环其他区域时不会出错
      console.log('Ring clicked', event)
    }
    
    // 计算提示框位置 - 统一显示在右上角
    const getTooltipPosition = (categoryKey) => {
      // 所有提示框统一显示在右上角位置
      return {
        position: 'absolute',
        top: '-80px',
        right: '-100px',
        transform: 'none'
      }
    }
    

    
    const getPersonalizedRecommendations = () => {
      if (!result.value) return []
      
      const recommendations = []
      const { sectionScores, percentage } = result.value
      
      // 基于总分给出建议
      if (percentage >= 80) {
        recommendations.push('您具备很好的捐献潜力，建议联系相关机构了解捐献流程')
      } else if (percentage >= 65) {
        recommendations.push('您有一定的捐献潜力，可以进一步了解相关知识')
      } else {
        recommendations.push('建议您多了解造血干细胞捐献的相关知识')
      }
      
      // 基于各维度得分给出具体建议
      Object.keys(sectionScores).forEach(section => {
        const score = sectionScores[section]
        const percentage = score.max > 0 ? (score.score / score.max) * 100 : 0
        
        if (percentage < 60) {
          switch (section) {
            case QUESTION_SECTIONS.HEALTH:
              recommendations.push('建议关注身体健康状况，定期体检')
              break
            case QUESTION_SECTIONS.INTENTION:
              recommendations.push('可以与家人多沟通，了解他们对捐献的看法')
              break
            case QUESTION_SECTIONS.KNOWLEDGE:
              recommendations.push('建议多了解造血干细胞捐献的科学知识')
              break
          }
        }
      })
      
      return recommendations
    }
    

    
    const shareResult = () => {
      if (navigator.share) {
        navigator.share({
          title: '造血干细胞捐献潜力评估结果',
          text: `我的评估结果：${result.value.level.level}（${result.value.percentage}%）`,
          url: window.location.href
        })
      } else {
        // 复制到剪贴板
        const text = `我完成了造血干细胞捐献潜力评估，结果为：${result.value.level.level}（${result.value.percentage}%）`
        navigator.clipboard.writeText(text).then(() => {
          alert('结果已复制到剪贴板')
        })
      }
      console.log('分享评估结果')
    }
    
    const retakeSurvey = () => {
      surveyStore.resetSurvey()
      router.push('/')
      console.log('重新开始问卷')
    }
    
    const goToSurvey = () => {
      router.push('/survey')
    }
    
    // 题目解析相关方法
    const getAllQuestions = () => {
      // 从useQuestions composable获取所有题目
      return getQuestions()
    }
    
    const getUserAnswer = (questionId) => {
      // 从surveyStore获取用户答案
      return surveyStore.getAnswer(questionId) || ''
    }
    
    const isCorrectAnswer = (question, optionKey) => {
      // 判断是否为最佳答案（得分最高的选项）
      if (!question.scoreMap) return false
      
      const maxScore = Math.max(...Object.values(question.scoreMap))
      return question.scoreMap[optionKey] === maxScore && maxScore > 0
    }
    
    const getUserScore = (question) => {
      // 获取用户在该题的得分
      const userAnswer = getUserAnswer(question.id)
      if (!userAnswer || !question.scoreMap) return 0
      
      return question.scoreMap[userAnswer] || 0
    }
    
    // AI分析相关方法
    const getAIInsightForSection = (sectionKey, percentage) => {
      if (percentage >= 80) {
        return '表现优秀，具备良好的基础条件'
      } else if (percentage >= 65) {
        return '表现良好，有一定提升空间'
      } else if (percentage >= 50) {
        return '表现一般，建议加强相关方面'
      } else {
        return '有较大提升空间，建议重点关注'
      }
    }
    
    const getAIRecommendation = () => {
       if (!result.value) return ''
       
       const { percentage, sectionScores } = result.value
       const recommendations = []
       
       if (percentage >= 80) {
         recommendations.push('您具备很好的捐献潜力，建议联系相关机构了解具体捐献流程')
       } else if (percentage >= 65) {
         recommendations.push('您有一定的捐献潜力，可以进一步了解相关知识并咨询专业人士')
       } else {
         recommendations.push('建议您多了解造血干细胞捐献的相关知识，提升认知水平')
       }
       
       // 找出得分最低的维度
       let lowestSection = null
       let lowestPercentage = 100
       
       Object.keys(sectionScores).forEach(section => {
         const score = sectionScores[section]
         const percentage = score.max > 0 ? (score.score / score.max) * 100 : 0
         if (percentage < lowestPercentage) {
           lowestPercentage = percentage
           lowestSection = section
         }
       })
       
       if (lowestSection && lowestPercentage < 70) {
         switch (lowestSection) {
           case QUESTION_SECTIONS.HEALTH:
             recommendations.push('特别建议关注身体健康状况，保持良好的生活习惯')
             break
           case QUESTION_SECTIONS.INTENTION:
             recommendations.push('可以与家人朋友多沟通，了解他们对捐献的看法和支持度')
             break
           case QUESTION_SECTIONS.KNOWLEDGE:
             recommendations.push('建议通过官方渠道了解更多造血干细胞捐献的科学知识')
             break
         }
       }
       
       return recommendations.join('；')
     }
    
    // AI分析相关方法
    const generateAIAnalysis = async () => {
      if (!result.value) {
        console.warn('没有评估结果，无法生成AI分析')
        return
      }
      
      aiAnalysisLoading.value = true
      aiAnalysisError.value = ''
      
      try {
        console.log('🤖 开始生成AI分析...')
        
        // 构建分析数据
        const analysisData = {
          answers: surveyStore.answers || {},
          totalScore: result.value.totalScore,
          percentage: result.value.percentage,
          section1Score: result.value.sectionScores?.health?.score || 0,
          section2Score: result.value.sectionScores?.intention?.score || 0,
          section3Score: result.value.sectionScores?.knowledge?.score || 0
        }
        
        const response = await surveyAPI.generateAIAnalysis(analysisData)
        
        if (response.success && response.data?.aiAnalysis) {
          customAiAnalysis.value = response.data.aiAnalysis
          console.log('✅ AI分析生成成功')
        } else {
          throw new Error('AI分析响应格式错误')
        }
        
      } catch (error) {
        console.error('❌ AI分析生成失败:', error.message)
        aiAnalysisError.value = '生成AI分析时出现错误，请稍后重试'
        
        // 使用默认分析作为备选方案
        customAiAnalysis.value = getDefaultAIAnalysis()
        
      } finally {
        aiAnalysisLoading.value = false
      }
    }
    
    const getDefaultAIAnalysis = () => {
      if (!result.value) return ''
      
      const { percentage, sectionScores } = result.value
      let analysis = `根据您的问卷结果分析：\n\n`
      
      // 总体评价
      if (percentage >= 80) {
        analysis += `🎉 您的总体表现优秀，得分率达到${percentage}%，展现出良好的综合素质。\n\n`
      } else if (percentage >= 65) {
        analysis += `👍 您的总体表现良好，得分率为${percentage}%，具备一定的基础能力。\n\n`
      } else if (percentage >= 50) {
        analysis += `📈 您的总体表现中等，得分率为${percentage}%，还有提升的空间。\n\n`
      } else {
        analysis += `💪 您的得分率为${percentage}%，建议加强相关方面的学习和实践。\n\n`
      }
      
      // 分部分分析
      analysis += `**各部分表现：**\n`
      Object.keys(sectionScores || {}).forEach(key => {
        const section = sectionScores[key]
        const sectionPercentage = section.max > 0 ? Math.round((section.score / section.max) * 100) : 0
        const sectionName = categoryDetails.value[key]?.name || key
        analysis += `• ${sectionName}：${section.score}/${section.max}分 (${sectionPercentage}%)\n`
      })
      
      analysis += `\n**改进建议：**\n`
      if (percentage < 70) {
        analysis += `• 建议多关注得分较低的部分，有针对性地提升\n`
        analysis += `• 可以通过学习相关知识来改善表现\n`
      }
      analysis += `• 保持积极的学习态度，持续改进\n`
      analysis += `• 定期进行自我评估，跟踪进步情况`
      
      return analysis
    }
    
    const refreshAIAnalysis = () => {
      generateAIAnalysis()
    }
    
    // 生命周期
    onMounted(() => {
      console.log('Result页面挂载')
      // 延迟检查，避免热重载时的状态不一致问题
      setTimeout(() => {
        // 如果没有结果，重定向到首页
        if (!surveyStore.surveyResult || !surveyStore.isSubmitted) {
          console.warn('没有找到评估结果，重定向到首页')
          router.push('/')
          return
        }
        console.log('评估结果已加载:', surveyStore.surveyResult)
        
        // 如果没有AI分析且当前显示AI标签页，自动生成AI分析
        if (activeTab.value === 'ai' && !result.value?.aiAnalysis && !customAiAnalysis.value) {
          setTimeout(() => {
            generateAIAnalysis()
          }, 500)
        }
      }, 100)
    })
    
    return {
      surveyStore,
      result,
      selectedCategory,
      circumference,
      strokeDashoffset,
      categoryDetails,
      ringSegments,
      clickAreas,
      getScoreLevelClass,
      getScoreColor,
      getCategoryPercentage,
      getCategoryColor,
      selectCategory,
      handleRingClick,
      getTooltipPosition,
      getPersonalizedRecommendations,
      shareResult,
      retakeSurvey,
      goToSurvey,
      // 题目解析方法
      getAllQuestions,
      getUserAnswer,
      isCorrectAnswer,
      getUserScore,
      // AI分析方法
       activeTab,
       getAIInsightForSection,
       getAIRecommendation,
       aiAnalysisLoading,
       aiAnalysisError,
       customAiAnalysis,
       generateAIAnalysis,
       refreshAIAnalysis
     }
   }
}
</script>

<style scoped>
.result-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
  padding: 20px;
}



.result-content {
  max-width: 1000px;
  margin: 0 auto;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

/* 横排布局容器 */
.horizontal-layout {
  display: flex;
  gap: 20px; /* 缩小间距 */
  margin-bottom: 40px;
  align-items: flex-start;
  flex-wrap: nowrap; /* 确保不换行 */
  width: 100%; /* 确保占满容器宽度 */
}

/* 总体得分 */
.score-section {
  flex: 0 0 300px; /* 固定宽度300px */
  min-width: 280px; /* 最小宽度 */
}

.main-score {
  background: white;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.score-header h2 {
  font-size: 16px;
  color: #2c3e50;
  margin: 0;
}

.score-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.score-badge.excellent {
  background: #d4edda;
  color: #155724;
}

.score-badge.good {
  background: #cce7ff;
  color: #004085;
}

.score-badge.average {
  background: #fff3cd;
  color: #856404;
}

.score-badge.poor {
  background: #f8d7da;
  color: #721c24;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-circle {
  position: relative;
  flex-shrink: 0;
}

.progress-ring {
  transform: rotate(-90deg);
  position: relative;
}

.progress-ring-progress {
  transition: stroke-dashoffset 1s ease-in-out;
  stroke-linecap: round;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-number {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
}

.score-unit {
  font-size: 10px;
  color: #6c757d;
}

.score-details {
  flex: 1;
}

.score-fraction {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
}

.score-description {
  font-size: 10px;
  color: #6c757d;
  line-height: 1.3;
  text-align: center;
}

/* 分类得分 */
.categories-section {
  flex: 1; /* 占据剩余空间 */
  min-width: 400px; /* 最小宽度 */
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
}

/* 圆环内部提示框样式 */
.ring-tooltip {
  position: absolute;
  z-index: 10;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e9ecef;
  width: 120px; /* 固定宽度确保一致性 */
  height: 80px; /* 固定高度确保一致性 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.ring-tooltip::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border: 1px solid #e9ecef;
  transform: rotate(45deg);
}

/* 右上角提示框箭头 - 指向圆环中心 */
.ring-tooltip::before {
  bottom: -5px;
  left: 20px;
  transform: rotate(45deg);
  border-top: none;
  border-right: none;
}

.tooltip-content {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 6px;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.tooltip-icon {
  font-size: 14px;
}

.tooltip-name {
  font-size: 11px;
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
  text-align: left;
}

.tooltip-close {
  background: none;
  border: none;
  font-size: 14px;
  color: #6c757d;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  line-height: 1;
}

.tooltip-close:hover {
  background: #f8f9fa;
}

.tooltip-score {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0; /* 防止分数区域被压缩 */
}

.tooltip-percentage {
  font-size: 14px;
  font-weight: 700;
  color: #007bff;
}

.tooltip-fraction {
  font-size: 9px;
  color: #6c757d;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}



/* 圆环段样式 */
.progress-ring-segment {
  transition: stroke-width 0.2s ease, opacity 0.2s ease;
}

.progress-ring-segment:hover {
  stroke-width: 10;
  opacity: 0.8;
}

.category-card {
  background: white;
  border-radius: 6px; /* 缩小圆角 */
  padding: 8px; /* 缩小内边距 */
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.04); /* 缩小阴影 */
  border: 1px solid rgba(74, 144, 226, 0.1);
  transition: all 0.2s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(74, 144, 226, 0.12);
  border-color: rgba(74, 144, 226, 0.2);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px; /* 缩小间距 */
  margin-bottom: 8px; /* 缩小底部边距 */
}

.category-icon {
  font-size: 16px; /* 缩小图标 */
}

.category-name {
  font-size: 12px; /* 缩小标题字体 */
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.category-score {
  margin-bottom: 8px; /* 缩小底部边距 */
}

.score-bar {
  height: 4px; /* 缩小进度条高度 */
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px; /* 缩小底部边距 */
}

.score-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1s ease-in-out;
  background: linear-gradient(90deg, #4a90e2, #357abd);
}

.score-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px; /* 缩小分数字体 */
  font-weight: 500;
}

.category-description {
  font-size: 10px; /* 缩小描述字体 */
  color: #6c757d;
  line-height: 1.3; /* 缩小行高 */
  margin: 0;
}



/* 药丸形切换按钮样式 */
.tab-switcher {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.tab-container {
  position: relative;
  display: flex;
  background: #f8fafc;
  border-radius: 25px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  border-radius: 21px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  z-index: 2;
  flex: 1;
}

.tab-button.active {
  color: #3b82f6;
}

.tab-button:hover {
  color: #3b82f6;
}



.tab-text {
  white-space: nowrap;
  line-height: 1;
  display: flex;
  align-items: center;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: white;
  border-radius: 21px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  z-index: 1;
}

.tab-indicator.move-right {
  transform: translateX(100%);
}

/* AI评析内容样式 */
.ai-analysis-content {
  animation: fadeIn 0.3s ease-in-out;
}

.ai-analysis-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  color: #2c3e50;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.ai-avatar {
  width: 2.5rem;
  height: 2.5rem;
  background: #f8fafc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  border: 1px solid #e5e7eb;
}

.ai-info {
  flex: 1;
}

.ai-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.ai-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

.ai-content {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
}

.ai-text {
  line-height: 1.7;
  font-size: 0.95rem;
}

.ai-insights {
  margin-top: 1rem;
}

.insight-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.insight-icon {
  font-size: 1.125rem;
  margin-top: 0.125rem;
}

.insight-content {
  flex: 1;
  line-height: 1.6;
}

.insight-content strong {
  font-weight: 600;
}

/* 评分等级样式 */
.score-excellent {
  color: #10b981;
  font-weight: 600;
}

.score-good {
  color: #3b82f6;
  font-weight: 600;
}

.score-average {
  color: #f59e0b;
  font-weight: 600;
}

.score-poor {
  color: #ef4444;
  font-weight: 600;
}

/* 题目解析内容样式 */
.questions-analysis-content {
  animation: fadeIn 0.3s ease-in-out;
}

/* 无结果状态 */
.no-result {
  text-align: center;
  padding: 80px 20px;
  color: #2c3e50;
}

.no-result-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.no-result h2 {
  font-size: 28px;
  margin-bottom: 12px;
}

.no-result p {
  font-size: 16px;
  margin-bottom: 32px;
  color: #5a6c7d;
}

/* 操作按钮 */
.result-actions {
  max-width: 1000px;
  margin: 0 auto;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-btn.primary {
  background: #4a90e2;
  color: white;
}

.action-btn.primary:hover {
  background: #357abd;
  transform: translateY(-2px);
}

.action-btn.secondary {
  background: white;
  color: #495057;
  border: 2px solid #e9ecef;
}

.action-btn.secondary:hover {
  border-color: #4a90e2;
  color: #4a90e2;
  transform: translateY(-2px);
}

/* 题目解析样式 */
.analysis-section {
  margin-bottom: 40px;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.analysis-item {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.analysis-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.question-title {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
}

.user-answer {
  background: linear-gradient(135deg, #e0f2fe 0%, #f3e5f5 100%);
  padding: 0.875rem 1.125rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  border-left: 4px solid #3b82f6;
}

.answer-label {
  color: #3b82f6;
  font-weight: 600;
  font-size: 0.875rem;
  display: block;
  margin-bottom: 0.25rem;
}

.answer-text {
  color: #1f2937;
  font-weight: 500;
  font-size: 0.95rem;
}

.explanation {
  background: #f8fafc;
  padding: 1rem 1.125rem;
  border-radius: 10px;
  border-left: 4px solid #10b981;
}

.explanation-label {
  color: #10b981;
  font-weight: 600;
  font-size: 0.875rem;
  display: block;
  margin-bottom: 0.5rem;
}

.explanation-text {
  color: #4b5563;
  line-height: 1.6;
  margin: 0;
  font-size: 0.95rem;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tab-container {
    width: 100%;
    max-width: 320px;
  }
  
  .tab-button {
    padding: 0.625rem 0.75rem;
    font-size: 0.8rem;
    gap: 0.375rem;
  }
  
  .tab-icon {
    font-size: 0.875rem;
  }
  
  .ai-analysis-card {
    padding: 1.5rem;
    margin: 0 -0.5rem;
  }
  
  .ai-header {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .ai-avatar {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.25rem;
  }
  
  .ai-title {
    font-size: 1.125rem;
  }
  
  .ai-content {
    padding: 1.25rem;
  }
  
  .insight-item {
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }
  
  .insight-icon {
    align-self: flex-start;
  }
  
  .analysis-item {
    padding: 1.25rem;
    margin: 0 -0.5rem;
  }
  
  .question-title {
    font-size: 1rem;
  }
  
  .user-answer,
  .explanation {
    padding: 0.75rem 1rem;
  }
  
  .answer-label,
  .explanation-label {
    font-size: 0.8rem;
  }
  
  .answer-text,
  .explanation-text {
    font-size: 0.875rem;
  }
}

.score-info {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
}

.score-value {
  color: #2c3e50;
  font-size: 16px;
  font-weight: 700;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .result-container {
    padding: 16px;
  }
  

  
  .main-score {
    padding: 24px;
  }
  
  .score-display {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
  }
  

  
  .action-buttons {
    justify-content: center;
    gap: 12px;
  }
  
  .action-btn {
    flex: 1;
    max-width: 200px;
    justify-content: center;
  }
  
  /* 题目解析响应式 */
  .analysis-item {
    padding: 20px;
  }
  
  .analysis-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .question-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
  
  .analysis-header .question-title {
    font-size: 16px;
  }
  
  .option-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .score-info {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .horizontal-layout {
    flex-direction: column;
    gap: 16px;
  }
  
  .score-section {
    flex: none;
  }
  
  .categories-section {
    margin-left: 0;
  }
  
  .categories-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .score-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  

  
  .categories-grid {
    grid-template-columns: 1fr;
  }
  

  
  .category-card,
  .recommendation-card {
    padding: 20px;
  }
}

/* AI分析功能样式 */
.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e3f2fd;
  border-top: 3px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.ai-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  margin: 16px 0;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.error-text {
  color: #e53e3e;
  font-size: 14px;
  margin: 0 0 16px 0;
}

.retry-button {
  background: #e53e3e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #c53030;
}

.ai-analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}

.ai-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.refresh-button {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.refresh-button:hover:not(:disabled) {
  background: #e9ecef;
  color: #495057;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
  transition: transform 0.3s;
}

.refresh-button:hover:not(:disabled) .refresh-icon {
  transform: rotate(180deg);
}

.ai-analysis-text {
  color: #2c3e50;
  line-height: 1.6;
  white-space: pre-line;
  font-size: 14px;
}

.generate-ai-section {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.generate-ai-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.generate-ai-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.generate-ai-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}

.ai-icon {
  font-size: 16px;
}

.generate-ai-tip {
  margin: 12px 0 0 0;
  color: #6c757d;
  font-size: 12px;
}

@media (max-width: 768px) {
  .ai-analysis-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .generate-ai-section {
    margin-top: 16px;
    padding: 16px;
  }
  
  .generate-ai-button {
    width: 100%;
    justify-content: center;
  }
}
</style>