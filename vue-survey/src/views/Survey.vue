<template>
  <div class="survey-container">
    <!-- 完成弹窗 -->
    <CompletionModal
      v-model="showCompletionModal"
      @close="handleModalClose"
      @view-results="handleViewResults"
      :auto-close-delay="5"
    />

    <!-- 问题区域 -->
    <main class="question-section">
      <div v-if="surveyStore.currentQuestion" class="question-container">
        <QuestionItem
          :question="surveyStore.currentQuestion"
          :question-number="surveyStore.currentQuestionIndex + 1"
          :model-value="surveyStore.getAnswer(surveyStore.currentQuestion.id)"
          @update:model-value="handleAnswerUpdate"
          @answer-changed="handleAnswerChanged"
          :show-explanation="false"
        />
      </div>
      
      <!-- 加载状态 -->
      <div v-else class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载问题...</p>
      </div>
    </main>

    <!-- 导航按钮区域 -->
    <footer class="navigation-section">
      <div class="nav-buttons">
        <!-- 上一题按钮 -->
        <button
          v-if="!surveyStore.isFirstQuestion"
          @click="handlePrevQuestion"
          class="nav-btn prev-btn"
          :disabled="isNavigating"
        >
          <span class="btn-icon">←</span>
          <span class="btn-text">上一题</span>
        </button>
        
        <!-- 占位元素，保持布局 -->
        <div v-else class="nav-placeholder"></div>
        
        <!-- 下一题/提交按钮 -->
        <button
          v-if="!surveyStore.isLastQuestion"
          @click="handleNextQuestion"
          class="nav-btn next-btn"
          :disabled="isNavigating || !isCurrentQuestionAnswered"
        >
          <span class="btn-text">下一题</span>
          <span class="btn-icon">→</span>
        </button>
        
        <!-- 提交按钮 -->
        <button
          v-else
          @click="handleSubmit"
          class="nav-btn submit-btn"
          :disabled="!surveyStore.allAnswered || isSubmitting"
        >
          <span v-if="isSubmitting" class="loading-spinner small"></span>
          <span class="btn-text">
            {{ isSubmitting ? '提交中...' : '提交答卷' }}
          </span>
        </button>
      </div>
      

    </footer>




  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
import QuestionItem from '@/components/QuestionItem.vue'
import CompletionModal from '@/components/CompletionModal.vue'

/**
 * 问卷调查主页面
 * 包含问题展示、导航控制、进度管理等功能
 */
