/**
 * 摇一摇相关API路由
 * - 密码设置与验证（沿用手机号作为用户标识）
 * - 祝福内容发布/随机获取/点赞/赠章
 * - 公益进度读写
 *
 * 兼容说明：当环境变量 DISABLE_DB=true 时，使用内存存储，避免数据库不可用导致接口失败。
 */
const express = require('express')
// 优先使用原生bcrypt，若不可用则回退到纯JS实现bcryptjs，提高跨平台可用性（云主机缺编译工具时）
let bcrypt
try {
  bcrypt = require('bcrypt')
  console.log('🔐 使用原生 bcrypt 模块')
} catch (e) {
  console.warn('⚠️ 未找到或无法加载 bcrypt，回退到 bcryptjs:', e.message)
  bcrypt = require('bcryptjs')
}
const router = express.Router()
// 引入Winston日志，集中记录审核与内容操作
const logger = require('../utils/logger')
const SurveyResult = require('../models/SurveyResult')
const Blessing = require('../models/Blessing')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

// 是否启用内存模式（无数据库）
const USE_MEMORY = String(process.env.DISABLE_DB || 'false').toLowerCase() === 'true'

// 内存存储容器（仅在 USE_MEMORY=true 时使用）
const memoryPasswords = new Map() // phone -> bcrypt hash
const memoryProgress = new Map()  // phone -> progress JSON
const memoryBlessings = []        // { id, phone, title, tag, content, image_url, audio_url, review_status, likes, medals, created_at, updated_at }
let blessingIdCounter = 1

/**
 * 图片上传（主题照片）
 * - 接收 multipart/form-data，字段名为 file
 * - 仅允许 image/* 类型，限制大小（默认5MB）
 * - 返回可访问的绝对URL与相对路径URL
 */
const uploadBase = path.join(__dirname, '..', 'uploads', 'blessings')
fs.mkdirSync(uploadBase, { recursive: true })
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadBase),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    const name = `${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`
    cb(null, name)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片文件'))
    }
    cb(null, true)
  }
})

// 统一构造绝对地址（优先环境变量），避免代理/端口不一致导致资源不可访问
function getBaseUrl(req) {
  try {
    const envBase = process.env.PUBLIC_BASE || (String(process.env.NODE_ENV).toLowerCase() === 'production' ? (process.env.VITE_API_BASE_URL || '') : '')
    if (envBase) return envBase
    const host = req.get('host') || 'localhost:3001'
    const protocol = req.protocol || 'http'
    return `${protocol}://${host}`
  } catch (_) {
    return 'http://localhost:3001'
  }
}

