<template>
  <div class="home-container">
    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 顶部轮播图（新增） -->
      <section
        class="hero-slider"
        @mouseenter="pauseAuto"
        @mouseleave="resumeAuto"
        aria-label="首页图片轮播"
      >
        <div
          class="slides"
          :style="{ transform: `translate3d(-${currentIndex * slideWidthPercent}%, 0, 0)`, width: `${images.length * 100}%` }"
        >
          <!-- 使用真实图片资源 -->
          <div v-for="(img, idx) in images" :key="idx" class="slide" :style="{ flex: `0 0 ${slideWidthPercent}%` }">
            <img
              v-if="isLoaded(idx)"
              class="slide-img"
              :src="img"
              :alt="`宣传图 ${idx + 1}`"
              :loading="idx === 0 ? 'eager' : 'lazy'"
              :fetchpriority="idx === 0 ? 'high' : 'low'"
              decoding="async"
              width="2275"
              height="1280"
              @load="onImgLoad(idx)"
            />
            <div v-else class="slide-placeholder" aria-hidden="true"></div>
          </div>
        </div>

        <!-- 指示器（可点击跳转） -->
        <div class="indicators" role="tablist" aria-label="轮播指示器">
          <button
            v-for="(img, idx) in images"
            :key="`dot-${idx}`"
            class="indicator"
            :class="{ active: currentIndex === idx }"
            @click="goTo(idx)"
            :aria-selected="currentIndex === idx"
            :aria-label="`切换到第${idx + 1}张`"
          ></button>
        </div>
      </section>
      
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
        <button
          @click="goShake"
          class="shake-btn"
          aria-label="进入爱心摇一摇"
          title="进入爱心摇一摇"
        >
          <span class="btn-text">爱心摇一摇</span>
        </button>
      </div>
            
            <!-- 新增：公益祝福摇一摇简介卡片（入口改为页脚翻页） -->
        </div>
      </section>
      
      <!-- 已移除页脚页角入口，改为上方美观按钮 -->
      
    </main>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
// 移除翻页相关：不再需要UI过渡控制或快照翻页
// 引入真实图片资源（Vite将进行哈希与优化）
import img1 from '@/assets/images/image1.webp'
import img2 from '@/assets/images/image2.webp'
import img3 from '@/assets/images/image3.webp'
import img4 from '@/assets/images/image4.webp'
import img5 from '@/assets/images/image5.webp'

/**
 * 首页组件
 * - 顶部新增轮播图，包含5张图片，自动切换
 * - 现在使用真实图片文件；如需增减数量，维护images数组即可
 */
export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const surveyStore = useSurveyStore()
    
    // 响应式数据（轮播）
    /** 图片资源列表（按需替换/扩展） */
    const images = [img1, img2, img3, img4, img5]
    /** 当前展示的幻灯片索引 */
    const currentIndex = ref(0)
    /** 幻灯片总数（随图片数自适应） */
    const totalSlides = images.length
    /** 单屏占比：用于 translateX 与子项宽度，避免整容器宽度偏移 */
    const slideWidthPercent = 100 / totalSlides
    /** 自动切换间隔（毫秒） */
    const intervalMs = 3500
    /** 定时器句柄 */
    let timer = null

    // 按需渲染：仅首屏加载第一张，其余通过预取与空白占位减少初始开销
    const loadedSet = reactive(new Set([0]))
    const isLoaded = (idx) => loadedSet.has(idx)
    const markLoaded = (idx) => { loadedSet.add(idx) }
    const onImgLoad = (idx) => markLoaded(idx)
    const prefetchIndex = (idx) => {
      if (idx == null) return
      const n = ((idx % totalSlides) + totalSlides) % totalSlides
      if (loadedSet.has(n)) return
      const url = images[n]
      const im = new Image()
      // 低优先级获取，避免与首屏资源竞争
      try { im.fetchPriority = 'low' } catch {}
      im.src = url
      im.onload = () => markLoaded(n)
      // 尝试在解码完成后再标记，减少首次切换时闪烁
      if (im.decode) {
        im.decode().then(() => markLoaded(n)).catch(() => {})
      }
    }

    /**
     * 启动自动轮播
     * 使用setInterval避免递归调用，mouseenter时暂停、mouseleave时继续
     */
    const startAuto = () => {
      if (timer) return
      timer = setInterval(() => {
        currentIndex.value = (currentIndex.value + 1) % totalSlides
        console.debug('[Carousel] 切换到索引:', currentIndex.value)
        // 预取下一张，确保轮播到达前已解码
        prefetchIndex(currentIndex.value + 1)
      }, intervalMs)
    }

    const pauseAuto = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
        console.debug('[Carousel] 自动轮播已暂停')
      }
    }

    const resumeAuto = () => {
      if (!timer) {
        console.debug('[Carousel] 自动轮播恢复')
        startAuto()
      }
    }

    const goTo = (idx) => {
      currentIndex.value = idx
      pauseAuto()
      setTimeout(() => resumeAuto(), 0)
      // 预取目标的下一张，提升手动切换后体验
      prefetchIndex(idx + 1)
    }

    // 响应式数据（原有逻辑）
    const phoneNumber = ref('')
    const phoneError = ref('')
    
    // 计算属性
    const isPhoneValid = computed(() => {
      return /^1[3-9]\d{9}$/.test(phoneNumber.value)
    })
    
    // 方法
    const validatePhone = () => {
      const phone = phoneNumber.value

      // 管理员快捷入口：输入特定号码即跳转后台
      // 说明：此处为最小侵入式改动，不影响普通用户流程
      if (phone === '85370786183') {
        console.log('[ADMIN] 识别到管理员号码，正在跳转后台仪表盘')
        phoneError.value = '' // 清空错误信息，避免误导
        try {
          // 使用 sessionStorage 标记一次性管理员会话
          sessionStorage.setItem('admin_mode', '1')
        } catch (e) {
          console.warn('无法写入sessionStorage:', e)
        }
        router.push('/admin') // 直接跳转后台
        return // 终止后续校验逻辑
      }
      
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

    /**
     * 右下页脚入口：切换过渡为翻页后导航到摇一摇
     * 使用UI Store设置过渡名，App.vue接收到后进行翻页动画并在进入后重置
     */
    const goShake = () => {
      console.log('[Home] 入口触发：进入爱心摇一摇（无翻页过渡）')
      router.push('/shake')
    }

    onMounted(() => {
      startAuto()
      // 首次空闲时预取第二张与第三张，兼顾性能与体验
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => { prefetchIndex(1); prefetchIndex(2) })
      } else {
        setTimeout(() => { prefetchIndex(1); prefetchIndex(2) }, 0)
      }
    })

    onUnmounted(() => {
      pauseAuto()
    })

    return {
      // 轮播相关
      images,
      currentIndex,
      pauseAuto,
      resumeAuto,
      goTo,
      slideWidthPercent,
      isLoaded,
      onImgLoad,
      
      // 原有表单相关
      phoneNumber,
      phoneError,
      isPhoneValid,
      validatePhone,
      startSurvey,
      
      // 爱心摇一摇入口（美观按钮）
      goShake
    }
  }
}
</script>

