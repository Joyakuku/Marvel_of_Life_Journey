/**
 * 问题数据管理 Composable
 * 迁移自原项目的questions.js，适配Vue 3 Composition API
 */
import { ref, computed } from 'vue'

/**
 * 题库常量定义
 */
export const QUESTION_SECTIONS = {
  HEALTH: 'health',      // 基本健康状况
  INTENTION: 'intention', // 捐献意愿  
  KNOWLEDGE: 'knowledge'  // 知识认知
}

/**
 * 完整题库数据：18道题目（基于《题目及计分规则》）
 */
const QUESTIONS = [
  // 一、基本健康状况（44分）
  {
    id: 1,
    type: 'single',
    title: '您的年龄范围是？',
    options: [
      { key: 'A', text: '18周岁以下' },
      { key: 'B', text: '18-45周岁' },
      { key: 'C', text: '46-60周岁' },
      { key: 'D', text: '60周岁以上' }
    ],
    weight: 6,
    scoreMap: { A: 0, B: 6, C: 4, D: 0 },
    explanation: '18周岁以下身体尚未完全发育成熟，捐献可能对身体造成不良影响；60周岁以上身体机能逐渐衰退，捐献风险较高；18-45周岁是身体状况较好的年龄段，更适合作为捐献者，46-60周岁相对来说风险稍高，所以评分略低。',
    section: QUESTION_SECTIONS.HEALTH
  },
  {
    id: 2,
    type: 'single',
    title: '您的体重指数（BMI=体重(kg)÷身高²(m)）处于哪个范围？',
    options: [
      { key: 'A', text: 'BMI<18.5' },
      { key: 'B', text: '18.5≤BMI<24' },
      { key: 'C', text: '24≤BMI<28' },
      { key: 'D', text: 'BMI≥28' }
    ],
    weight: 6,
    scoreMap: { A: 2, B: 6, C: 4, D: 0 },
    explanation: 'BMI过低可能意味着身体营养状况不佳，造血功能可能受到一定影响；BMI在18.5-24之间是正常范围，身体状况相对较好，适合捐献；BMI过高（超重或肥胖）可能伴随一些慢性疾病，增加捐献风险，所以评分较低，尤其是BMI≥28时风险较高，得0分。',
    section: QUESTION_SECTIONS.HEALTH
  },
  {
    id: 3,
    type: 'single',
    title: '您是否有过严重的心血管疾病（如冠心病、心肌梗死、先天性心脏病等）？',
    options: [
      { key: 'A', text: '是' },
      { key: 'B', text: '否' }
    ],
    weight: 6,
    scoreMap: { A: 0, B: 6 },
    explanation: '严重的心血管疾病会影响身体的血液循环和造血功能，增加捐献过程中的风险，因此有此类疾病者暂不适合作为造血干细胞捐献者。',
    section: QUESTION_SECTIONS.HEALTH
  },
  {
    id: 4,
    type: 'single',
    title: '您是否患有传染性疾病（如艾滋病、乙肝、丙肝、梅毒等）？',
    options: [
      { key: 'A', text: '是' },
      { key: 'B', text: '否' }
    ],
    weight: 6,
    scoreMap: { A: 0, B: 6 },
    explanation: '传染性疾病可能通过造血干细胞捐献传播给受捐者，为了保障受捐者的健康，患有传染性疾病者不能成为捐献者。',
    section: QUESTION_SECTIONS.HEALTH
  },
  {
    id: 5,
    type: 'single',
    title: '您是否有恶性肿瘤病史？',
    options: [
      { key: 'A', text: '是' },
      { key: 'B', text: '否' }
    ],
    weight: 6,
    scoreMap: { A: 0, B: 6 },
    explanation: '恶性肿瘤会对身体的免疫系统和造血系统造成严重损害，且捐献可能会影响患者自身的治疗和康复，同时也可能对受捐者带来不良影响。',
    section: QUESTION_SECTIONS.HEALTH
  },
  {
    id: 6,
    type: 'single',
    title: '您是否患有血液系统疾病（如白血病、再生障碍性贫血、地中海贫血等）？',
    options: [
      { key: 'A', text: '是' },
      { key: 'B', text: '否' }
    ],
    weight: 6,
    scoreMap: { A: 0, B: 6 },
    explanation: '血液系统疾病会直接影响造血干细胞的质量和功能，捐献此类异常的造血干细胞无法达到治疗受捐者的目的，同时也可能对捐献者自身健康造成进一步损害，因此患有血液系统疾病者不适合捐献。',
    section: QUESTION_SECTIONS.HEALTH
  },
  {
    id: 7,
    type: 'single',
    title: '近5年内您是否接受过重大手术（如器官移植、开颅手术、心脏手术等）？',
    options: [
      { key: 'A', text: '是' },
      { key: 'B', text: '否' }
    ],
    weight: 8,
    scoreMap: { A: 2, B: 8 },
    explanation: '重大手术对身体创伤较大，术后身体需要较长时间恢复，近5年内接受过重大手术者，身体机能可能尚未完全恢复，捐献造血干细胞可能会增加身体负担和风险。若手术已超过5年且身体恢复良好，风险相对较低，因此设置一定分值。',
    section: QUESTION_SECTIONS.HEALTH
  },
  // 二、捐献意愿（32分）
  {
    id: 8,
    type: 'single',
    title: '您是否愿意在配型成功后捐献造血干细胞？',
    options: [
      { key: 'A', text: '非常愿意' },
      { key: 'B', text: '比较愿意' },
      { key: 'C', text: '不确定' },
      { key: 'D', text: '不太愿意' },
      { key: 'E', text: '非常不愿意' }
    ],
    weight: 6,
    scoreMap: { A: 6, B: 5, C: 4, D: 1, E: 0 },
    explanation: '捐献意愿是成为造血干细胞捐献者的重要前提，意愿越强烈，越有可能完成捐献过程，帮助需要的患者。',
    section: QUESTION_SECTIONS.INTENTION
  },
  {
    id: 9,
    type: 'single',
    title: '您是否了解造血干细胞捐献的基本流程？',
    options: [
      { key: 'A', text: '非常了解' },
      { key: 'B', text: '比较了解' },
      { key: 'C', text: '一般了解' },
      { key: 'D', text: '不太了解' },
      { key: 'E', text: '完全不了解' }
    ],
    weight: 5,
    scoreMap: { A: 5, B: 4, C: 3, D: 1, E: 0 },
    explanation: '了解捐献流程有助于捐献者做好充分的心理和生理准备，减少因未知而产生的恐惧和犹豫，提高捐献的成功率。',
    section: QUESTION_SECTIONS.INTENTION
  },
  {
    id: 10,
    type: 'single',
    title: '您的家人对您捐献造血干细胞的态度是？',
    options: [
      { key: 'A', text: '非常支持' },
      { key: 'B', text: '比较支持' },
      { key: 'C', text: '无所谓' },
      { key: 'D', text: '不太支持' },
      { key: 'E', text: '强烈反对' }
    ],
    weight: 6,
    scoreMap: { A: 6, B: 5, C: 4, D: 1, E: 0 },
    explanation: '家人支持是顺利完成捐献的重要保障，支持度越高，捐献可行性越强。',
    section: QUESTION_SECTIONS.INTENTION
  },
  {
    id: 11,
    type: 'single',
    title: '您是否愿意主动了解更多关于造血干细胞捐献的知识？',
    options: [
      { key: 'A', text: '非常愿意' },
      { key: 'B', text: '比较愿意' },
      { key: 'C', text: '无所谓' },
      { key: 'D', text: '不太愿意' },
      { key: 'E', text: '非常不愿意' }
    ],
    weight: 4,
    scoreMap: { A: 4, B: 3, C: 1, D: 0, E: 0 },
    explanation: '主动了解相关知识有助于捐献者更全面地认识捐献，做好各方面的准备，也是捐献意愿积极的一种体现。',
    section: QUESTION_SECTIONS.INTENTION
  },
  {
    id: 12,
    type: 'single',
    title: '若捐献需要您花费一定的时间（如体检、捐献期间的时间等），您是否仍愿意捐献？',
    options: [
      { key: 'A', text: '无论需要多少时间，都愿意' },
      { key: 'B', text: '时间在1周以内，愿意' },
      { key: 'C', text: '时间在1-2周，愿意' },
      { key: 'D', text: '时间超过2周，不愿意' },
      { key: 'E', text: '不愿意因为捐献花费时间' }
    ],
    weight: 5,
    scoreMap: { A: 5, B: 4, C: 3, D: 1, E: 0 },
    explanation: '造血干细胞捐献从前期体检到实际捐献需要一定时间投入，对时间的接受程度能反映捐献意愿的坚定性，愿意投入更多时间说明捐献的决心更强。',
    section: QUESTION_SECTIONS.INTENTION
  },
  {
    id: 13,
    type: 'single',
    title: '您对造血干细胞捐献后可能给受捐者带来的帮助有何看法？',
    options: [
      { key: 'A', text: '认为是非常有意义的善举，能拯救生命' },
      { key: 'B', text: '认为有一定帮助，但意义一般' },
      { key: 'C', text: '不确定能带来多大帮助' },
      { key: 'D', text: '认为帮助不大' }
    ],
    weight: 5,
    scoreMap: { A: 5, B: 4, C: 1, D: 0 },
    explanation: '对捐献意义的认知会影响捐献意愿，越认可捐献能给受捐者带来重大帮助，越有可能积极参与捐献。',
    section: QUESTION_SECTIONS.INTENTION
  },
  // 三、知识认知（24分）
  {
    id: 14,
    type: 'single',
    title: '造血干细胞捐献对捐献者的身体健康是否有长期危害？',
    options: [
      { key: 'A', text: '有严重长期危害' },
      { key: 'B', text: '有一定长期危害' },
      { key: 'C', text: '基本没有长期危害' },
      { key: 'D', text: '不清楚' }
    ],
    weight: 6,
    scoreMap: { A: 0, B: 1, C: 6, D: 1 },
    explanation: '科学研究表明，造血干细胞捐献是安全的，捐献后人体的造血干细胞会迅速增殖，恢复到原来的水平，对捐献者的身体健康基本没有长期危害。',
    section: QUESTION_SECTIONS.KNOWLEDGE
  },
  {
    id: 15,
    type: 'single',
    title: '造血干细胞捐献的主要方式有哪些？',
    options: [
      { key: 'A', text: '骨髓穿刺' },
      { key: 'B', text: '外周血造血干细胞采集' },
      { key: 'C', text: '以上两种都是' },
      { key: 'D', text: '不清楚' }
    ],
    weight: 5,
    scoreMap: { A: 3, B: 3, C: 5, D: 0 },
    explanation: '造血干细胞捐献主要有骨髓穿刺和外周血造血干细胞采集两种方式。现在外周血造血干细胞采集更为常用，这种方式类似于献血，对捐献者的创伤较小。',
    section: QUESTION_SECTIONS.KNOWLEDGE
  },
  {
    id: 16,
    type: 'single',
    title: '造血干细胞捐献后，捐献者的造血功能多久能恢复？',
    options: [
      { key: 'A', text: '1-2周' },
      { key: 'B', text: '1-2个月' },
      { key: 'C', text: '3-6个月' },
      { key: 'D', text: '不清楚' }
    ],
    weight: 5,
    scoreMap: { A: 5, B: 3, C: 1, D: 0 },
    explanation: '捐献造血干细胞后，人体的造血干细胞会迅速增殖，一般在1-2周内就能恢复到捐献前的水平，不会对身体的正常造血功能造成长期影响。',
    section: QUESTION_SECTIONS.KNOWLEDGE
  },
  {
    id: 17,
    type: 'single',
    title: '配型成功的概率与哪些因素有关？',
    options: [
      { key: 'A', text: '种族' },
      { key: 'B', text: '血缘关系' },
      { key: 'C', text: '以上都是' },
      { key: 'D', text: '不清楚' }
    ],
    weight: 5,
    scoreMap: { A: 1, B: 1, C: 5, D: 0 },
    explanation: '配型成功的概率与种族和血缘关系密切相关。同一种族内配型成功的概率相对较高，有血缘关系的亲属之间配型成功的概率比无血缘关系的人高很多。',
    section: QUESTION_SECTIONS.KNOWLEDGE
  },
  {
    id: 18,
    type: 'single',
    title: '造血干细胞捐献是否需要捐献者支付费用？',
    options: [
      { key: 'A', text: '需要，且费用较高' },
      { key: 'B', text: '需要，但费用较低' },
      { key: 'C', text: '不需要，费用由受捐者或相关机构承担' },
      { key: 'D', text: '不清楚' }
    ],
    weight: 4,
    scoreMap: { A: 0, B: 0, C: 4, D: 0 },
    explanation: '造血干细胞捐献过程中产生的费用，如体检费、采集费等，均由受捐者或相关公益机构承担，捐献者不需要支付任何费用。',
    section: QUESTION_SECTIONS.KNOWLEDGE
  }
]