router.post('/upload/image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '未接收到文件' })
    const rel = `/uploads/blessings/${req.file.filename}`
    const base = getBaseUrl(req)
    const abs = new URL(rel, base).toString()
    logger.info('[Upload] 图片上传成功', { base, abs, file: req.file.filename })
    return res.json({ success: true, data: { url: rel, absolute: abs } })
  } catch (e) {
    logger.error('图片上传失败', { error: e.message })
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 校验手机号格式
function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 设置或更新密码
 * 需求：若已存在密码，则必须提供原密码进行验证后才能更新
 * 请求体：{ phone, password, oldPassword }
 * - password 为新密码
 * - oldPassword 为原密码（仅在已存在密码时必填）
 */
router.post('/password/set', async (req, res) => {
  try {
    const { phone, password, oldPassword } = req.body || {}
    if (!phone || !validPhone(phone)) return res.status(400).json({ success:false, message:'手机号码格式不正确' })
    if (!password || String(password).length < 4) return res.status(400).json({ success:false, message:'新密码长度至少4位' })

    // 查询是否已存在密码
    let existingHash = null
    if (USE_MEMORY) {
      existingHash = memoryPasswords.get(phone) || null
    } else {
      existingHash = await SurveyResult.getPasswordHashByPhone(phone)
    }

    // 若存在密码，则校验原密码
    if (existingHash) {
      const provided = String(oldPassword || '')
      if (!provided) return res.status(400).json({ success:false, message:'已设置密码，请输入原密码进行验证' })
      const ok = await bcrypt.compare(provided, existingHash)
      if (!ok) return res.status(403).json({ success:false, message:'原密码错误' })
    }

    // 计算新密码哈希并写入
    const newHash = await bcrypt.hash(String(password), 10)

    if (USE_MEMORY) {
      memoryPasswords.set(phone, newHash)
      logger.info('密码设置/更新成功(内存)', { phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
      return res.json({ success:true, message:'密码设置成功(内存)', data: { mode: 'memory' } })
    }

    const result = await SurveyResult.updatePasswordByPhone(phone, newHash)
    logger.info('密码设置/更新成功(DB)', { phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
    return res.json({ success:true, message: existingHash ? '密码更新成功' : '密码设置成功', data: result })
  } catch (e) {
    logger.error('设置密码失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 验证密码 */
router.post('/password/verify', async (req, res) => {
  try {
    const { phone, password } = req.body
    if (!phone || !validPhone(phone)) return res.status(400).json({ success:false, message:'手机号码格式不正确' })

    let hash = null
    if (USE_MEMORY) {
      hash = memoryPasswords.get(phone) || null
    } else {
      hash = await SurveyResult.getPasswordHashByPhone(phone)
    }

    if (!hash) return res.status(404).json({ success:false, message:'未设置密码，请先设置' })
    const ok = await bcrypt.compare(String(password || ''), hash)
    return res.json({ success: ok, message: ok ? '验证通过' : '密码错误', data: { mode: USE_MEMORY ? 'memory' : 'db' } })
  } catch (e) {
    logger.error('验证密码失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 发布祝福（需要先通过密码验证，前端应在进入页自动请求补录/验证） */
router.post('/blessing', async (req, res) => {
  try {
    const { phone, password, title, tag, content, image_url, audio_url } = req.body
    if (!phone || !validPhone(phone)) return res.status(400).json({ success:false, message:'手机号码格式不正确' })
    if (!content || !title) return res.status(400).json({ success:false, message:'标题与祝福语不能为空' })

    // 验证密码
    let hash = null
    if (USE_MEMORY) { hash = memoryPasswords.get(phone) || null } else { hash = await SurveyResult.getPasswordHashByPhone(phone) }
    if (!hash) return res.status(403).json({ success:false, message:'未设置密码，禁止发布' })
    const ok = await bcrypt.compare(String(password || ''), hash)
    if (!ok) return res.status(403).json({ success:false, message:'密码错误' })

    if (USE_MEMORY) {
      const now = new Date()
      const row = {
        id: blessingIdCounter++,
        phone,
        title,
        tag: tag || null,
        content,
        image_url: image_url || null,
        audio_url: audio_url || null,
        review_status: 'pending',
        likes: 0,
        medals: 0,
        created_at: now,
        updated_at: now
      }
      memoryBlessings.push(row)
      // 发布成功后：原子递增今日上传次数，并记录活动日期
      const fmtToday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      })
      const todayKey = fmtToday.format(now)
      const progress = memoryProgress.get(phone) || {}
      const duc = (progress.dailyUploadCount && typeof progress.dailyUploadCount === 'object') ? progress.dailyUploadCount : {}
      const ad = Array.isArray(progress.activityDates) ? progress.activityDates : []
      duc[todayKey] = Number(duc[todayKey] || 0) + 1
      if (!ad.includes(todayKey)) ad.push(todayKey)
      progress.dailyUploadCount = duc
      progress.activityDates = ad
      memoryProgress.set(phone, progress)
      return res.json({ success:true, message:'发布成功(内存)', data: { id: row.id, todayKey, todayUploadCount: duc[todayKey] } })
    }

    const result = await Blessing.create({ phone, title, tag, content, image_url, audio_url })
    // 发布成功后：原子递增今日上传次数（DB）
    try {
      const inc = await SurveyResult.incrementPublicUploadByPhone(phone)
      logger.info('发布后原子递增上传(DB)', {
        phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        todayKey: inc.todayKey,
        todayUploadCount: inc.todayUploadCount
      })
      return res.json({ success:true, message:'发布成功', data: { ...result, todayKey: inc.todayKey, todayUploadCount: inc.todayUploadCount } })
    } catch (e) {
      logger.warn('发布成功但上传计数递增失败(DB)', { error: e.message })
      return res.json({ success:true, message:'发布成功(上传计数未更新)', data: result })
    }
  } catch (e) {
    logger.error('发布祝福失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 随机获取祝福（可选标签过滤） */
router.get('/blessing/random', async (req, res) => {
  try {
    const { tag } = req.query

    if (USE_MEMORY) {
      let list = memoryBlessings
      if (tag) list = list.filter(b => b.tag === tag)
      // 严格：仅从已审核通过的池中随机
      const approved = list.filter(b => b.review_status === 'approved')
      const pick = approved.length ? approved[Math.floor(Math.random() * approved.length)] : null
      return res.json({ success:true, data: pick })
    }

    const data = await Blessing.findRandom(tag)
    return res.json({ success:true, data })
  } catch (e) {
    logger.error('随机获取失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 按手机号分页获取祝福列表（我的祝福） */
router.get('/blessings/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    const { page = 1, pageSize = 20 } = req.query
    if (!validPhone(phone)) return res.status(400).json({ success:false, message:'手机号码格式不正确' })

    if (USE_MEMORY) {
      const p = Math.max(1, Number(page) || 1)
      const ps = Math.max(1, Math.min(100, Number(pageSize) || 20))
      const offset = (p - 1) * ps
      const list = memoryBlessings
        .filter(b => String(b.phone) === String(phone))
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      const pageList = list.slice(offset, offset + ps)
      return res.json({ success:true, data: pageList })
    }

    const rows = await Blessing.listByPhone(phone, Number(page) || 1, Number(pageSize) || 20)
    return res.json({ success:true, data: rows })
  } catch (e) {
    logger.error('按手机号获取祝福列表失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 点赞 */
router.post('/blessing/:id/like', async (req, res) => {
  try {
    const { id } = req.params

    if (USE_MEMORY) {
      const row = memoryBlessings.find(b => b.id === Number(id))
      if (!row) return res.status(404).json({ success:false, message:'未找到祝福' })
      row.likes += 1
      row.updated_at = new Date()
      return res.json({ success:true, data: { likes: row.likes } })
    }

    const data = await Blessing.incrementLike(Number(id))
    return res.json({ success:true, data })
  } catch (e) {
    logger.error('点赞失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 赠章 */
router.post('/blessing/:id/medal', async (req, res) => {
  try {
    const { id } = req.params

    if (USE_MEMORY) {
      const row = memoryBlessings.find(b => b.id === Number(id))
      if (!row) return res.status(404).json({ success:false, message:'未找到祝福' })
      row.medals += 1
      row.updated_at = new Date()
      return res.json({ success:true, data: { medals: row.medals } })
    }

    const data = await Blessing.incrementMedal(Number(id))
    return res.json({ success:true, data })
  } catch (e) {
    logger.error('赠章失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 公益进度读写（以手机号关联） */
router.get('/progress/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    if (!validPhone(phone)) {
      logger.warn('进度查询失败：手机号格式不正确', { phoneMasked: String(phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
      return res.status(400).json({ success:false, message:'手机号码格式不正确' })
    }

    // 统一返回带有派生字段的进度对象
    const computeDerived = (progressRaw) => {
      const progress = progressRaw && typeof progressRaw === 'object' ? progressRaw : {}
      const activityDates = Array.isArray(progress.activityDates) ? progress.activityDates.slice().sort() : []
      const dailyShakeCount = progress.dailyShakeCount && typeof progress.dailyShakeCount === 'object' ? progress.dailyShakeCount : {}
      const dailyUploadCount = progress.dailyUploadCount && typeof progress.dailyUploadCount === 'object' ? progress.dailyUploadCount : {}

      // 今天的日期键（Asia/Shanghai 时区，与前端本地日期键一致）
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      })
      const todayKey = fmt.format(new Date())
      const todayShakeCount = Number(dailyShakeCount[todayKey] || 0)

      // 计算连续参与天数（从今天起向前回溯，直到断开）
      const dateSet = new Set(activityDates)
      let streak = 0
      for (let i = 0; i < 366; i++) { // 最多回溯一年，避免无限循环
        const key = fmt.format(new Date(Date.now() - i * 86400000))
        if (dateSet.has(key)) streak++
        else break
      }

      const streakDays = Number.isFinite(progress.streakDays) ? Number(progress.streakDays) : streak
      const badgeUnlocked = Boolean(progress.badgeUnlocked || streakDays >= 7)

      return {
        ...progress,
        activityDates,
        dailyShakeCount,
        dailyUploadCount,
        streakDays,
        badgeUnlocked,
        todayShakeCount
      }
    }

    // 进度摘要，避免日志过大
    const summarizeProgress = (p = {}) => {
      const keys = Object.keys(p || {})
      const adLen = Array.isArray(p.activityDates) ? p.activityDates.length : 0
      const dsDays = p.dailyShakeCount && typeof p.dailyShakeCount === 'object' ? Object.keys(p.dailyShakeCount).length : 0
      const duDays = p.dailyUploadCount && typeof p.dailyUploadCount === 'object' ? Object.keys(p.dailyUploadCount).length : 0
      return {
        keys,
        activityDatesCount: adLen,
        dailyShakeDaysCount: dsDays,
        dailyUploadDaysCount: duDays,
        streakDays: Number(p.streakDays || 0),
        badgeUnlocked: !!p.badgeUnlocked
      }
    }

    if (USE_MEMORY) {
      const raw = memoryProgress.get(phone) || {}
      logger.info('GET 进度(内存)', {
        phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        rawSummary: summarizeProgress(raw)
      })
      const enriched = computeDerived(raw)
      logger.info('GET 进度派生(内存)', {
        phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        streakDays: enriched.streakDays,
        todayShakeCount: enriched.todayShakeCount,
        badgeUnlocked: enriched.badgeUnlocked
      })
      return res.json({ success:true, data: enriched })
    }

    const raw = await SurveyResult.getPublicProgressByPhone(phone)
    logger.info('GET 进度(DB)', {
      phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      rawSummary: summarizeProgress(raw || {})
    })
    const enriched = computeDerived(raw)
    logger.info('GET 进度派生(DB)', {
      phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      streakDays: enriched.streakDays,
      todayShakeCount: enriched.todayShakeCount,
      badgeUnlocked: enriched.badgeUnlocked
    })
    return res.json({ success:true, data: enriched })
  } catch (e) {
    logger.error('获取进度失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

router.post('/progress/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    const progress = req.body?.progress || {}
    if (!validPhone(phone)) {
      logger.warn('进度更新失败：手机号格式不正确', { phoneMasked: String(phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
      return res.status(400).json({ success:false, message:'手机号码格式不正确' })
    }

      const fmtToday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
      })
      const todayKey = fmtToday.format(new Date())
    const summary = {
      keys: Object.keys(progress || {}),
      activityDatesCount: Array.isArray(progress.activityDates) ? progress.activityDates.length : 0,
      todayShakeCount: (progress.dailyShakeCount && progress.dailyShakeCount[todayKey]) ? Number(progress.dailyShakeCount[todayKey]) : 0,
      todayUploadCount: (progress.dailyUploadCount && progress.dailyUploadCount[todayKey]) ? Number(progress.dailyUploadCount[todayKey]) : 0,
      streakDays: Number(progress.streakDays || 0),
      badgeUnlocked: !!progress.badgeUnlocked
    }
    logger.info('POST 进度接收', {
      phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      summary
    })

    if (USE_MEMORY) {
      memoryProgress.set(phone, progress)
      logger.info('POST 进度保存(内存)', {
        phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        saved: true
      })
      return res.json({ success:true, data: { mode: 'memory', saved: true } })
    }

    const result = await SurveyResult.updatePublicProgressByPhone(phone, progress)
    logger.info('POST 进度保存(DB)', {
      phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      result
    })
    return res.json({ success:true, data: result })
  } catch (e) {
    logger.error('更新进度失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 今日摇一摇计数原子 +1（按手机号） */
router.post('/progress/:phone/shake', async (req, res) => {
  try {
    const { phone } = req.params
    if (!validPhone(phone)) {
      logger.warn('进度递增失败：手机号格式不正确', { phoneMasked: String(phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') })
      return res.status(400).json({ success:false, message:'手机号码格式不正确' })
    }

    // 按上海时区生成今日键
    const fmtToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    })
    const todayKey = fmtToday.format(new Date())

    if (USE_MEMORY) {
      const progress = memoryProgress.get(phone) || {}
      const dsc = (progress.dailyShakeCount && typeof progress.dailyShakeCount === 'object') ? progress.dailyShakeCount : {}
      const ad = Array.isArray(progress.activityDates) ? progress.activityDates : []
      dsc[todayKey] = Number(dsc[todayKey] || 0) + 1
      if (!ad.includes(todayKey)) ad.push(todayKey)
      progress.dailyShakeCount = dsc
      progress.activityDates = ad
      memoryProgress.set(phone, progress)
      logger.info('POST 进度原子+1(内存)', { phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), todayKey, todayShakeCount: dsc[todayKey] })
      return res.json({ success:true, data: { mode: 'memory', todayKey, todayShakeCount: dsc[todayKey] } })
    }

    const result = await SurveyResult.incrementPublicShakeByPhone(phone)
    logger.info('POST 进度原子+1(DB)', { phoneMasked: String(phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), todayKey: result.todayKey, todayShakeCount: result.todayShakeCount })
    return res.json({ success:true, data: { todayKey: result.todayKey, todayShakeCount: result.todayShakeCount } })
  } catch (e) {
    logger.error('进度原子+1失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/**
 * 管理员令牌校验中间件
 * - 读取请求头 X-Admin-Token 与环境变量 ADMIN_TOKEN 比较
 * - 仅用于审核相关接口，避免未授权操作
 */
function requireAdminToken(req, res, next) {
  try {
    const token = req.headers['x-admin-token']
    const expected = String(process.env.ADMIN_TOKEN || '').trim()
    if (!expected) {
      logger.warn('未配置ADMIN_TOKEN，拒绝管理员接口访问')
      return res.status(403).json({ success:false, message:'管理员令牌未配置' })
    }
    if (!token || token !== expected) {
      logger.warn('管理员令牌校验失败', { provided: Boolean(token) })
      return res.status(403).json({ success:false, message:'管理员令牌错误' })
    }
    next()
  } catch (e) {
    logger.error('管理员令牌校验异常', { error: e.message })
    return res.status(500).json({ success:false, message:'服务器内部错误' })
  }
}

/** 审核：获取祝福列表（按状态分页） */
router.get('/admin/blessings', requireAdminToken, async (req, res) => {
  try {
    const { status, tag, page, pageSize } = req.query
    if (USE_MEMORY) {
      // 内存模式：直接过滤并分页
      let list = memoryBlessings
      if (status) list = list.filter(b => b.review_status === status)
      if (tag) list = list.filter(b => b.tag === tag)
      const p = Math.max(1, Number(page) || 1)
      const ps = Math.max(1, Math.min(100, Number(pageSize) || 20))
      const offset = (p - 1) * ps
      const pageList = list.slice(offset, offset + ps)
      return res.json({ success:true, data: pageList, total: list.length })
    }
    const rows = await Blessing.listByStatus({ status, tag, page, pageSize })
    return res.json({ success:true, data: rows })
  } catch (e) {
    logger.error('获取审核列表失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 审核：更新祝福状态（批准/驳回） */
router.post('/admin/blessing/:id/review', requireAdminToken, async (req, res) => {
  try {
    const { id } = req.params
    // 兼容：从 body / query / 头部读取状态，解决代理丢失请求体的问题
    const rawStatus = (req.body && req.body.status) || req.query?.status || req.headers['x-status'] || ''
    const status = String(rawStatus).toLowerCase().trim()
    if (!['approved','rejected','pending'].includes(status)) {
      logger.admin?.warn && logger.admin.warn('非法审核状态或请求体缺失', {
        id,
        contentType: req.headers['content-type'] || null,
        bodyKeys: Object.keys(req.body || {}),
        query: req.query || {},
        headersStatus: req.headers['x-status'] || null
      })
      return res.status(400).json({ success:false, message:'非法审核状态' })
    }
    if (USE_MEMORY) {
      const row = memoryBlessings.find(b => b.id === Number(id))
      if (!row) return res.status(404).json({ success:false, message:'未找到祝福' })
      row.review_status = status
      row.updated_at = new Date()
      logger.info('内存模式：审核状态更新', { id, status })
      return res.json({ success:true })
    }
    const result = await Blessing.updateReviewStatus(Number(id), status)
    logger.info('审核状态更新', { id, status, success: result.success })
    return res.json(result)
  } catch (e) {
    logger.admin?.error ? logger.admin.error('更新审核状态失败', { error: e.message }) : logger.error('更新审核状态失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 审核：获取祝福详情 */
router.get('/admin/blessing/:id', requireAdminToken, async (req, res) => {
  try {
    const { id } = req.params
    if (USE_MEMORY) {
      const row = memoryBlessings.find(b => b.id === Number(id))
      return res.json({ success: !!row, data: row || null })
    }
    const row = await Blessing.getById(Number(id))
    return res.json({ success: !!row, data: row || null })
  } catch (e) {
    logger.admin.error('获取祝福详情失败', { error: e.message, id: req.params.id })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 审核：删除祝福 */
router.delete('/admin/blessing/:id', requireAdminToken, async (req, res) => {
  try {
    const { id } = req.params
    if (USE_MEMORY) {
      const idx = memoryBlessings.findIndex(b => b.id === Number(id))
      if (idx === -1) return res.status(404).json({ success:false, message:'未找到祝福' })
      const removed = memoryBlessings.splice(idx, 1)
      logger.admin.info('内存模式：删除祝福', { id, phone: removed[0]?.phone })
      return res.json({ success:true })
    }
    const result = await Blessing.deleteById(Number(id))
    logger.admin.info('删除祝福', { id, success: result.success })
    return res.json(result)
  } catch (e) {
    logger.admin.error('删除祝福失败', { error: e.message, id: req.params.id })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 审核：批量更新状态 */
router.post('/admin/blessings/review-bulk', requireAdminToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(n => Number.isFinite(n)) : []
    const status = String(req.body?.status || '')
    if (!ids.length) return res.status(400).json({ success:false, message:'缺少ids' })
    if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ success:false, message:'非法审核状态' })
    let updated = 0
    if (USE_MEMORY) {
      for (const id of ids) {
        const row = memoryBlessings.find(b => b.id === id)
        if (row) { row.review_status = status; row.updated_at = new Date(); updated++ }
      }
      logger.admin.info('内存模式：批量审核', { ids, status, updated })
      return res.json({ success:true, updated })
    }
    for (const id of ids) {
      const rst = await Blessing.updateReviewStatus(id, status)
      if (rst.success) updated++
    }
    logger.admin.info('批量审核', { ids, status, updated })
    return res.json({ success:true, updated })
  } catch (e) {
    logger.admin.error('批量审核失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 审核：祝福统计 */
router.get('/admin/stats', requireAdminToken, async (req, res) => {
  try {
    if (USE_MEMORY) {
      const stats = { statusCounts: {}, totals: { total_likes: 0, total_medals: 0 } }
      for (const row of memoryBlessings) {
        stats.statusCounts[row.review_status] = (stats.statusCounts[row.review_status] || 0) + 1
        stats.totals.total_likes += Number(row.likes || 0)
        stats.totals.total_medals += Number(row.medals || 0)
      }
      return res.json({ success:true, data: stats })
    }
    const stats = await Blessing.getStats()
    return res.json({ success:true, data: stats })
  } catch (e) {
    logger.admin.error('获取祝福统计失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

/** 审核：搜索祝福 */
router.get('/admin/search', requireAdminToken, async (req, res) => {
  try {
    const { q, status, page, pageSize } = req.query
    if (USE_MEMORY) {
      const p = Math.max(1, Number(page) || 1)
      const ps = Math.max(1, Math.min(100, Number(pageSize) || 20))
      let list = memoryBlessings
      const qq = String(q || '').trim().toLowerCase()
      if (qq) list = list.filter(b => String(b.title || '').toLowerCase().includes(qq) || String(b.content || '').toLowerCase().includes(qq) || String(b.phone || '').toLowerCase().includes(qq))
      if (status) list = list.filter(b => b.review_status === status)
      const offset = (p - 1) * ps
      const pageList = list.slice(offset, offset + ps)
      return res.json({ success:true, data: pageList, total: list.length })
    }
    const rows = await Blessing.searchByKeyword({ q, status, page, pageSize })
    return res.json({ success:true, data: rows })
  } catch (e) {
    logger.admin.error('搜索祝福失败', { error: e.message })
    res.status(500).json({ success:false, message:'服务器内部错误' })
  }
})

module.exports = router