export default {
  name: 'Survey',
  components: {
    QuestionItem,
    CompletionModal
  },
  setup() {
    const router = useRouter()
    const surveyStore = useSurveyStore()
    
    // 响应式数据
    const isNavigating = ref(false)
    const isSubmitting = ref(false)
    const showCompletionModal = ref(false)
    
    // 计算属性
    const isCurrentQuestionAnswered = computed(() => {
      if (!surveyStore.currentQuestion) return false
      const answer = surveyStore.getAnswer(surveyStore.currentQuestion.id)
      return !!answer
    })
    
    // 方法
    const handleAnswerUpdate = (answer) => {
      if (surveyStore.currentQuestion) {
        surveyStore.setAnswer(surveyStore.currentQuestion.id, answer)
        console.log(`更新答案 - 问题${surveyStore.currentQuestion.id}: ${answer}`)
      }
    }
    
    const handleAnswerChanged = (data) => {
      console.log('答案变化事件:', data)
      // 可以在这里添加自动保存逻辑
    }
    
    const handleNextQuestion = async () => {
      if (isNavigating.value) return
      
      isNavigating.value = true
      try {
        const success = surveyStore.nextQuestion()
        if (success) {
          console.log('切换到下一题成功')
        }
      } catch (error) {
        console.error('切换到下一题失败:', error)
      } finally {
        setTimeout(() => {
          isNavigating.value = false
        }, 200)
      }
    }
    
    const handlePrevQuestion = async () => {
      if (isNavigating.value) return
      
      isNavigating.value = true
      try {
        const success = surveyStore.prevQuestion()
        if (success) {
          console.log('切换到上一题成功')
        }
      } catch (error) {
        console.error('切换到上一题失败:', error)
      } finally {
        setTimeout(() => {
          isNavigating.value = false
        }, 200)
      }
    }
    
    const handleSubmit = async () => {
      console.log('开始提交问卷...')
      console.log('当前状态:', {
        isSubmitting: isSubmitting.value,
        allAnswered: surveyStore.allAnswered,
        answeredCount: surveyStore.answeredCount,
        totalQuestions: surveyStore.totalQuestions
      })
      
      if (isSubmitting.value || !surveyStore.allAnswered) {
        console.warn('提交条件不满足，取消提交')
        return
      }
      
      isSubmitting.value = true
      try {
        console.log('调用 surveyStore.submitSurvey()')
        const success = await surveyStore.submitSurvey()
        console.log('submitSurvey 返回结果:', success)
        
        if (success) {
          console.log('问卷提交成功，显示完成弹窗')
          console.log('当前 surveyResult:', surveyStore.surveyResult)
          
          // 显示完成弹窗
          showCompletionModal.value = true
          console.log('完成弹窗已显示')
        } else {
          console.error('submitSurvey 返回 false')
          alert('提交失败，请检查是否所有题目都已回答')
        }
      } catch (error) {
        console.error('提交问卷失败:', error)
        alert('提交失败，请稍后重试')
      } finally {
        isSubmitting.value = false
        console.log('提交流程结束')
      }
    }
    
    const handleModalClose = () => {
      console.log('完成弹窗关闭')
      showCompletionModal.value = false
    }
    
    const handleViewResults = () => {
      console.log('用户选择查看详细结果')
      router.push('/result')
    }
    
    // 键盘导航
    const handleKeydown = (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          if (!surveyStore.isFirstQuestion && !isNavigating.value) {
            handlePrevQuestion()
          }
          break
        case 'ArrowRight':
          if (!surveyStore.isLastQuestion && isCurrentQuestionAnswered.value && !isNavigating.value) {
            handleNextQuestion()
          }
          break
        case 'Enter':
          if (surveyStore.isLastQuestion && surveyStore.allAnswered && !isSubmitting.value) {
            handleSubmit()
          }
          break
      }
    }
    
    // 生命周期
    onMounted(() => {
      console.log('Survey页面挂载')
      // 开始问卷
      surveyStore.startSurvey()
      // 添加键盘事件监听
      document.addEventListener('keydown', handleKeydown)
    })
    
    onUnmounted(() => {
      console.log('Survey页面卸载')
      // 移除键盘事件监听
      document.removeEventListener('keydown', handleKeydown)
    })
    
    return {
      surveyStore,
      isNavigating,
      isSubmitting,
      showCompletionModal,
      isCurrentQuestionAnswered,
      handleAnswerUpdate,
      handleAnswerChanged,
      handleNextQuestion,
      handlePrevQuestion,
      handleSubmit,
      handleModalClose,
      handleViewResults
    }
  }
}
</script>

<style scoped>
.survey-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
  padding: 20px 20px 140px 20px;
}



.question-section {
  max-width: 800px;
  margin: 0 auto 30px;
  margin-top: 10px; /* 减少题目卡片与进度条的间距 */
}

.question-container {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0 8px 0 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.navigation-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 24px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.nav-placeholder {
  width: 120px;
}

.nav-btn {
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
  min-width: 120px;
  justify-content: center;
}

.prev-btn {
  background: #e8f4fd;
  color: #4a90e2;
  border: 1px solid #d1e7fc;
}

.prev-btn:hover:not(:disabled) {
  background: #d1e7fc;
  border-color: #4a90e2;
  transform: translateY(-1px);
}

.next-btn {
  background: #4a90e2;
  color: white;
}

.next-btn:hover:not(:disabled) {
  background: #357abd;
  transform: translateY(-1px);
}

.submit-btn {
  background: #4a90e2;
  color: white;
  border: 1px solid #4a90e2;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

.submit-btn:hover:not(:disabled) {
  background: #357abd;
  border-color: #357abd;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.nav-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}







/* 响应式设计 */

@media (max-width: 768px) {
  .survey-container {
    padding: 16px;
  }
  
  .survey-title {
    font-size: 24px;
  }
  
  .survey-description {
    font-size: 15px;
  }
  
  .navigation-section {
    padding: 20px;
  }
  
  .nav-btn {
    padding: 10px 20px;
    font-size: 15px;
    min-width: 100px;
  }
  

}

@media (max-width: 480px) {
  .survey-container {
    padding: 12px;
  }
  
  .nav-buttons {
    flex-direction: column;
    gap: 12px;
  }
  
  .nav-placeholder {
    display: none;
  }
  
  .nav-btn {
    width: 100%;
    min-width: auto;
  }
  

}
</style>