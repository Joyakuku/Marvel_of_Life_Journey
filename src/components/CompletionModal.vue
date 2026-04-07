<template>
  <!-- 弹窗遮罩层 -->
  <div 
    v-if="visible" 
    class="modal-overlay"
    @click="handleOverlayClick"
  >
    <!-- 弹窗内容 -->
    <div 
      class="modal-content"
      @click.stop
    >
      <!-- 成功图标 -->
      <div class="success-icon">
        <div class="icon-circle">
          <span class="checkmark">√</span>
        </div>
      </div>
      
      <!-- 标题和副标题 -->
      <h1 class="modal-title">评估完成</h1>
      <p class="modal-subtitle">
        感谢您完成造血干细胞捐献潜力评估问卷
      </p>
      
      <!-- 自动关闭提示 -->
      <div class="auto-close-hint">
        <span class="countdown-text">{{ countdownText }}</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="modal-actions">
        <button 
          @click="viewResults" 
          class="btn btn-primary"
        >
          查看详细结果
        </button>
        <button 
          @click="closeModal" 
          class="btn btn-secondary"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

/**
 * 问卷完成弹窗组件
 * 显示完成提示信息，支持自动关闭功能
 */
export default {
  name: 'CompletionModal',
  props: {
    /**
     * 控制弹窗显示状态
     */
    modelValue: {
      type: Boolean,
      default: false
    },
    /**
     * 自动关闭延迟时间（秒）
     */
    autoCloseDelay: {
      type: Number,
      default: 5
    }
  },
  emits: ['update:modelValue', 'close', 'view-results'],
  setup(props, { emit }) {
    const router = useRouter()
    
    // 响应式数据
    const visible = ref(props.modelValue)
    const countdown = ref(props.autoCloseDelay)
    const countdownTimer = ref(null)
    
    // 计算属性
    const countdownText = ref(`${countdown.value}秒后自动关闭`)
    
    // 方法
    const startCountdown = () => {
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
      }
      
      countdownTimer.value = setInterval(() => {
        countdown.value--
        countdownText.value = `${countdown.value}秒后自动关闭`
        
        if (countdown.value <= 0) {
          clearInterval(countdownTimer.value)
          autoCloseAndViewResults()
        }
      }, 1000)
    }
    
    const stopCountdown = () => {
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }
    }
    
    const closeModal = () => {
      stopCountdown()
      visible.value = false
      emit('update:modelValue', false)
      emit('close')
      console.log('关闭完成弹窗')
    }
    
    const autoCloseAndViewResults = () => {
      stopCountdown()
      emit('view-results')
      router.push('/result')
      visible.value = false
      emit('update:modelValue', false)
      console.log('倒计时结束，自动跳转到结果页面')
    }
    
    const handleOverlayClick = () => {
      closeModal()
    }
    
    const viewResults = () => {
      stopCountdown()
      emit('view-results')
      router.push('/result')
      closeModal()
      console.log('跳转到详细结果页面')
    }
    
    // 监听props变化
    const updateVisible = (newValue) => {
      visible.value = newValue
      if (newValue) {
        countdown.value = props.autoCloseDelay
        countdownText.value = `${countdown.value}秒后自动关闭`
        startCountdown()
      } else {
        stopCountdown()
      }
    }
    
    // 监听modelValue变化
    watch(() => props.modelValue, (newValue) => {
      updateVisible(newValue)
    })
    
    // 生命周期
    onMounted(() => {
      if (props.modelValue) {
        updateVisible(true)
      }
    })
    
    onUnmounted(() => {
      stopCountdown()
    })
    
    return {
      visible,
      countdownText,
      closeModal,
      handleOverlayClick,
      viewResults,
      autoCloseAndViewResults
    }
  }
}
</script>

<style scoped>
/* 弹窗遮罩层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease-out;
}

/* 弹窗内容 */
.modal-content {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease-out;
  position: relative;
}

/* 成功图标 */
.success-icon {
  margin-bottom: 1.5rem;
}

.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #28a745, #20c997);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  animation: bounceIn 0.6s ease-out 0.2s both;
}

.checkmark {
  color: white;
  font-size: 2rem;
  font-weight: bold;
}

/* 标题样式 */
.modal-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  animation: fadeInUp 0.5s ease-out 0.3s both;
}

.modal-subtitle {
  font-size: 1rem;
  color: #6c757d;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
  animation: fadeInUp 0.5s ease-out 0.4s both;
}

/* 自动关闭提示 */
.auto-close-hint {
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.5s ease-out 0.5s both;
}

.countdown-text {
  font-size: 0.9rem;
  color: #007bff;
  background: #e3f2fd;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  display: inline-block;
}

/* 操作按钮 */
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  animation: fadeInUp 0.5s ease-out 0.6s both;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
}

.btn-primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn-secondary {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover {
  background: #e9ecef;
  color: #495057;
  transform: translateY(-1px);
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
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

/* 响应式设计 */
@media (max-width: 480px) {
  .modal-content {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .modal-title {
    font-size: 1.5rem;
  }
  
  .modal-subtitle {
    font-size: 0.9rem;
  }
  
  .icon-circle {
    width: 60px;
    height: 60px;
  }
  
  .checkmark {
    font-size: 1.5rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>