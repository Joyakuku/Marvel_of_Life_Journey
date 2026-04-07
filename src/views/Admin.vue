<template>
  <div class="admin-container">
    <!-- 顶部标题栏 -->
    <header class="admin-header">
      <h1 class="title">数据分析仪表盘</h1>
      <p class="subtitle">实时总览 | 关键指标 | 趋势分析</p>
    </header>

    <!-- 关键指标统计面板 -->
    <section class="kpi-panel">
      <div class="kpi-card">
        <div class="kpi-label">累计问卷数</div>
        <div class="kpi-value">{{ kpis.total_surveys ?? '-' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">平均总分</div>
        <div class="kpi-value">{{ formatNumber(kpis.avg_total_score) }}</div>
      </div>
      <!-- 删除：平均分(健康/意愿/认知) KPI 卡片 -->
      <div class="kpi-card">
        <div class="kpi-label">最高 / 最低</div>
        <div class="kpi-value small">{{ formatNumber(kpis.max_score) }} / {{ formatNumber(kpis.min_score) }}</div>
      </div>
    </section>

    <!-- 图表区：实时数据可视化 + 趋势分析 -->
    <section class="charts">
      <!-- 简易“实时”数据：最近N条的分数折线 -->
      <div class="chart-card">
        <h3 class="chart-title">最近记录总分走势（Top {{ recentLimit }}）</h3>
        <svg :width="chartWidth" :height="chartHeight" class="chart" aria-label="recent-scores-line">
          <polyline
            :points="recentPolyline"
            fill="none"
            stroke="#4a90e2"
            stroke-width="2"
          />
          <!-- X轴与Y轴 -->
          <line :x1="padding" :y1="padding" :x2="padding" :y2="chartHeight - padding" stroke="#dfe6f0" />
          <line :x1="padding" :y1="chartHeight - padding" :x2="chartWidth - padding" :y2="chartHeight - padding" stroke="#dfe6f0" />
        </svg>
      </div>

      <!-- 删除：分数分布柱状图（Top N） -->
    </section>

    <!-- 新增：记录列表区（最近/最佳/最差） -->
    <section class="records">
      <div class="record-card">
        <h3 class="record-title">最近记录（{{ displayCount }}）</h3>
        <ul class="record-list">
          <li v-for="r in recentRecords" :key="r.id" @click="openDetail(r)" class="record-item">
            <div class="record-meta">
              <span class="record-id">#{{ r.id }}</span>
              <span class="record-phone">{{ maskPhone(r.phone) }}</span>
              <span class="record-time">{{ formatTime(r.end_time || r.start_time) }}</span>
            </div>
            <div class="record-scores">
              <span class="score-total">总分: {{ formatNumber(r.total_score) }}</span>
              <span class="score-sections">H/{{ formatNumber(r.section1_score) }} W/{{ formatNumber(r.section2_score) }} C/{{ formatNumber(r.section3_score) }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="record-card">
        <h3 class="record-title">最佳记录（{{ displayCount }}）</h3>
        <ul class="record-list">
          <li v-for="r in bestRecords" :key="r.id" @click="openDetail(r)" class="record-item">
            <div class="record-meta">
              <span class="record-id">#{{ r.id }}</span>
              <span class="record-phone">{{ maskPhone(r.phone) }}</span>
              <span class="record-time">{{ formatTime(r.end_time || r.start_time) }}</span>
            </div>
            <div class="record-scores">
              <span class="score-total">总分: {{ formatNumber(r.total_score) }}</span>
              <span class="score-sections">H/{{ formatNumber(r.section1_score) }} W/{{ formatNumber(r.section2_score) }} C/{{ formatNumber(r.section3_score) }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="record-card">
        <h3 class="record-title">最差记录（{{ displayCount }}）</h3>
        <ul class="record-list">
          <li v-for="r in worstRecords" :key="r.id" @click="openDetail(r)" class="record-item">
            <div class="record-meta">
              <span class="record-id">#{{ r.id }}</span>
              <span class="record-phone">{{ maskPhone(r.phone) }}</span>
              <span class="record-time">{{ formatTime(r.end_time || r.start_time) }}</span>
            </div>
            <div class="record-scores">
              <span class="score-total">总分: {{ formatNumber(r.total_score) }}</span>
              <span class="score-sections">H/{{ formatNumber(r.section1_score) }} W/{{ formatNumber(r.section2_score) }} C/{{ formatNumber(r.section3_score) }}</span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- 详情弹层：展示答案与AI解析 -->
    <div v-if="showDetail" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal">
        <div class="modal-header">
          <h3>记录详情 #{{ selectedRecord?.id }}</h3>
          <button class="close" @click="closeDetail">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-section">
            <h4>基本信息</h4>
            <p>手机号：{{ maskPhone(selectedRecord?.phone) }}</p>
            <p>总分：{{ formatNumber(selectedRecord?.total_score) }}</p>
            <p>分区：H/{{ formatNumber(selectedRecord?.section1_score) }} W/{{ formatNumber(selectedRecord?.section2_score) }} C/{{ formatNumber(selectedRecord?.section3_score) }}</p>
            <p>时间：{{ formatTime(selectedRecord?.end_time || selectedRecord?.start_time) }}</p>
          </div>
          <div class="modal-section">
            <h4>答案</h4>
            <pre class="answers">{{ prettyAnswers }}</pre>
          </div>
          <div class="modal-section">
            <h4>AI解析</h4>
            <pre class="ai">{{ selectedRecord?.ai_analysis || '暂无' }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 祝福审核后台 -->
    <section class="review-section">
      <h3 class="record-title">祝福审核</h3>
      <div class="review-toolbar">
        <input v-model="adminToken" placeholder="输入管理员令牌(X-Admin-Token)" />
        <button @click="saveAdminToken">保存令牌</button>
        <select v-model="reviewStatus">
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>
        <button @click="loadBlessings">刷新列表</button>
      </div>
      <ul class="review-list">
        <li v-for="b in blessings" :key="b.id" class="review-item">
          <div class="review-meta">
            <span>#{{ b.id }}</span>
            <span>{{ (b.phone || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }}</span>
            <span class="badge">{{ b.tag || '无标签' }}</span>
            <span class="status">{{ b.review_status }}</span>
            <span class="time">{{ b.created_at ? new Date(b.created_at).toLocaleString() : '-' }}</span>
          </div>
          <div class="review-content">
            <strong>{{ b.title }}</strong>
            <p>{{ b.content }}</p>
            <img v-if="b.image_url" :src="resolveFileUrl(b.image_url)" alt="图片" class="review-img"/>
          </div>
          <div class="review-actions" v-if="reviewStatus === 'pending'">
            <button class="approve" @click="approve(b)">通过</button>
            <button class="reject" @click="reject(b)">驳回</button>
          </div>
          <div class="review-actions" v-if="reviewStatus === 'approved'">
            <button class="reject" @click="deleteBlessing(b)">删除</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
/**
 * 管理员后台仪表盘
 * - 使用现有后端API：/api/survey/stats/overview 与 /api/survey (分页)
 * - 采用原生SVG绘制，避免引入新依赖，满足“不要修改已存在内容”要求
 * - 整体蓝白色简洁风格
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
import { surveyAPI, shakeAdminAPI, resolveFileUrl } from '@/services/api.js'

export default {
  name: 'Admin',
  setup() {
    const router = useRouter()
    const surveyStore = useSurveyStore()
    // KPI数据
    const kpis = ref({})
    // 最近记录列表（用于近实时展示与趋势）
    const recentList = ref([])
    const recentLimit = ref(20)

    // 新增：记录展示数量
    const displayCount = ref(5)

    // 详情弹层状态
    const showDetail = ref(false)
    const selectedRecord = ref(null)

    // 图表尺寸与边距
    const chartWidth = 640
    const chartHeight = 240
    const padding = 32

    /**
     * 加载统计信息与最近列表
     * 说明：不改后端，仅复用现有接口
     */
    const loadData = async () => {
      console.info('[Admin] 开始加载统计与最近记录')
      try {
        const statsResp = await surveyAPI.getStatistics()
        if (statsResp?.success) {
          kpis.value = statsResp.data || {}
        }
      } catch (e) {
        console.error('[Admin] 获取统计失败:', e?.message || e)
      }

      try {
        // 复用列表接口 /api/survey?page=1&pageSize=recentLimit
        const page = 1
        const pageSize = recentLimit.value
        const listResp = await fetch(`/api/survey?page=${page}&pageSize=${pageSize}`)
        const listJson = await listResp.json()
        if (listResp.ok && listJson?.success) {
          recentList.value = Array.isArray(listJson.data) ? listJson.data : []
        } else {
          console.warn('[Admin] 获取列表失败或无数据')
          recentList.value = []
        }
      } catch (e) {
        console.error('[Admin] 获取列表异常:', e?.message || e)
        recentList.value = []
      }
    }

    /**
     * 折线图点集：将最近列表（逆序时间）映射为折线
     */
    const recentPolyline = computed(() => {
      const data = [...recentList.value].reverse()
      if (!data.length) return ''

      const scores = data.map(d => Number(d.total_score) || 0)
      const max = Math.max(...scores, 100)
      const min = Math.min(...scores, 0)
      const span = Math.max(max - min, 1)

      const innerW = chartWidth - padding * 2
      const innerH = chartHeight - padding * 2
      const stepX = innerW / Math.max(scores.length - 1, 1)

      return scores.map((s, i) => {
        const x = padding + i * stepX
        const y = padding + (1 - (s - min) / span) * innerH
        return `${x},${y}`
      }).join(' ')
    })

    // 新增：记录列表（最近、最佳、最差）
    const recentRecords = computed(() => recentList.value.slice(0, displayCount.value))
    const bestRecords = computed(() => {
      return [...recentList.value]
        .sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0))
        .slice(0, displayCount.value)
    })
    const worstRecords = computed(() => {
      return [...recentList.value]
        .sort((a, b) => (Number(a.total_score) || 0) - (Number(b.total_score) || 0))
        .slice(0, displayCount.value)
    })

    // 工具：数值格式化
    const formatNumber = (v) => {
      if (v === null || v === undefined || Number.isNaN(Number(v))) return '-'
      return Number(v).toFixed(1)
    }

    // 工具：时间格式化
    const formatTime = (v) => {
      if (!v) return '-'
      try {
        const d = new Date(v)
        // 统一到本地时间显示，简洁格式
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      } catch {
        return String(v)
      }
    }

    // 工具：手机号脱敏
    const maskPhone = (p) => {
      if (!p) return '-'
      const s = String(p)
      return s.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    // 详情弹层相关
    const openDetail = (r) => {
      try {
        console.info('[Admin] 跳转到结果页面，记录ID:', r?.id)
        surveyStore.loadExistingSurveyResult(r)
        router.push('/result')
      } catch (e) {
        console.error('[Admin] 跳转结果页失败，回退为概要弹层:', e?.message || e)
        selectedRecord.value = r || null
        showDetail.value = !!r
      }
    }
    const closeDetail = () => {
      showDetail.value = false
      selectedRecord.value = null
    }

    // 解析答案为易读字符串
    const prettyAnswers = computed(() => {
      const r = selectedRecord.value
      if (!r || r.answers == null) return '暂无'
      let obj = r.answers
      try {
        if (typeof obj === 'string') obj = JSON.parse(obj)
      } catch (e) {
        // 返回原字符串，避免因解析失败丢失信息
        return String(r.answers)
      }
      try {
        return JSON.stringify(obj, null, 2)
      } catch {
        return String(r.answers)
      }
    })

    onMounted(() => {
      loadData()
      // 简单“实时”刷新：每60秒自动刷新一次（不侵入后端）
      const timer = setInterval(loadData, 60000)
      // 清理定时器
      window.addEventListener('beforeunload', () => clearInterval(timer))
    })

    /**
     * 祝福审核（后台）
     * - 通过管理员令牌访问 /api/shake/admin/blessings 与 /api/shake/admin/blessing/:id/review
     * - 仅用于内容审核；摇一摇仅检索审核通过的记录
     */
    const adminToken = ref(sessionStorage.getItem('admin-token') || '')
    const reviewStatus = ref('pending') // 默认审核待处理
    const blessPage = ref(1)
    const blessPageSize = ref(10)
    const blessings = ref([])

    const saveAdminToken = () => {
      sessionStorage.setItem('admin-token', adminToken.value)
      // 保存后立即刷新列表
      loadBlessings()
    }

    const loadBlessings = async () => {
      try {
        const resp = await shakeAdminAPI.listBlessings({ status: reviewStatus.value, page: blessPage.value, pageSize: blessPageSize.value, adminToken: adminToken.value })
        blessings.value = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.data) ? resp.data.data : [])
        console.info('[Admin] 已加载祝福审核列表', blessings.value.length)
      } catch (e) {
        console.error('[Admin] 加载祝福列表失败:', e?.message || e)
        blessings.value = []
      }
    }

    const approve = async (b) => {
      try {
        await shakeAdminAPI.reviewBlessing(b.id, 'approved', adminToken.value)
        await loadBlessings()
        alert(`已通过审核 #${b.id}`)
      } catch (e) { alert(e?.message || '审核失败') }
    }
    const reject = async (b) => {
      try {
        await shakeAdminAPI.reviewBlessing(b.id, 'rejected', adminToken.value)
        await loadBlessings()
        alert(`已驳回 #${b.id}`)
      } catch (e) { alert(e?.message || '驳回失败') }
    }

    const deleteBlessing = async (b) => {
      try {
        const ok = window.confirm(`确认删除已通过的祝福 #${b.id}？此操作不可恢复`)
        if (!ok) return
        await shakeAdminAPI.deleteBlessing(b.id, adminToken.value)
        await loadBlessings()
        alert(`已删除 #${b.id}`)
      } catch (e) { alert(e?.message || '删除失败') }
    }

    // 初始尝试加载（若有令牌）
    onMounted(() => { if (adminToken.value) loadBlessings() })

    return {
      router,
      surveyStore,
      kpis,
      recentList,
      recentLimit,
      displayCount,
      chartWidth,
      chartHeight,
      padding,
      recentPolyline,
      // 列表
      recentRecords,
      bestRecords,
      worstRecords,
      // 详情
      showDetail,
      selectedRecord,
      prettyAnswers,
      // 工具
      formatNumber,
      formatTime,
      maskPhone,
      openDetail,
      closeDetail,
      // 审核区
      adminToken,
      reviewStatus,
      blessPage,
      blessPageSize,
      blessings,
      saveAdminToken,
      loadBlessings,
      approve,
      reject,
      deleteBlessing,
      // URL解析辅助：确保图片URL在生产/开发环境正确
      resolveFileUrl,
    }
  }
}
</script>

<style scoped>
/* 整体蓝白简洁风格 */
.admin-container {
  padding: 24px 16px 48px;
  min-height: 100vh;
  background: #f7fbff; /* 淡蓝底色 */
}

.admin-header {
  text-align: center;
  margin-bottom: 24px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.subtitle {
  margin-top: 6px;
  color: #5a6c7d;
}

.kpi-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e6eef7;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.kpi-label {
  color: #6b7c93;
  font-size: 14px;
}

.kpi-value {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #1f6feb;
}

.kpi-value.small {
  font-size: 16px;
}

.charts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.chart-card {
  background: #ffffff;
  border: 1px solid #e6eef7;
  border-radius: 10px;
  padding: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.chart {
  width: 100%;
  height: auto;
  background: #fff;
}

/* 新增：记录列表样式 */
.records {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.record-card {
  background: #ffffff;
  border: 1px solid #e6eef7;
  border-radius: 10px;
  padding: 16px;
}

.record-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
}

.record-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.record-item {
  border: 1px solid #e6eef7;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.record-item:hover {
  background: #f2f8ff;
}

.record-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #6b7c93;
  font-size: 12px;
}

.record-scores {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  color: #2c3e50;
  font-weight: 600;
}

/* 详情弹层样式 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: min(860px, 92vw);
  max-height: 86vh;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e6eef7;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f7fbff;
  border-bottom: 1px solid #e6eef7;
}

.modal-header h3 { margin: 0; color: #2c3e50; font-size: 16px; }

.modal-header .close {
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
  color: #6b7c93;
}

.modal-body {
  padding: 14px 16px 18px;
  overflow: auto;
}

.modal-section { margin-bottom: 12px; }
.modal-section h4 { margin: 0 0 6px; color: #2c3e50; font-size: 14px; }

pre.answers, pre.ai {
  white-space: pre-wrap;
  background: #f7fbff;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e6eef7;
  color: #2c3e50;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .records { grid-template-columns: 1fr; }
}

/* 审核区域样式 */
.review-section {
  margin-top: 24px;
  background: #ffffff;
  border: 1px solid #e6eef7;
  border-radius: 10px;
  padding: 16px;
}
.review-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:12px; }
.review-toolbar input { flex:1; padding:8px; border:1px solid #e6eef7; border-radius:8px; }
.review-toolbar select, .review-toolbar button { padding:8px; border:1px solid #e6eef7; border-radius:8px; background:#f7fbff; }
.review-list { list-style:none; margin:0; padding:0; }
.review-item { border:1px solid #e6eef7; border-radius:8px; padding:12px; margin-bottom:10px; }
.review-meta { display:flex; gap:10px; align-items:center; color:#6b7c93; font-size:12px; margin-bottom:6px; }
.review-content { color:#2c3e50; }
.review-img { max-width: 160px; max-height: 120px; object-fit: cover; border-radius:8px; border:1px solid #e6eef7; margin-top:6px; }
.review-actions { margin-top:8px; display:flex; gap:8px; }
.approve { background:#e8f9e8; color:#2e7d32; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; }
.reject { background:#fdecea; color:#c62828; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; }

@media (max-width: 900px) {
  .kpi-panel { grid-template-columns: repeat(2, 1fr); }
}
</style>
