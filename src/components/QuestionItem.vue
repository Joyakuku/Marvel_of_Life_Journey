<template>
  <div class="question-item" :class="{ 'answered': isAnswered }">
    <!-- 问题标题 -->
    <div class="question-header">
      <h3 class="question-title">
        <span class="question-number">{{ questionNumber }}.</span>
        {{ question.title }}
      </h3>
    </div>

    <!-- 问题选项 -->
    <div class="question-options">
      <!-- 单选题 -->
      <div v-if="question.type === 'single'" class="radio-options">
        <label 
          v-for="option in question.options"
          :key="option.key"
          class="option-label"
          :class="{ 'selected': selectedAnswer === option.key }"
        >
          <input
            type="radio"
            :name="`question-${question.id}`"
            :value="option.key"
            v-model="selectedAnswer"
            @change="handleAnswerChange"
            class="option-input"
          />
          <span class="option-text">
            <span class="option-key">{{ option.key }}.</span>
            {{ option.text }}
          </span>
          <span class="checkmark"></span>
        </label>
      </div>

      <!-- 多选题 -->
      <div v-else-if="question.type === 'multiple'" class="checkbox-options">
        <label 
          v-for="option in question.options"
          :key="option.key"
          class="option-label"
          :class="{ 'selected': isOptionSelected(option.key) }"
        >
          <input
            type="checkbox"
            :value="option.key"
            v-model="selectedAnswers"
            @change="handleAnswerChange"
            class="option-input"
          />
          <span class="option-text">
            <span class="option-key">{{ option.key }}.</span>
            {{ option.text }}
          </span>
          <span class="checkmark"></span>
        </label>
      </div>

      <!-- 文本题 -->
      <div v-else-if="question.type === 'text'" class="text-option">
        <textarea
          v-model="textAnswer"
          @input="handleAnswerChange"
          :placeholder="question.placeholder || '请输入您的答案...'"
          class="text-input"
          rows="4"
        ></textarea>
        <div class="text-counter">
          {{ textAnswer.length }} / {{ maxLength }}
        </div>
      </div>
    </div>

    <!-- 问题说明 -->
    <div v-if="question.explanation && showExplanation" class="question-explanation">
      <div class="explanation-header">
        <i class="icon-info"></i>
        <span>题目解析</span>
      </div>
      <p class="explanation-text">{{ question.explanation }}</p>
    </div>

    <!-- 答题状态指示 -->
    <div class="answer-status">
      <div v-if="isAnswered" class="status-indicator answered">
        <i class="icon-check"></i>
        <span>已回答</span>
      </div>
      <div v-else class="status-indicator unanswered">
        <i class="icon-clock"></i>
        <span>待回答</span>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 问题项组件
 * 用于渲染单个问题及其选项
 */
export default {
  name: 'QuestionItem',
  props: {
    // 问题数据
    question: {
      type: Object,
      required: true,
      validator: (question) => {
        return question && question.id && question.type && question.title
      }
    },
    // 问题序号
    questionNumber: {
      type: Number,
      required: true
    },
    // 当前答案
    modelValue: {
      type: [String, Array],
      default: null
    },
    // 是否显示解析
    showExplanation: {
      type: Boolean,
      default: false
    },
    // 文本输入最大长度
    maxLength: {
      type: Number,
      default: 500
    }
  },
  emits: ['update:modelValue', 'answer-changed'],
  data() {
    return {
      // 内部答案状态
      selectedAnswer: null,
      selectedAnswers: [],
      textAnswer: ''
    }
  },
  computed: {
    /**
     * 是否已回答
     */
    isAnswered() {
      switch (this.question.type) {
        case 'single':
          return !!this.selectedAnswer
        case 'multiple':
          return this.selectedAnswers.length > 0
        case 'text':
          return this.textAnswer.trim().length > 0
        default:
          return false
      }
    }
  },
  watch: {
    /**
     * 监听外部传入的答案变化
     */
    modelValue: {
      handler(newValue) {
        this.initializeAnswer(newValue)
      },
      immediate: true
    }
  },
  methods: {
    /**
     * 初始化答案状态
     */
    initializeAnswer(value) {
      switch (this.question.type) {
        case 'single':
          this.selectedAnswer = value || null
          break
        case 'multiple':
          this.selectedAnswers = Array.isArray(value) ? [...value] : []
          break
        case 'text':
          this.textAnswer = value || ''
          break
      }
    },

    /**
     * 处理答案变化
     */
    handleAnswerChange() {
      let newValue
      
      switch (this.question.type) {
        case 'single':
          newValue = this.selectedAnswer
          break
        case 'multiple':
          newValue = [...this.selectedAnswers]
          break
        case 'text':
          newValue = this.textAnswer.slice(0, this.maxLength)
          this.textAnswer = newValue
          break
      }

      // 发出事件
      this.$emit('update:modelValue', newValue)
      this.$emit('answer-changed', {
        questionId: this.question.id,
        answer: newValue,
        isAnswered: this.isAnswered
      })

      console.log(`问题${this.question.id}答案变化:`, newValue)
    },

    /**
     * 检查选项是否被选中（多选题用）
     */
    isOptionSelected(optionKey) {
      return this.selectedAnswers.includes(optionKey)
    },

    /**
     * 清空答案
     */
    clearAnswer() {
      switch (this.question.type) {
        case 'single':
          this.selectedAnswer = null
          break
        case 'multiple':
          this.selectedAnswers = []
          break
        case 'text':
          this.textAnswer = ''
          break
      }
      this.handleAnswerChange()
    }
  }
}
</script>