/**
 * 评分等级定义
 */
export const SCORE_LEVELS = [
  {
    min: 80,
    max: 100,
    level: '优秀',
    description: '您具备较高的造血干细胞捐献潜力，若有机会，很适合成为一名造血干细胞捐献者。'
  },
  {
    min: 65,
    max: 79,
    level: '良好',
    description: '您有一定的造血干细胞捐献潜力，但可能在某些方面需要进一步了解和完善。'
  },
  {
    min: 50,
    max: 64,
    level: '一般',
    description: '您的造血干细胞捐献潜力一般，建议您更深入地了解相关知识，再考虑是否成为捐献者。'
  },
  {
    min: 0,
    max: 49,
    level: '待提升',
    description: '目前来看，您的造血干细胞捐献潜力较低，可能由于健康状况、捐献意愿或知识认知等方面存在一些问题。'
  }
]

/**
 * 问题管理 Composable
 */
export function useQuestions() {
  // 响应式数据
  const questions = ref(QUESTIONS)
  const currentQuestionIndex = ref(0)
  const answers = ref({})

  // 计算属性
  const currentQuestion = computed(() => {
    return questions.value[currentQuestionIndex.value] || null
  })

  const totalQuestions = computed(() => questions.value.length)

  const progress = computed(() => {
    return Math.round(((currentQuestionIndex.value + 1) / totalQuestions.value) * 100)
  })

  const isLastQuestion = computed(() => {
    return currentQuestionIndex.value === totalQuestions.value - 1
  })

  const isFirstQuestion = computed(() => {
    return currentQuestionIndex.value === 0
  })

  const answeredCount = computed(() => {
    return Object.keys(answers.value).length
  })

  const allAnswered = computed(() => {
    return answeredCount.value === totalQuestions.value
  })

  // 方法
  const getAllQuestions = () => {
    console.log('获取所有问题数据')
    return questions.value
  }

  const getQuestionById = (id) => {
    console.log(`获取问题ID: ${id}`)
    return questions.value.find(q => q.id === id)
  }

  const setAnswer = (questionId, answer) => {
    console.log(`设置答案 - 问题ID: ${questionId}, 答案: ${answer}`)
    answers.value[questionId] = answer
  }

  const getAnswer = (questionId) => {
    return answers.value[questionId]
  }

  const nextQuestion = () => {
    if (!isLastQuestion.value) {
      currentQuestionIndex.value++
      console.log(`切换到下一题: ${currentQuestionIndex.value + 1}`)
    }
  }

  const prevQuestion = () => {
    if (!isFirstQuestion.value) {
      currentQuestionIndex.value--
      console.log(`切换到上一题: ${currentQuestionIndex.value + 1}`)
    }
  }

  const goToQuestion = (index) => {
    if (index >= 0 && index < totalQuestions.value) {
      currentQuestionIndex.value = index
      console.log(`跳转到问题: ${index + 1}`)
    }
  }

  const calculateScore = (userAnswers = answers.value) => {
    console.log('开始计算总分')
    let totalScore = 0
    let maxScore = 0
    const sectionScores = {
      [QUESTION_SECTIONS.HEALTH]: { score: 0, max: 0 },
      [QUESTION_SECTIONS.INTENTION]: { score: 0, max: 0 },
      [QUESTION_SECTIONS.KNOWLEDGE]: { score: 0, max: 0 }
    }

    questions.value.forEach(question => {
      const userAnswer = userAnswers[question.id]
      const questionScore = userAnswer ? (question.scoreMap[userAnswer] || 0) : 0
      const questionMaxScore = Math.max(...Object.values(question.scoreMap))
      
      totalScore += questionScore
      maxScore += questionMaxScore
      
      // 按分类统计
      sectionScores[question.section].score += questionScore
      sectionScores[question.section].max += questionMaxScore
    })

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    const level = SCORE_LEVELS.find(level => percentage >= level.min && percentage <= level.max)

    console.log(`计算完成 - 总分: ${totalScore}/${maxScore} (${percentage}%)`)
    
    return {
      totalScore,
      maxScore,
      percentage,
      level: level || SCORE_LEVELS[SCORE_LEVELS.length - 1],
      sectionScores
    }
  }

  const resetSurvey = () => {
    console.log('重置问卷')
    currentQuestionIndex.value = 0
    answers.value = {}
  }

  const getQuestionsBySection = () => {
    const sections = {}
    questions.value.forEach(question => {
      if (!sections[question.section]) {
        sections[question.section] = []
      }
      sections[question.section].push(question)
    })
    return sections
  }

  return {
    // 响应式数据
    questions: questions.value,
    currentQuestionIndex,
    answers,
    
    // 计算属性
    currentQuestion,
    totalQuestions,
    progress,
    isLastQuestion,
    isFirstQuestion,
    answeredCount,
    allAnswered,
    
    // 方法
    getAllQuestions,
    getQuestionById,
    setAnswer,
    getAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    calculateScore,
    resetSurvey,
    getQuestionsBySection
  }
}