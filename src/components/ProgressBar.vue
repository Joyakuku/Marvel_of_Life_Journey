<template>
  <div class="progress-container">
    <!-- 进度信息 -->
    <div class="progress-info">
      <span class="progress-percentage">
        {{ percentage }}%
      </span>
    </div>
    
    <!-- 进度条 -->
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: percentage + '%' }"
      ></div>
    </div>
    

  </div>
</template>

<script>
/**
 * 进度条组件
 * 显示问卷完成进度和当前位置
 */
export default {
  name: 'ProgressBar',
  props: {
    // 当前题目序号（1-based）
    current: {
      type: Number,
      required: true,
      validator: (value) => value > 0
    },
    // 总题目数量
    total: {
      type: Number,
      required: true,
      validator: (value) => value > 0
    },
    // 是否显示分段指示器
    showSegments: {
      type: Boolean,
      default: false
    },
    // 分段配置
    segmentConfig: {
      type: Array,
      default: () => [
        { label: '健康状况', range: [1, 7], title: '基本健康状况评估' },
        { label: '捐献意愿', range: [8, 13], title: '捐献意愿调查' },
        { label: '知识认知', range: [14, 18], title: '相关知识了解程度' }
      ]
    }
  },
  computed: {
    /**
     * 计算完成百分比
     */
    percentage() {
      if (this.total === 0) return 0
      return Math.round((this.current / this.total) * 100)
    },
    
    /**
     * 计算分段状态
     */
    segments() {
      if (!this.showSegments) return []
      
      return this.segmentConfig.map(segment => {
        const [start, end] = segment.range
        const isCompleted = this.current > end
        const isCurrent = this.current >= start && this.current <= end
        const isPending = this.current < start
        
        return {
          ...segment,
          completed: isCompleted,
          current: isCurrent,
          pending: isPending
        }
      })
    }
  },
  watch: {
    /**
     * 监听进度变化，添加动画效果
     */
    percentage(newVal, oldVal) {
      if (newVal > oldVal) {
        console.log(`进度更新: ${oldVal}% -> ${newVal}%`)
        this.$emit('progress-updated', {
          current: this.current,
          total: this.total,
          percentage: newVal
        })
      }
    }
  },
  methods: {
    /**
     * 处理分段点击事件
     */
    handleSegmentClick(segment, index) {
      if (!segment.pending) {
        const [start] = segment.range
        this.$emit('segment-clicked', {
          segment,
          index,
          targetQuestion: start
        })
        console.log(`点击分段: ${segment.label}, 跳转到第${start}题`)
      }
    }
  }
}
</script>

<style scoped>
.progress-container {
  width: 100%;
  margin-bottom: 20px;
  padding: 15px 0;
}

.progress-info {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.progress-percentage {
  font-weight: bold;
  color: #4a90e2;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e8f4fd;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-20px);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(20px);
    opacity: 0;
  }
}



/* 响应式设计 */
@media (max-width: 768px) {
  .progress-info {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .progress-container {
    padding: 10px 0;
  }
}
</style>