<style scoped>
.question-item {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.question-item.answered {
  border-color: #28a745;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.question-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  line-height: 1.4;
  flex: 1;
}

.question-number {
  color: #007bff;
  margin-right: 8px;
}

.question-weight {
  background: #4a90e2;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  margin-left: 16px;
}

.question-options {
  margin-bottom: 20px;
}

/* 选项样式 */
.radio-options,
.checkbox-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-label {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: #fafafa;
}

.option-label:hover {
  border-color: #4a90e2;
  background: #f8fbff;
  transform: translateY(-1px);
}

.option-label.selected {
  border-color: #4a90e2;
  background: #e8f4fd;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.15);
}

.option-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.option-text {
  flex: 1;
  font-size: 16px;
  color: #495057;
  line-height: 1.5;
}

.option-key {
  font-weight: 600;
  color: #007bff;
  margin-right: 8px;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #dee2e6;
  border-radius: 50%;
  margin-left: 12px;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-options .checkmark {
  border-radius: 4px;
}

.option-label.selected .checkmark {
  background: #4a90e2;
  border-color: #4a90e2;
}

.option-label.selected .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-options .option-label.selected .checkmark::after {
  left: 5px;
  top: 1px;
  width: 5px;
  height: 8px;
}

/* 文本输入样式 */
.text-option {
  position: relative;
}

.text-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;
  background: white;
}

.text-input:focus {
  outline: none;
  border-color: #4a90e2;
  background: #fafbfc;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.text-counter {
  text-align: right;
  font-size: 12px;
  color: #6c757d;
  margin-top: 8px;
}

/* 问题解析样式 */
.question-explanation {
  background: #f8fbff;
  border-left: 4px solid #4a90e2;
  padding: 16px;
  border-radius: 0 8px 8px 0;
  margin-top: 16px;
}

.explanation-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 8px;
}

.explanation-text {
  color: #495057;
  line-height: 1.6;
  margin: 0;
}

/* 答题状态指示 */
.answer-status {
  display: flex;
  justify-content: flex-end;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.answered {
  background: #d4edda;
  color: #155724;
}

.status-indicator.unanswered {
  background: #fff3cd;
  color: #856404;
}

/* 图标样式 */
.icon-info::before {
  content: 'ℹ';
  margin-right: 4px;
}

.icon-check::before {
  content: '√';
}

.icon-clock::before {
  content: '⏱';
}

/* 响应式设计 */
@media (max-width: 768px) {
  .question-item {
    padding: 20px;
    margin-bottom: 16px;
  }
  
  .question-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .question-weight {
    margin-left: 0;
    align-self: flex-start;
  }
  
  .question-title {
    font-size: 16px;
  }
  
  .option-label {
    padding: 14px;
  }
  
  .option-text {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .question-item {
    padding: 16px;
  }
  
  .question-title {
    font-size: 15px;
  }
  
  .option-label {
    padding: 12px;
  }
  
  .option-text {
    font-size: 14px;
  }
  
  .text-input {
    padding: 12px;
    font-size: 15px;
  }
}
</style>