<template>
  <div class="shake-container">
    <!-- 头部介绍移除：页面仅保留摇一摇模块与装瓶入口 -->

    <!-- 密码弹窗 -->
    <div v-if="showPwdModal" class="modal-backdrop">
      <div class="modal">
        <h3>进入摇一摇需设置/验证密码</h3>
        <div class="row">
          <label>手机号</label>
          <input v-model="phone" placeholder="请输入11位手机号" />
        </div>
        <div class="row">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="至少4位" />
        </div>
        <div class="row">
          <label>新密码</label>
          <input v-model="newPassword" type="password" placeholder="至少4位 新密码（如已设置过密码需填写）" />
        </div>
        <div class="actions">
          <button @click="doVerify">验证密码</button>
          <button @click="doSet">设置密码</button>
        </div>
        <p class="tip">说明：问卷无需密码；公益摇一摇需要密码以保障互动安全。若已设置过密码，修改时需输入原密码与新密码。</p>
      </div>
    </div>

    <!-- 发布祝福弹窗：复用改造前的发布模块（装瓶） -->
    <div v-if="showPublishModal" class="modal-backdrop">
      <div class="modal">
        <h3>发布我的祝福（装瓶）</h3>
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
      <h2 class="shake-title">爱心摇一摇
        <button class="bottle-btn" @click="openPublishModal" title="装瓶">🍾</button>
      </h2>
      <div class="shake-panel" @click="manualShake" :aria-label="'点击或摇动手机触发匹配'">
        <div class="phone" :class="{ shake: isShaking }">
          <div class="screen">摇一摇</div>
        </div>
        <p class="shake-tip">移动端摇动手机触发匹配；桌面端点击卡片模拟</p>
      </div>
      
    </section>
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
        const today = todayStr()
        const hasUpload = (state.dailyUploadCount[today] || 0) > 0
        if (!hasUpload) { showPublishModal.value = true; return }
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

    /** 加载/保存 **/
    const loadState = () => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) Object.assign(state, JSON.parse(raw))
        console.log('[Shake] 加载状态', state)
      } catch (e) { console.warn('加载失败', e) }
      // 卫生处理：移除本地池中未审核内容，确保回退只展示已批准示例
      try {
        if (Array.isArray(state.pool)) {
          const before = state.pool.length
          state.pool = state.pool.filter(item => item && item.approved === true)
          const after = state.pool.length
          if (before !== after) console.warn('[Shake] 已清理未审核本地内容', { before, after })
        }
      } catch (_) {}
      // 若池为空，注入示例数据
      if (!state.pool || state.pool.length === 0) seedSamples()
    }
    const saveState = () => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (e) {}
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
    const todayStr = () => new Date().toISOString().slice(0, 10)
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
     const password = ref('') // 旧密码（用于验证/修改）
     const newPassword = ref('') // 新密码（用于修改）
     const showPwdModal = ref(true)
     const verified = ref(false)
 
     // 将公益互动进度同步到后端（按手机号聚合）
     const persistProgress = async () => {
       try {
         const progress = {
           activityDates: state.activityDates,
           likes: state.likes,
           medals: state.medals,
           streakDays: streakDays.value,
           badgeUnlocked: badgeUnlocked.value
         }
         if (phone.value) await shakeAPI.setProgress(phone.value, progress)
       } catch (e) {
         console.warn('同步公益进度失败', e)
       }
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
           await persistProgress()
         }
         else { alert(res.message || '密码错误') }
       } catch (e) { alert(e.message || '验证失败') }
     }
 
     const doSet = async () => {
       try {
         if (!/^1[3-9]\d{9}$/.test(phone.value)) { alert('请输入有效手机号'); return }
         if (!newPassword.value || newPassword.value.length < 4) { alert('新密码至少4位'); return }
       // 设置新密码；若已存在旧密码，后端将要求并校验 oldPassword（password）
       const res = await shakeAPI.setPassword(phone.value, newPassword.value, password.value)
        if (res.success) {
          verified.value = true
          showPwdModal.value = false
          // 设置成功后立即保存会话，刷新后免登
          // 会话密码更新为新密码
          password.value = newPassword.value
          saveAuthSession()
          await persistProgress()
          newPassword.value = ''
        }
        else { alert(res.message || '设置失败') }
      } catch (e) { alert(e.message || '设置失败') }
    }
 
    /**
     * 提交祝福（增加密码校验与后端同步）
     * 发布后关闭装瓶弹窗，并允许当天使用摇一摇
     */
    const canSubmit = computed(() => form.text.trim().length > 0)
    const submitBlessing = async () => {
      if (!verified.value) { showPwdModal.value = true; return }
      const date = todayStr()
      const count = state.dailyUploadCount[date] || 0
      // 取消发布次数限制：仅记录次数用于“今日已装瓶”判断
      // 不再将未审核内容加入本地回退池，避免摇一摇发现未审核内容
      const payload = { id: sid(), tag: form.tag, text: form.text.trim(), image: form.image, audioUrl: form.audioUrl, date: Date.now(), approved: false }
       state.uploads.unshift(payload)
       state.dailyUploadCount[date] = count + 1
       markActiveToday()
       saveState()
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
       console.log('[Publish] 发布完成，今日允许摇一摇')
       // 说明：需管理员审核通过后才会被摇一摇匹配到
       alert('发布成功！内容已提交审核，通过后将进入公益祝福池供摇一摇发现')
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

    /** 发布状态校验：当天是否已装瓶（至少发布一次） */
    const canShakeToday = computed(() => (state.dailyUploadCount[todayStr()] || 0) > 0)

    /** 摇一摇匹配（手动点击卡片） */
    const manualShake = async () => {
      initAudio()
      await shake.ensureAccess()
      if (!verified.value) { showPwdModal.value = true; return }
      if (!canShakeToday.value) { showPublishModal.value = true; return }
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
        state.dailyShakeCount[date] = (state.dailyShakeCount[date] || 0) + 1
        markActiveToday()
        saveState()
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
      // 计算截至今天的连续天数
      const dates = [...state.activityDates].sort()
      if (dates.length === 0) return 0
      const today = new Date(todayStr())
      let streak = 0
      for (let i = 0; i < 14; i++) { // 最多回溯两周
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        if (dates.includes(key)) streak++
        else break
      }
      return streak
    })
    const badgeUnlocked = computed(() => state.badgeUnlocked || streakDays.value >= 7)
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
      loadState()
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
      openPublishModal: () => { if (!verified.value) { showPwdModal.value = true; return } showPublishModal.value = true },
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
      formatDate,
      // 密码弹窗相关
      phone,
      password,
      showPwdModal,
      doVerify,
      doSet
      ,newPassword
    }
  }
}
</script>

