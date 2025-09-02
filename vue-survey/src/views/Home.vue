<template>
  <div class="home-container">
    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 欢迎区域 -->
      <section class="welcome-section">
        <div class="welcome-content">
          <h1 class="main-title">欢迎参与调查问卷</h1>
          
          <div class="intro-text">
            <p>
              您好！欢迎参与本次造血干细胞捐献潜力线上测试。本问卷旨在评估您成为造血干细胞捐献者的潜力，涵盖基本健康状况、捐献意愿和知识认知等方面。您的回答将严格保密，仅用于本次评估。请您根据自身实际情况如实作答，感谢您的支持与配合！
            </p>
          </div>
          
          <!-- 手机号输入区域 -->
          <div class="phone-input-section">
            <div class="input-group">
              <label for="phone" class="input-label">请输入您的手机号</label>
              <input 
                id="phone"
                v-model="phoneNumber" 
                type="tel" 
                class="phone-input"
                placeholder="请输入11位手机号码"
                maxlength="11"
                @input="validatePhone"
              />
              <div v-if="phoneError" class="error-message">{{ phoneError }}</div>
            </div>
          </div>
          
          <div class="cta-area">
            <button 
              @click="startSurvey" 
              class="start-btn"
              :disabled="!isPhoneValid"
              :class="{ disabled: !isPhoneValid }"
            >
              <span class="btn-text">开始评估</span>
            </button>
          </div>
        </div>
      </section>
      

      
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'

/**
 * 首页组件
 * 应用的入口页面，介绍评估系统并引导用户开始评估
 */
export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const surveyStore = useSurveyStore()
    
    // 响应式数据
    const phoneNumber = ref('')
    const phoneError = ref('')
    
    // 计算属性
    const isPhoneValid = computed(() => {
      return /^1[3-9]\d{9}$/.test(phoneNumber.value)
    })
    
    // 方法
    const validatePhone = () => {
      const phone = phoneNumber.value
      
      if (!phone) {
        phoneError.value = ''
        return
      }
      
      if (!/^\d+$/.test(phone)) {
        phoneError.value = '手机号只能包含数字'
        return
      }
      
      if (phone.length < 11) {
        phoneError.value = '手机号长度不足11位'
        return
      }
      
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        phoneError.value = '请输入有效的手机号码'
        return
      }
      
      phoneError.value = ''
    }
    
    const startSurvey = async () => {
      if (!isPhoneValid.value) {
        phoneError.value = '请先输入有效的手机号码'
        return
      }
      
      console.log('开始问卷评估，手机号:', phoneNumber.value)
      
      try {
        // 检查手机号是否已存在问卷记录
        console.log('检查手机号是否已存在问卷记录...')
        const { surveyAPI } = await import('@/services/api.js')
        const checkResult = await surveyAPI.checkPhoneExists(phoneNumber.value)
        
        console.log('手机号检查结果:', checkResult)
        
        if (checkResult.success && checkResult.exists) {
          // 手机号已存在，显示确认弹窗
          const shouldOverwrite = confirm(
            `检测到手机号 ${phoneNumber.value} 已有问卷记录。\n\n` +
            `是否要覆盖之前的记录？\n\n` +
            `点击"确定"覆盖记录并重新开始问卷\n` +
            `点击"取消"查看之前的问卷结果`
          )
          
          if (!shouldOverwrite) {
            // 用户选择不覆盖，跳转到结果页面
            console.log('用户选择查看之前的问卷结果')
            
            // 将已有的问卷数据加载到store中
            if (checkResult.data) {
              surveyStore.loadExistingSurveyResult(checkResult.data)
            }
            
            // 跳转到结果页面
            router.push('/result')
            return
          }
          
          console.log('用户选择覆盖之前的记录')
        }
        
      } catch (error) {
        console.error('检查手机号时发生错误:', error)
        // 如果检查失败，继续正常流程，不阻止用户开始问卷
        console.log('手机号检查失败，继续正常流程')
      }
      
      // 重置之前的状态
      surveyStore.resetSurvey()
      
      // 保存手机号到store
      surveyStore.setUserPhone(phoneNumber.value)
      
      // 强制开始新问卷
      surveyStore.startSurvey(true)
      
      // 跳转到问卷页面
      router.push('/survey')
    }
    
    return {
      phoneNumber,
      phoneError,
      isPhoneValid,
      validatePhone,
      startSurvey
    }
  }
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
}

.main-content {
  padding: 40px 20px;
}

.welcome-section {
  text-align: center;
}

.welcome-content {
  max-width: 800px;
  margin: 0 auto;
}

.main-title {
  font-size: 36px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 32px;
}

.intro-text {
  margin-bottom: 40px;
}

.intro-text p {
  font-size: 16px;
  color: #5a6c7d;
  line-height: 1.6;
  margin: 0;
}

/* 手机号输入区域 */
.phone-input-section {
  margin-bottom: 32px;
}

.input-group {
  max-width: 400px;
  margin: 0 auto;
  text-align: left;
}

.input-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  text-align: center;
}

.phone-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 16px;
  color: #2c3e50;
  background: white;
  transition: all 0.2s ease;
  text-align: center;
}

.phone-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.phone-input::placeholder {
  color: #adb5bd;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 6px;
  text-align: center;
}

.cta-area {
  display: flex;
  justify-content: center;
}

.start-btn {
  padding: 16px 32px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-btn:hover:not(.disabled) {
  background: #357abd;
  transform: translateY(-2px);
}

.start-btn.disabled {
  background: #adb5bd;
  cursor: not-allowed;
  transform: none;
}

.start-btn:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .main-content {
    padding: 20px 16px;
  }
  
  .main-title {
    font-size: 28px;
  }
  
  .start-btn {
    padding: 14px 28px;
    font-size: 16px;
  }
}
</style>