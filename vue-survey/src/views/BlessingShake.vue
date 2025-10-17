<template>
  <div class="shake-container">
    <!-- 头部介绍移除：页面仅保留摇一摇模块与装瓶入口 -->

    <!-- 身份弹窗：登录/注册/改密 三态 -->
    <div v-if="showPwdModal" class="modal-backdrop">
      <div class="modal auth-modal">
        <h3 v-if="authMode==='login'">登陆</h3>
        <h3 v-else-if="authMode==='register'">注册账号（设置密码）</h3>
        <h3 v-else>更改密码</h3>

        <div class="row">
          <label>手机号</label>
          <input v-model="phone" placeholder="请输入11位手机号" />
        </div>

        <div class="row" v-if="authMode!=='register'">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="至少4位" />
        </div>

        <div class="row" v-if="authMode!=='login'">
          <label>新密码</label>
          <input v-model="newPassword" type="password" placeholder="至少4位 新密码" />
        </div>

        <div class="actions">
          <button v-if="authMode==='login'" @click="doVerify">登录</button>
          <button v-else-if="authMode==='register'" @click="doRegister">注册</button>
          <button v-else @click="doChangePassword">更改密码</button>
        </div>

        <!-- 右下角“更多”按钮：展开注册与改密选项 -->
        <button class="more-btn" @click="toggleMore" title="注册/更改密码">⋯</button>
        <div v-if="showMore" class="more-menu" role="menu">
          <button class="link-btn" @click="authMode='register'; showMore=false" role="menuitem">注册</button>
          <button class="link-btn" @click="authMode='change'; showMore=false" role="menuitem">更改密码</button>
          <button class="link-btn" @click="authMode='login'; showMore=false" role="menuitem">返回登录</button>
        </div>

        
      </div>
    </div>

    <!-- 发布祝福弹窗：复用改造前的发布模块（装瓶） -->
    <div v-if="showPublishModal" class="modal-backdrop">
      <div class="modal">
        <h3>发布我的祝福</h3>
        <p v-if="openedByGate" class="gate-tip">今天尚未发送祝福，请先发布一次，随后即可进行摇一摇。</p>
        <div class="form-row">
          <label class="label">选择标签</label>
          <div class="tags">
            <button
              v-for="t in TAGS"
              :key="t"
              class="tag"
              :class="{ active: form.tag === t }"
              @click="form.tag = t"
            >{{ t }}</button>
          </div>
        </div>
        <div class="form-row">
          <label class="label">祝福语（最多100字）</label>
          <textarea v-model="form.text" maxlength="100" class="input" placeholder="输入简短祝福语，传递温暖…"></textarea>
        </div>
        <div class="form-row">
          <label class="label">主题图片（可选）</label>
          <input type="file" accept="image/*" @change="onImageFileChange" />
          <p class="hint">支持手机相册或拍照上传，大小不超过5MB。</p>
          <div v-if="form.image" class="uploaded-preview">
            <img :src="form.image" alt="已上传图片预览" />
            <button class="clear-btn" @click="clearImage">移除图片</button>
          </div>
        </div>
        <div class="form-row">
          <label class="label">语音祝福（可选）</label>
          <div class="audio-row">
            <button class="record-btn" :class="{ recording }" @click="toggleRecord">
              {{ recording ? '停止录音' : '开始录音' }}
            </button>
            <span v-if="recording" class="rec-tip">录音中…</span>
            <audio v-if="form.audioUrl" :src="form.audioUrl" controls class="audio"></audio>
          </div>
          <p class="hint">若设备不支持或未授权麦克风，将自动降级为仅文本发布。</p>
        </div>
        <div class="form-actions">
          <button class="submit" :disabled="!canSubmit || imageUploading" @click="submitBlessing">
            {{ imageUploading ? '图片上传中…' : '发布祝福' }}
          </button>
          <p class="uploading" v-if="imageUploading">图片上传中，请稍候完成后再发布。</p>
        </div>
        <div class="actions">
          <button @click="showPublishModal=false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 摇一摇互动区域 -->
    <section class="shake-section">
      <h2 class="shake-title">“髓”爱摇一摇
        <button class="bottle-btn" @click="openPublishModal" title="装瓶">装瓶</button>
        <!-- 右上角汉堡菜单按钮 -->
        <button class="hamburger-btn" @click="toggleMenu" title="菜单">☰</button>
      </h2>
      <div class="shake-panel" @click="manualShake" :aria-label="'点击或摇动手机触发匹配'">
        <div class="bottle-container" :class="{ shake: isShaking }">
          <!-- 瓶子背景图片 -->
          <img src="@/assets/images/bottle.png" alt="爱心瓶子" class="bottle-image" />
          <!-- 爱心动画层 -->
          <div class="hearts-overlay">
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h1" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h2" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h3" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h4" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h5" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h6" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h7" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h8" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h9" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h10" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h11" />
            <img src="@/assets/images/heart.png" alt="爱心" class="heart h12" />
          </div>
        </div>
        <p class="shake-hint">摇一摇手机或点击触发</p>
      </div>
      
    </section>
    <!-- 右侧抽屉：徽章进度 + 我的祝福 -->
    <div v-if="showMenu" class="drawer-backdrop" @click.self="showMenu=false">
      <div class="drawer">
        <div class="drawer-header">
          <strong>我的公益</strong>
          <button class="close-btn" @click="showMenu=false">×</button>
        </div>
        <div class="drawer-tabs">
          <button class="tab-btn" :class="{active: menuTab==='progress'}" @click="menuTab='progress'">徽章进度</button>
          <button class="tab-btn" :class="{active: menuTab==='mine'}" @click="menuTab='mine'">我的祝福</button>
        </div>
        <div class="drawer-body">
          <!-- 徽章进度 -->
          <div v-if="menuTab==='progress'">
            <div class="badge" :class="{ unlocked: badgeUnlocked }">
              <span class="icon">🎖️</span>
              <div>
                <div class="title">七日连击徽章</div>
                <div class="streak-tip">{{ badgeUnlocked ? '已解锁' : '累计连续7天参与可解锁' }}</div>
              </div>
            </div>
          <div class="progress-cloud" v-if="cloudProgress">
            <h4>进度</h4>
            <div class="stat-row"><span>连续参与天数</span><strong>{{ cloudProgress.streakDays || 0 }}</strong></div>
            <div class="stat-row"><span>今日摇一摇次数</span><strong>{{ cloudProgress.todayShakeCount || 0 }}</strong></div>
            <div class="stat-row"><span>云端徽章</span><strong>{{ cloudProgress.badgeUnlocked ? '已解锁' : '未解锁' }}</strong></div>
          </div>
            <p v-else class="hint">登录后将自动展示云端进度。</p>
          </div>
          <!-- 我的祝福列表 -->
          <div v-else>
            <div v-if="myBlessingsLoading" class="loading">正在加载…</div>
            <div v-else-if="myBlessingsError" class="error">加载失败：{{ myBlessingsError }} <button class="retry-btn" @click="reloadBlessings">重试</button></div>
            <div v-else-if="!phone">请先登录后查看</div>
            <div v-else-if="!myBlessings.length" class="empty">暂时还没有发布记录</div>
            <div v-else class="blessing-list">
              <div v-for="b in myBlessings" :key="b.id" class="blessing-item">
                <div class="row1">
                  <span class="tag-pill">{{ b.tag || '公益祝福' }}</span>
                  <span class="status" :class="b.review_status">{{ statusLabel(b.review_status) }}</span>
                </div>
                <div class="content">{{ b.content }}</div>
                <img v-if="b.image_url" :src="resolveFileUrl(b.image_url)" alt="预览" />
                <div class="row2">
                  <span>👍 {{ b.likes || 0 }}</span>
                  <span>🎖️ {{ b.medals || 0 }}</span>
                  <span class="date">{{ formatDate(new Date(b.created_at).getTime()) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 当日互动内容弹窗（摇一摇结果） -->
    <div v-if="showMatchModal && currentMatch" class="modal-backdrop">
      <div class="modal">
        <h3>今日互动内容</h3>
        <div class="match-header">
          <span class="tag-pill">{{ currentMatch.tag }}</span>
          <span class="date">{{ formatDate(currentMatch.date) }}</span>
        </div>
        <p class="match-text">{{ currentMatch.text }}</p>
        <img v-if="matchImageSrc" :src="matchImageSrc" alt="匹配图片" class="match-img" />
        <audio v-if="matchAudioSrc" :src="matchAudioSrc" controls class="audio"></audio>
        <div class="actions">
          <button class="like" @click="likeCurrent" :disabled="hasLiked(currentMatch.id)">👍 点赞 {{ getLikes(currentMatch.id) }}</button>
          <button class="medal" @click="medalCurrent">🎖️ 赠予爱心勋章 {{ getMedals(currentMatch.id) }}</button>
          <button @click="showMatchModal=false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import ProgressBar from '@/components/ProgressBar.vue'
// 主题图片改为用户上传，不再使用内置图片资源
import { shakeAPI, resolveFileUrl } from '@/services/api'
import { useSurveyStore } from '@/stores/survey'
import { useShake } from '@/composables/useShake'

/**
 * 公益祝福摇一摇页面
 * - 前端轻量实现，使用 localStorage 管理祝福池与用户互动
 * - 设备支持时启用 DeviceMotionEvent；否则点击模拟摇动
 * - 语音录制采用 MediaRecorder（浏览器原生），不可用时自动降级
 */
export default {
  name: 'BlessingShake',
  components: { ProgressBar },
  setup() {
    const TAGS = ['急救故事', '献血日记', '灾区祝福']

    // 表单状态
    const form = reactive({ tag: TAGS[0], text: '', image: null, audioUrl: null })
    const imageUploading = ref(false)
    const recording = ref(false)
    let mediaRecorder = null
    let chunks = []

    // 交互状态
    const isShaking = ref(false)
    const currentMatch = ref(null)
    // 弹窗控制：发布与匹配结果
    const showPublishModal = ref(false)
    const showMatchModal = ref(false)
    // 门禁提示：由摇一摇或点击瓶子触发时显示
    const openedByGate = ref(false)
    // 提示音
    let audioCtx = null
    // 全新：统一摇一摇模块
    const shake = useShake({
      orientThreshold: 32,
      motionThreshold: 10,
      cooldownMs: 1200,
      orientSampleMs: 80,
      motionSampleMs: 200,
      onShake: () => {
        // 摇动检测通过后，走门禁再弹窗
        if (!verified.value) { showPwdModal.value = true; return }
        // 使用云端同步的发布检测
        if (!hasPublishedToday()) { openedByGate.value = true; showPublishModal.value = true; return }
        handleMatch(); showMatchModal.value = true
      }
    })
    // 传感器提示与自检已移除，专注于核心摇一摇交互

    // 本地存储键
    const LS_KEY = 'blessing-shake-state'
    // 会话持久化键（仅当前标签页有效，刷新也保留；关闭浏览器后清除）
    const AUTH_KEY = 'shake-auth'

    // 内部状态
    const state = reactive({
      uploads: [], // 我发布过的祝福
      pool: [], // 祝福池（包含我与内置示例）
      likes: {}, // contentId -> count
      medals: {}, // contentId -> count
      likedIds: {}, // 防重复点赞
      dailyUploadCount: {}, // YYYY-MM-DD -> count
      dailyShakeCount: {}, // YYYY-MM-DD -> count
      activityDates: [], // 参与日期集合
      badgeUnlocked: false
    })

    /** 汉堡菜单与抽屉数据 **/
    const showMenu = ref(false)
    const menuTab = ref('progress') // progress | mine
    const myBlessings = ref([])
    const myBlessingsLoading = ref(false)
    const myBlessingsError = ref('')
    const cloudProgress = ref(null)
    const todayShakeCount = computed(() => {
      const todayKey = todayStr()
      const cloud = cloudProgress.value
      const cloudVal = cloud ? (Number((cloud.dailyShakeCount || {})[todayKey] || cloud.todayShakeCount || 0)) : 0
      return cloudVal
    })
    const statusLabel = (s) => ({ approved: '已通过', pending: '审核中', rejected: '未通过' }[String(s||'pending')] || '审核中')
    const toggleMenu = async () => {
      showMenu.value = !showMenu.value
      if (showMenu.value) await loadMenuData()
    }
    const loadMenuData = async () => {
      try {
        if (!phone.value) return
        // 云端进度
        try {
          const p = await shakeAPI.getProgress(phone.value)
          console.info('[Cloud] 拉取进度返回', {
            phoneMasked: String(phone.value || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
            success: !!p?.success,
            hasData: !!p?.data,
            summary: {
              streakDays: Number(p?.data?.streakDays || 0),
              todayShakeCount: Number(p?.data?.todayShakeCount || 0),
              badgeUnlocked: !!p?.data?.badgeUnlocked,
              activityDatesCount: Array.isArray(p?.data?.activityDates) ? p.data.activityDates.length : 0
            }
          })
          cloudProgress.value = p?.data || null
          if (cloudProgress.value) {
            const todayKey = todayStr()
            const todayCloudShake = Number((cloudProgress.value.dailyShakeCount || {})[todayKey] || cloudProgress.value.todayShakeCount || 0)
            console.info('[Cloud] 解析云端进度', {
              todayKey,
              todayShakeCount: todayCloudShake,
              streakDays: Number(cloudProgress.value.streakDays || 0),
              badgeUnlocked: !!cloudProgress.value.badgeUnlocked
            })
          }
        } catch (_) { cloudProgress.value = null }
        // 我的祝福
        myBlessingsError.value = ''
        myBlessingsLoading.value = true
        const res = await shakeAPI.listBlessingsByPhone(phone.value, 1, 50)
        myBlessings.value = Array.isArray(res?.data) ? res.data : []
      } catch (e) {
        console.warn('加载菜单数据失败', e)
        myBlessingsError.value = e?.message || '未知错误'
      } finally {
        myBlessingsLoading.value = false
      }
    }
    /**
     * 独立的云端进度刷新（用于门禁与挂载后的同步）
     */
    const refreshCloudProgress = async () => {
      try {
        if (!phone.value) return
        const p = await shakeAPI.getProgress(phone.value)
        cloudProgress.value = p?.data || null
        const todayKey = todayStr()
        const todayCloudUpload = Number((cloudProgress.value?.dailyUploadCount || {})[todayKey] || cloudProgress.value?.todayUploadCount || 0)
        console.info('[Cloud] 刷新门禁进度', { todayKey, todayCloudUpload })
      } catch (e) {
        console.warn('[Cloud] 刷新进度失败', e?.message || e)
      }
    }
    const reloadBlessings = async () => {
      if (!phone.value) return
      myBlessingsError.value = ''
      myBlessingsLoading.value = true
      try {
        const res = await shakeAPI.listBlessingsByPhone(phone.value, 1, 50)
        myBlessings.value = Array.isArray(res?.data) ? res.data : []
      } catch (e) {
        myBlessingsError.value = e?.message || '未知错误'
      } finally {
        myBlessingsLoading.value = false
      }
    }

    /** 加载/保存 **/
    const loadState = () => {
      // 禁止载入本地缓存：一切以云端为准
      // 保留示例池注入，避免后端无数据时界面为空
      if (!state.pool || state.pool.length === 0) seedSamples()
    }
    const saveState = () => {
      // 禁止写入本地缓存
    }

    /**
     * 云端同步发布检测
     * - 规则：本地今日发布次数>0 或 云端记录的今日发布次数>0 或 云端活动日期包含今日
     * - 目的：不同设备登录同一账号时，共享“是否已发布”门禁状态
     */
    const hasPublishedToday = () => {
      // 仅以云端为准：云端今日发布>0 或 活动日期包含今日
      const todayKey = todayStr()
      const cp = cloudProgress.value || null
      const cloudCount = Number(((cp && cp.dailyUploadCount) ? cp.dailyUploadCount[todayKey] : 0) || cp?.todayUploadCount || 0)
      const cloudActive = Array.isArray(cp?.activityDates) && cp.activityDates.includes(todayKey)
      return (cloudCount > 0) || cloudActive
    }

    /**
     * 恢复登录会话（避免刷新后需要重新验证）
     * 使用 sessionStorage 保留手机号与密码，仅在当前标签页有效，降低泄露风险。
     * 注意：后端接口目前仍需密码参数，因此此处会恢复 password 以便后续发布。
     * 安全权衡：不写入 localStorage，刷新保留，关闭浏览器清除。
     * @returns {void}
     */
    const restoreAuthSession = () => {
      try {
        const raw = sessionStorage.getItem(AUTH_KEY)
        if (!raw) return
        const auth = JSON.parse(raw)
        if (auth && auth.phone) phone.value = String(auth.phone)
        if (auth && auth.password) password.value = String(auth.password)
        // 有记录则视为已验证，通过前端门禁；如需更强安全可在此触发一次静默校验
        verified.value = true
        showPwdModal.value = false
        console.log('[Auth] 会话恢复成功', { phone: phone.value })
      } catch (e) {
        console.warn('恢复会话失败', e)
      }
    }

    /**
     * 保存登录会话到 sessionStorage
     * 在密码验证/设置成功后调用，用于后续刷新继续免登体验
     * @returns {void}
     */
    const saveAuthSession = () => {
      try {
        const payload = { phone: phone.value, password: password.value, verifiedAt: Date.now() }
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(payload))
        console.log('[Auth] 会话已保存', payload)
      } catch (e) {
        console.warn('保存会话失败', e)
      }
    }

    /**
     * 图片上传（用户自选）
     * - 选择图片后上传到后端，返回可访问URL用于发布。
     */
    const onImageFileChange = async (e) => {
      try {
        const file = e.target?.files?.[0]
        if (!file) return
        if (!file.type || !file.type.startsWith('image/')) { alert('请选择图片文件'); return }
        if (file.size > 5 * 1024 * 1024) { alert('图片大小不能超过5MB'); return }
        imageUploading.value = true
        const res = await shakeAPI.uploadImage(file)
        const url = res?.data?.absolute || res?.data?.url
        if (!url) { throw new Error('上传失败，未返回图片URL') }
        form.image = url
        console.log('[Upload] 图片已上传，URL=', url)
      } catch (err) {
        console.warn('图片上传失败:', err?.message || err)
        alert('图片上传失败，请重试')
      } finally {
        imageUploading.value = false
        // 清空input值，允许重复选择同一文件
        try { e.target.value = '' } catch (_) {}
      }
    }
    const clearImage = () => { form.image = null }

    /** 示例祝福池（用于匹配） */
    const seedSamples = () => {
      // 为示例池添加 approved 标记，确保本地回退仅展示“已批准”内容
      const samples = [
        { id: sid(), tag: '急救故事', text: '希望你早日康复，守护每一次心跳。', image: null, date: Date.now(), approved: true },
        { id: sid(), tag: '献血日记', text: '一袋热血，一份希望，感谢每位献血者。', image: null, date: Date.now(), approved: true },
        { id: sid(), tag: '灾区祝福', text: '江河无恙，愿灾区人民早日重建家园。', image: null, date: Date.now(), approved: true },
        { id: sid(), tag: '献血日记', text: '月光如水，爱让世界更温暖。', image: null, date: Date.now(), approved: true },
        { id: sid(), tag: '急救故事', text: '致敬医护，愿每一次急救都顺利。', image: null, date: Date.now(), approved: true }
      ]
      state.pool = samples
      saveState()
    }

    /** 工具函数 **/
    // 生成本地时区日期键（YYYY-MM-DD），避免 UTC 切日导致的早晨归入前一天
    const dateKeyLocal = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    const todayStr = () => dateKeyLocal(new Date())
    const sid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const formatDate = (ts) => new Date(ts).toLocaleDateString()

    /**
     * 初始化WebAudio并播放短提示音（无需静态资源）
     * - 设计：摇动时播放50ms短促提示，增强反馈（可能受浏览器自动播放限制，需用户首个点击）
     * - 兼容：仅在用户交互（点击）后创建AudioContext，避免被阻止
     */
    const initAudio = () => {
      try {
        if (!audioCtx) {
          const AC = window.AudioContext || window.webkitAudioContext
          if (AC) {
            audioCtx = new AC()
            console.log('[Audio] AudioContext 初始化完成')
          }
        }
      } catch (e) { console.warn('AudioContext 初始化失败', e) }
    }
    const playShakeSound = () => {
      try {
        if (!audioCtx) return
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880 // 高一点的提示音
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.09)
      } catch (e) { /* 音频失败不影响主流程 */ }
    }

    // 旧的权限与绑定逻辑移除，统一由 useShake 控制

    /** 密码与身份校验（摇一摇专用，不影响问卷） */
     const store = useSurveyStore()
     const phone = ref(store.userPhone || '')
     const password = ref('') // 登录或改密时的旧密码
     const newPassword = ref('') // 注册或改密时的新密码
     const showPwdModal = ref(true)
     const verified = ref(false)
     const authMode = ref('login') // login | register | change
     const showMore = ref(false)
     const toggleMore = () => { showMore.value = !showMore.value }
 
     // 将公益互动进度同步到后端（按手机号聚合）
    const persistProgress = async () => {
      // 禁止通过整块写入覆盖云端进度，改为仅依赖后端原子接口更新
    }
 
    const doVerify = async () => {
      try {
        if (!/^1[3-9]\d{9}$/.test(phone.value)) { alert('请输入有效手机号'); return }
        const res = await shakeAPI.verifyPassword(phone.value, password.value)
        if (res.success) {
          verified.value = true
          showPwdModal.value = false
          // 验证成功后保存会话，刷新后免登
          saveAuthSession()
          await refreshCloudProgress()
        }
        else { alert(res.message || '密码错误') }
      } catch (e) { alert(e.message || '验证失败') }
    }
    const doRegister = async () => {
      try {
        if (!/^1[3-9]\d{9}$/.test(phone.value)) { alert('请输入有效手机号'); return }
        if (!newPassword.value || newPassword.value.length < 4) { alert('密码至少4位'); return }
        const res = await shakeAPI.setPassword(phone.value, newPassword.value, null)
        if (res.success) {
          // 注册成功即视为已验证并进入
          password.value = newPassword.value
          verified.value = true
          showPwdModal.value = false
          saveAuthSession()
          await refreshCloudProgress()
          newPassword.value = ''
        } else { alert(res.message || '注册失败') }
      } catch (e) { alert(e.message || '注册失败') }
    }

     const doChangePassword = async () => {
       try {
         if (!/^1[3-9]\d{9}$/.test(phone.value)) { alert('请输入有效手机号'); return }
         if (!password.value || password.value.length < 4) { alert('请输入当前密码（至少4位）'); return }
         if (!newPassword.value || newPassword.value.length < 4) { alert('新密码至少4位'); return }
         const res = await shakeAPI.setPassword(phone.value, newPassword.value, password.value)
         if (res.success) {
           password.value = newPassword.value
           verified.value = true
          showPwdModal.value = false
          saveAuthSession()
          // 更改密码不触发本地进度写回，避免覆盖云端
          await refreshCloudProgress()
          newPassword.value = ''
          alert('密码已更改')
        } else { alert(res.message || '更改失败') }
      } catch (e) { alert(e.message || '更改失败') }
    }
 
    /**
     * 提交祝福（增加密码校验与后端同步）
     * 发布后关闭装瓶弹窗，并允许当天使用摇一摇
     */
    const canSubmit = computed(() => form.text.trim().length > 0)
    const submitBlessing = async () => {
      if (!verified.value) { showPwdModal.value = true; return }
      const date = todayStr()
      // 本地上传计数不再影响云端，云端更新由后端负责
      const payload = { id: sid(), tag: form.tag, text: form.text.trim(), image: form.image, audioUrl: form.audioUrl, date: Date.now(), approved: false }
      state.uploads.unshift(payload)
       try {
         await shakeAPI.createBlessing({
           phone: phone.value,
           password: password.value,
           title: form.text.slice(0, 20) || '我的祝福',
           tag: form.tag,
           content: form.text.trim(),
           image_url: form.image || null,
           audio_url: form.audioUrl || null
         })
       } catch (e) { console.warn('后端祝福同步失败', e) }
       form.text = ''
       form.audioUrl = null
       showPublishModal.value = false
       console.log('[Publish] 发布完成，云端进度将由后端原子更新')
       // 说明：需管理员审核通过后才会被摇一摇匹配到
       alert('发布成功！内容已提交审核，通过后将进入公益祝福池供摇一摇发现')
       // 刷新云端进度以便门禁与展示
       await refreshCloudProgress()
    }
 
     /** 语音录制 **/
    const toggleRecord = async () => {
      if (recording.value) {
        try { mediaRecorder?.stop() } catch (e) {}
        recording.value = false
        return
      }
      // 请求权限并开始录音
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder = new MediaRecorder(stream)
        chunks = []
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          form.audioUrl = URL.createObjectURL(blob)
          console.log('[Record] 完成，大小', blob.size)
        }
        mediaRecorder.start()
        recording.value = true
      } catch (e) {
        console.warn('无法录音，已降级为仅文本', e)
        alert('设备不支持或未授权麦克风，无法录音')
      }
    }

    /** 发布状态校验：当天是否已装瓶（至少发布一次） - 支持云端同步 */
    const canShakeToday = computed(() => hasPublishedToday())

    /** 摇一摇匹配（手动点击卡片） */
    const manualShake = async () => {
      initAudio()
      await shake.ensureAccess()
      if (!verified.value) { showPwdModal.value = true; return }
      if (!canShakeToday.value) { openedByGate.value = true; showPublishModal.value = true; return }
      await handleMatch(); showMatchModal.value = true
    }
    const handleMatch = async () => {
      // 优先使用后端数据库数据进行展示；若后端暂无数据则回退本地示例池
      try {
        isShaking.value = true
        setTimeout(() => { isShaking.value = false }, 700)
        playShakeSound()
        const res = await shakeAPI.randomBlessing()
        const pick = res && res.data ? res.data : null
        if (pick) {
          const mapped = {
            id: pick.id,
            tag: pick.tag || '公益祝福',
            text: pick.content || '',
            image: (() => { const u = resolveFileUrl(pick.image_url || ''); return u || null })(),
            audioUrl: (() => { const u = resolveFileUrl(pick.audio_url || ''); return u || null })(),
            date: pick.created_at ? new Date(pick.created_at).getTime() : Date.now()
          }
          currentMatch.value = mapped
          if (typeof pick.likes === 'number') state.likes[mapped.id] = pick.likes
          if (typeof pick.medals === 'number') state.medals[mapped.id] = pick.medals
        } else {
          if (!state.pool || state.pool.length === 0) seedSamples()
          // 本地回退：仅展示示例池中标记 approved 的内容，避免未审核内容被发现
          const approvedLocal = (state.pool || []).filter(item => item.approved === true)
          if (!approvedLocal.length) seedSamples()
          const pool = (approvedLocal.length ? approvedLocal : state.pool)
          const idx = Math.floor(Math.random() * pool.length)
          currentMatch.value = pool[idx]
          console.warn('[Shake] 后端暂无数据，已回退本地示例')
        }
      } catch (e) {
        console.warn('[Shake] 获取后端随机祝福失败，回退示例池:', e?.message || e)
        if (!state.pool || state.pool.length === 0) seedSamples()
        const approvedLocal = (state.pool || []).filter(item => item.approved === true)
        const pool = (approvedLocal.length ? approvedLocal : state.pool)
        const idx = Math.floor(Math.random() * pool.length)
        currentMatch.value = pool[idx]
      } finally {
        const date = todayStr()
        try {
          if (verified.value && phone.value) {
            const inc = await shakeAPI.incrementShake(phone.value)
            const serverCount = Number(inc?.data?.todayShakeCount || 0)
            // 同步本地为云端值（仅用于临时展示，不写入本地缓存）
            state.dailyShakeCount[date] = serverCount
            console.info('[Shake] 今日摇一摇计数 +1(云端)', { date, after: serverCount })
            await refreshCloudProgress()
          } else {
            // 未验证不再进行本地计数或云端写入
            console.warn('[Shake] 未验证用户，跳过计数')
          }
        } catch (e) {
          // 云端为准：失败不进行本地回退与写回
          console.warn('[Shake] 云端递增失败，保持云端为准', e?.message || e)
        }
      }
    }

    // 旧事件处理逻辑移除，由 useShake 模块统一管理

    

    /** 互动：点赞与勋章 **/
    const hasLiked = (id) => !!state.likedIds[id]
    const getLikes = (id) => state.likes[id] || 0
    const getMedals = (id) => state.medals[id] || 0
    const likeCurrent = async () => {
      if (!currentMatch.value) return
      const id = currentMatch.value.id
      if (hasLiked(id)) return
      state.likes[id] = (state.likes[id] || 0) + 1
      state.likedIds[id] = 1
      markActiveToday(); saveState(); await persistProgress()
      // 若匹配内容来自后端，有数字ID则同步点赞
      try { if (Number.isInteger(id)) await shakeAPI.like(id) } catch (e) {}
    }
    const medalCurrent = async () => {
      if (!currentMatch.value) return
      const id = currentMatch.value.id
      state.medals[id] = (state.medals[id] || 0) + 1
      markActiveToday(); saveState(); await persistProgress()
      try { if (Number.isInteger(id)) await shakeAPI.medal(id) } catch (e) {}
      alert('已赠予爱心勋章！')
    }

    /** 连续天数与徽章 **/
    const markActiveToday = () => {
      const d = todayStr()
      if (!state.activityDates.includes(d)) state.activityDates.push(d)
      checkBadge()
    }
    const streakDays = computed(() => {
      // 仅以云端为准
      if (cloudProgress.value && Number.isFinite(cloudProgress.value.streakDays)) {
        return Number(cloudProgress.value.streakDays)
      }
      return 0
    })
    const badgeUnlocked = computed(() => {
      if (cloudProgress.value && typeof cloudProgress.value.badgeUnlocked === 'boolean') {
        return !!cloudProgress.value.badgeUnlocked
      }
      return false
    })
    const checkBadge = () => { if (streakDays.value >= 7) state.badgeUnlocked = true }

    // 统一解析匹配内容的图片/音频URL，确保端口与域名正确
    const matchImageSrc = computed(() => {
      const raw = currentMatch.value?.image || ''
      const resolved = resolveFileUrl(raw)
      if (resolved && resolved !== raw) console.debug('[ResolveURL] image', { raw, resolved })
      return resolved || ''
    })
    const matchAudioSrc = computed(() => {
      const raw = currentMatch.value?.audioUrl || ''
      const resolved = resolveFileUrl(raw)
      if (resolved && resolved !== raw) console.debug('[ResolveURL] audio', { raw, resolved })
      return resolved || ''
    })

    // 生命周期
    onMounted(() => {
      // 刷新后先恢复登录会话，再加载互动状态
      restoreAuthSession()
      loadState() // 不再读取localStorage，仅注入示例池
      // 挂载后根据当前会话拉取云端进度，用于门禁同步
      try { if (phone.value) refreshCloudProgress() } catch (_) {}
      // 环境无需权限（安卓等）可直接开始；iOS 需在用户交互时 ensureAccess
      try { shake.start() } catch (e) {}
    })
    onUnmounted(() => {
      try { shake.stop() } catch (e) {}
    })

    return {
      TAGS,
      form,
      imageUploading,
      onImageFileChange,
      clearImage,
      recording,
      toggleRecord,
      canSubmit,
      submitBlessing,
      // 摇一摇
      isShaking,
      manualShake,
      currentMatch,
      showPublishModal,
      showMatchModal,
      openPublishModal: () => { if (!verified.value) { showPwdModal.value = true; return } openedByGate.value = false; showPublishModal.value = true },
      // 移除“开启传感器”与自检相关导出，仅保留核心交互
      shake,
      matchImageSrc,
      matchAudioSrc,
      // 点赞/勋章改为包裹版本
      likeCurrent,
      medalCurrent,
      hasLiked,
      getLikes,
      getMedals,
      // 进度与徽章
      streakDays,
      badgeUnlocked,
      todayShakeCount,
      formatDate,
      // 身份弹窗相关
      phone,
      password,
      newPassword,
      showPwdModal,
      authMode,
      showMore,
      toggleMore,
      doVerify,
      doRegister,
      doChangePassword
      ,
      // 菜单
      showMenu,
      menuTab,
      toggleMenu,
      myBlessings,
      myBlessingsLoading,
      myBlessingsError,
      cloudProgress,
      statusLabel,
      // 解析资源URL
      resolveFileUrl,
      reloadBlessings,
      // 门禁提示标记
      openedByGate
    }
  }
}
</script>