<style scoped>
.shake-container { max-width: 920px; margin: 0 auto; padding: 24px 16px; }
.shake-title { display:flex; align-items:center; gap:8px; }
.bottle-btn { padding:4px 8px; border:none; border-radius:8px; background:#fff3cd; color:#856404; cursor:pointer; font-size:16px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.bottle-btn:hover { filter: brightness(0.98); }

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
.shake-panel { display:flex; align-items:center; justify-content:center; gap:12px; background:#f8fbff; border:1px dashed #cfe0fb; border-radius:12px; padding:16px; cursor:pointer; }
.phone { width:140px; height:240px; border:12px solid #333; border-radius:24px; background:#111; display:flex; align-items:center; justify-content:center; }
.phone .screen { width:100%; height:100%; background:#0f2b57; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; letter-spacing:4px; }
.phone.shake { animation: shake 0.7s linear; }
@keyframes shake { 0%{transform:rotate(0)} 20%{transform:rotate(-8deg)} 40%{transform:rotate(8deg)} 60%{transform:rotate(-6deg)} 80%{transform:rotate(6deg)} 100%{transform:rotate(0)} }
.shake-tip { color:#6c757d; font-size:12px; }

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
.modal h3{margin:0 0 8px;font-size:18px;color:#2c3e50}
.modal .row{margin:8px 0}
.modal input{width:100%;padding:8px;border:1px solid #e9ecef;border-radius:8px}
.modal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
.modal .actions button{padding:8px 12px;border:none;border-radius:8px;background:#357abd;color:#fff;cursor:pointer}
.modal .tip{font-size:12px;color:#6c757d;margin-top:8px}
</style>