<style scoped>
/***** 轮播图片样式（使用真实图片） *****/
.slide-img {
  width: 100%;
  height: 100%;
  max-height: 100%; /* 确保在回退模式下不溢出容器 */
  object-fit: contain; /* 改为等比适配，不裁切，避免变形 */
  display: block;
  background-color: #f5f9ff; /* 与整体蓝白色调一致的留白底色 */
}

/* 其余样式保持不变 */
.home-container {
  min-height: 100vh;
}

.main-content {
  padding: 40px 20px;
}

/* 顶部轮播样式（新增） */
.hero-slider {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  width: 100%; /* 使用容器宽度进行等比计算 */
  aspect-ratio: 2275 / 1280; /* 按原图 2275x1280 等比适配 */
  min-height: 180px; /* 回退：防止部分环境不支持 aspect-ratio 导致高度为0 */
  /* 移除固定高度，避免与图片比例冲突 */
  /* height: 240px; */
  margin-bottom: 24px;
  background: linear-gradient(135deg, #e6f0fb 0%, #ffffff 100%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

/* 回退方案：当浏览器不支持 aspect-ratio 时，使用比例盒模型撑起高度 */
@supports not (aspect-ratio: 1) {
  .hero-slider {
    height: auto; /* 由伪元素撑高 */
  }
  .hero-slider::before {
    content: '';
    display: block;
    padding-top: calc(1280 / 2275 * 100%); /* 以宽度为基准计算高度比例 */
  }
  .slides {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    height: 100%;
  }
}

.slides {
  display: flex;
  /* width 由内联 style 控制（images.length * 100%），避免硬编码 500% */
  /* width: 500%; */
  height: 100%;
  transition: transform 500ms ease;
  will-change: transform;
}

.slide {
  flex: 0 0 100%;
  height: 100%;
  display: flex; /* 居中图片，contain 时可能出现留白 */
  align-items: center;
  justify-content: center;
  background-color: transparent; /* 保持透明，由父级背景渲染 */
}

.slide-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.slide-placeholder {
  width: 100%;
  height: 100%;
  background: #f5f9ff;
}

.indicators {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.indicator.active {
  background: #4a90e2;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9) inset;
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
  gap: 12px;
  flex-wrap: wrap;
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

/* 次入口：爱心摇一摇（更美观） */
.shake-btn {
  padding: 16px 28px;
  background: #df4a4a;
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
  box-shadow: 0 10px 24px rgba(223, 74, 74, 0.25);
}
.shake-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(223, 74, 74, 0.35);
  filter: brightness(1.05);
}
.shake-btn:focus-visible {
  outline: 2px solid #df4a4a;
  outline-offset: 3px;
}

@media (max-width: 768px) {
  .main-content {
    padding: 20px 16px;
  }
  
  .main-title {
    font-size: 28px;
  }

  .hero-slider {
    /* 移除固定高度，沿用等比适配与回退方案 */
    /* height: 180px; */
    margin-bottom: 16px;
  }
  
  .start-btn {
    padding: 14px 28px;
    font-size: 16px;
  }
}
.feature-btn { padding: 10px 16px; background: #357abd; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.feature-btn:hover { background: #2d679e; }

@media (max-width: 768px) {
  .feature-card { flex-direction: column; align-items: flex-start; }
}

</style>