<style scoped>
.shake-container { max-width: 920px; margin: 0 auto; padding: 24px 16px; }
.shake-title { display:flex; align-items:center; gap:8px; }
.bottle-btn { padding:4px 8px; border:none; border-radius:8px; background:#fff3cd; color:#856404; cursor:pointer; font-size:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.bottle-btn:hover { filter: brightness(0.98); }
.hamburger-btn { margin-left:auto; padding:6px 10px; border:none; border-radius:8px; background:#f1f3f5; color:#333; cursor:pointer; }
.hamburger-btn:hover{ filter:brightness(0.98) }

.upload-section, .shake-section, .streak-section { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 6px 16px rgba(0,0,0,0.06); margin-bottom: 16px; }
.upload-section h2, .shake-section h2, .streak-section h2 { font-size: 20px; margin-bottom: 12px; }

.form-row { margin-bottom: 12px; }
.label { display:block; font-weight:600; margin-bottom:6px; }
.input { width:100%; min-height:80px; padding:10px; border:1px solid #e9ecef; border-radius:8px; }

.tags { display:flex; gap:8px; flex-wrap:wrap; }
.tag { padding:8px 12px; border:1px solid #e9ecef; border-radius:20px; background:#f8f9fa; cursor:pointer; }
.tag.active { background:#4a90e2; color:#fff; border-color:#357abd; }

.images { display:flex; gap:8px; flex-wrap:wrap; }
.image-btn { padding:0; border:none; background:transparent; cursor:pointer; border-radius:8px; overflow:hidden; }
.image-btn img { width:96px; height:64px; object-fit:cover; display:block; }
.image-btn.selected { outline:3px solid #4a90e2; }

.uploaded-preview { display:flex; align-items:center; gap:12px; margin-top:8px; }
.uploaded-preview img { width:120px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #e9ecef; }
.clear-btn { padding:6px 10px; border:none; border-radius:8px; background:#e9ecef; color:#333; cursor:pointer; }

.audio-row { display:flex; align-items:center; gap:12px; }
.record-btn { padding:8px 12px; border:none; border-radius:8px; background:#4a90e2; color:#fff; cursor:pointer; }
.record-btn.recording { background:#dc3545; }
.rec-tip { color:#dc3545; }
.audio { width:100%; }
.hint { font-size:12px; color:#6c757d; }

.form-actions { display:flex; align-items:center; gap:12px; }
.submit { padding:10px 16px; border:none; border-radius:8px; background:#357abd; color:#fff; cursor:pointer; }
.submit:disabled { background:#adb5bd; cursor:not-allowed; }
.limit { color:#6c757d; font-size:12px; }
.uploading { color:#856404; font-size:12px; margin-top:4px; }

/* 摇一摇样式 */
.shake-section { position: fixed; inset: 0; display: flex; flex-direction: column; padding: 16px; background: #f8fbff; border-radius: 0; box-shadow: none; margin-bottom: 0; }
.shake-panel { flex: 1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; background:#f8fbff; border:none; border-radius:12px; padding:16px; cursor:pointer; }

/* 瓶子容器 - 使用图片 */
.bottle-container {
  position: relative;
  width: clamp(200px, 25vw, 300px);
  height: clamp(300px, 35vw, 450px);
  animation: bottle-sway 6s ease-in-out infinite;
}

.bottle-container.shake {
  animation: shake-strong .7s linear;
}

.bottle-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.1));
}

/* 爱心动画层 */
.hearts-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.heart {
  position: absolute;
  width: clamp(72px, 12vw, 108px); /* 再次放大图片宽度（两倍） */
  height: clamp(72px, 12vw, 108px); /* 再次放大图片高度（两倍） */
  animation: bob 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(255,107,157,0.3)); /* 添加阴影效果 */
  object-fit: contain; /* 保持图片比例 */
}

/* 爱心位置分布 - 模拟瓶中填充效果，整体向左上角移动 */
.heart.h1 { top: 15%; left: 20%; animation-delay: 0s; }
.heart.h2 { top: 25%; left: 50%; animation-delay: 0.3s; }
.heart.h3 { top: 35%; left: 15%; animation-delay: 0.6s; }
.heart.h4 { top: 45%; left: 60%; animation-delay: 0.9s; }
.heart.h5 { top: 55%; left: 30%; animation-delay: 1.2s; }
.heart.h6 { top: 20%; left: 35%; animation-delay: 1.5s; }
.heart.h7 { top: 30%; left: 40%; animation-delay: 1.8s; }
.heart.h8 { top: 40%; left: 25%; animation-delay: 2.1s; }
.heart.h9 { top: 50%; left: 45%; animation-delay: 2.4s; }
.heart.h10 { top: 60%; left: 20%; animation-delay: 2.7s; }
.heart.h11 { top: 65%; left: 55%; animation-delay: 3.0s; }
.heart.h12 { top: 70%; left: 35%; animation-delay: 0.5s; }

/* 动画关键帧 */
@keyframes bottle-sway {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  75% { transform: rotate(2deg); }
}

@keyframes bob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

@keyframes shake-strong {
  0% { transform: rotate(0deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(8deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(6deg); }
  100% { transform: rotate(0deg); }
}

.match-card { margin-top:12px; border:1px solid #e9ecef; border-radius:12px; padding:12px; }
.match-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.tag-pill { background:#e8f4fd; color:#357abd; padding:4px 8px; border-radius:999px; font-size:12px; }
.date { color:#6c757d; font-size:12px; }
.match-text { font-size:16px; color:#2c3e50; margin-bottom:8px; }
.match-img { width:100%; max-height:240px; object-fit:contain; background:#f5f9ff; border-radius:8px; }
.match-actions { display:flex; gap:8px; }
.like, .medal { padding:8px 12px; border:none; border-radius:8px; cursor:pointer; }
.like { background:#e8f4fd; color:#357abd; }
.medal { background:#fff3cd; color:#856404; }

/* 徽章区域 */
.badges { margin-top:8px; }
.badge { display:flex; gap:10px; align-items:center; border:1px dashed #e9ecef; border-radius:12px; padding:10px; background:#fafafa; opacity:0.6; }
.badge.unlocked { border-color:#ffd966; background:#fff9e6; opacity:1; }
.badge .icon { font-size:24px; }
.badge .title { font-weight:700; }
.streak-tip { color:#6c757d; font-size:12px; }

@media (max-width: 768px) {
  .shake-container { padding: 16px 12px; }
}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:999}
.modal{width:92%;max-width:420px;background:#fff;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,0.12);padding:16px}
.auth-modal{position:relative}
.modal h3{margin:0 0 8px;font-size:18px;color:#2c3e50}
.modal .row{margin:8px 0}
.modal input{width:100%;padding:8px;border:1px solid #e9ecef;border-radius:8px}
.modal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
.modal .actions button{padding:8px 12px;border:none;border-radius:8px;background:#357abd;color:#fff;cursor:pointer}
.modal .tip{display:none}
.gate-tip{margin:8px 0;padding:8px;border:1px solid #ffeeba;background:#fff3cd;color:#856404;border-radius:8px;font-size:14px}
/* 瓶子下方提示文案 */
.shake-hint{margin-top:8px;color:#6c757d;font-size:13px;text-align:center}
/* 移除按钮点击时的蓝色聚焦边框 */
.shake-container button { -webkit-tap-highlight-color: transparent; }
.shake-container button:focus,
.shake-container button:focus-visible,
.shake-container button:active { outline: none; box-shadow: none; }
.more-btn{position:absolute;right:12px;top:12px;border:none;background:#f1f3f5;color:#333;border-radius:8px;padding:6px 10px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.06)}
.more-btn:hover{filter:brightness(0.98)}
.more-menu{position:absolute;right:12px;top:48px;background:#fff;border:1px solid #e9ecef;border-radius:10px;box-shadow:0 6px 16px rgba(0,0,0,0.1);padding:8px;display:flex;flex-direction:column;gap:6px}
.link-btn{padding:6px 10px;border:none;border-radius:8px;background:#f8f9fa;color:#333;cursor:pointer;text-align:left}
.link-btn:hover{background:#eef2f7}

/* 右侧抽屉样式 */
.drawer-backdrop{position:fixed;inset:0;display:flex;justify-content:flex-end;background:rgba(0,0,0,.25);z-index:998}
.drawer{width:min(92%,360px);height:100%;background:#fff;border-left:1px solid #e9ecef;box-shadow:-6px 0 16px rgba(0,0,0,0.08);padding:12px;display:flex;flex-direction:column}
.drawer-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.close-btn{border:none;background:#f1f3f5;border-radius:8px;padding:6px 10px;cursor:pointer}
.drawer-tabs{display:flex;gap:8px;margin-bottom:8px}
.tab-btn{padding:6px 10px;border:1px solid #e9ecef;border-radius:8px;background:#f8f9fa;cursor:pointer}
.tab-btn.active{background:#4a90e2;color:#fff;border-color:#357abd}
.drawer-body{flex:1;overflow:auto}
.stat-row{display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #e9ecef;padding:8px 0}
.loading{color:#6c757d}
.error{padding:12px;color:#c92a2a;background:#fff5f5;border:1px solid #ffc9c9;border-radius:8px}
.retry-btn{margin-left:8px;padding:4px 8px;border:none;border-radius:6px;background:#f1f3f5;color:#333;cursor:pointer}
.retry-btn:hover{filter:brightness(0.98)}
.empty{color:#6c757d}
.blessing-list{display:flex;flex-direction:column;gap:8px}
.blessing-item{border:1px solid #e9ecef;border-radius:10px;padding:8px}
.blessing-item .row1{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.blessing-item .content{color:#2c3e50;margin-bottom:6px}
.blessing-item img{width:100%;max-height:160px;object-fit:cover;border-radius:8px;background:#f8f9fa}
.status{font-size:12px;color:#6c757d}
.status.approved{color:#2f9e44}
.status.pending{color:#f08c00}
.status.rejected{color:#c92a2a}

</style>