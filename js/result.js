/**
 * result.js
 * 结果页面JavaScript逻辑
 */

// 使用全局日志模块和存储模块
// 注意：此文件依赖于logger.js和storage.js先加载

// 全局变量
let questionsData = []; // 存储从questions模块获取的题目数据
let answers = {};
let scoreResult = null;
let currentMode = 'explanation'; // 'explanation' 或 'ai'

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 记录页面生命周期
  logger.info('Result', '页面加载完成');
  
  // 初始化数据
  initData();
  

  
  // 绑定模式切换按钮事件
  const explanationModeBtn = document.getElementById('explanationMode');
  const aiModeBtn = document.getElementById('aiMode');
  
  if (explanationModeBtn) {
    explanationModeBtn.addEventListener('click', function() {
      switchMode('explanation');
    });
  }
  
  if (aiModeBtn) {
    aiModeBtn.addEventListener('click', function() {
      switchMode('ai');
    });
  }
  
  // 绑定返回首页按钮事件
  const backToHomeBtn = document.getElementById('backToHome');
  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', function() {
      logger.info('Result', '点击返回首页按钮');
      window.location.href = 'index.html';
    });
  }
  
  // 绑定重新测试按钮事件
  const retakeBtn = document.getElementById('retakeSurvey');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', function() {
      logger.info('Result', '点击重新测试按钮');
      // 清除答案
      window.storage.setStorage('draft_answers', {});
      // 跳转到问卷页
      window.location.href = 'survey.html';
    });
  }
});

/**
 * 初始化数据
 */
function initData() {
  try {
    // 从全局questions对象获取所有问题
    if (window.questions && typeof window.questions.getAllQuestions === 'function') {
      questionsData = window.questions.getAllQuestions();
    } else {
      // 如果全局对象不可用，尝试从storage获取
      questionsData = window.storage.getStorage('questions', []);
    }
    
    // 获取答案
    answers = window.storage.getStorage('survey_answers', {});
    
    if (!questionsData || questionsData.length === 0) {
      logger.error('Result', '获取问题失败');
      showError('获取问题数据失败，请返回重试');
      return;
    }
    
    if (!answers || Object.keys(answers).length === 0) {
      logger.error('Result', '获取答案失败');
      showError('未找到答案数据，请返回重新作答');
      return;
    }
    
    // 计算得分
    calculateScore();
    
    // 渲染结果
    renderResult();
    
    // 默认显示题目解析模式
    switchMode('explanation');
    
    logger.info('Result', '结果页面初始化成功');
  } catch (error) {
    logger.error('Result', '初始化数据失败', error);
    showError('初始化数据失败，请返回重试');
  }
}

/**
 * 计算得分
 */
function calculateScore() {
  try {
    if (window.questions && typeof window.questions.calculateScore === 'function') {
      // 使用questions模块计算得分
      scoreResult = window.questions.calculateScore(answers);
    } else {
      // 简单计算总分（如果questions模块不可用）
      let totalScore = 0;
      let maxScore = 0;
      const details = [];
      
      questionsData.forEach(question => {
        const answer = answers[question.id];
        let score = 0;
        
        if (answer !== undefined && answer !== null && answer !== '') {
          if (question.type === 'single') {
            score = question.scoreMap[answer] || 0;
          } else if (question.type === 'multiple') {
            const selectedKeys = Object.keys(answer || {});
            selectedKeys.forEach(key => {
              score += question.scoreMap[key] || 0;
            });
          }
        }
        
        totalScore += score;
        maxScore += Math.max(...Object.values(question.scoreMap));
        
        details.push({
          questionId: question.id,
          questionTitle: question.title,
          score: score,
          answer: answer,
          explanation: question.explanation
        });
      });
      
      // 确定等级
      let level = '待提升';
      let description = '目前来看，您的造血干细胞捐献潜力较低，可能由于健康状况、捐献意愿或知识认知等方面存在一些问题。';
      
      if (totalScore >= 80) {
        level = '优秀';
        description = '您具备较高的造血干细胞捐献潜力，若有机会，很适合成为一名造血干细胞捐献者。';
      } else if (totalScore >= 65) {
        level = '良好';
        description = '您有一定的造血干细胞捐献潜力，但可能在某些方面需要进一步了解和完善。';
      } else if (totalScore >= 50) {
        level = '一般';
        description = '您的造血干细胞捐献潜力一般，建议您更深入地了解相关知识，再考虑是否成为捐献者。';
      }
      
      scoreResult = {
        totalScore,
        maxScore,
        level,
        description,
        details
      };
    }
    
    logger.info('Result', '计算得分完成', { 
      totalScore: scoreResult.totalScore, 
      maxScore: scoreResult.maxScore, 
      level: scoreResult.level 
    });
  } catch (error) {
    logger.error('Result', '计算得分失败', error);
    showError('计算得分失败，请返回重试');
  }
}

/**
 * 渲染结果
 */
function renderResult() {
  if (!scoreResult) return;
  
  // 渲染总分和等级
  const scoreElement = document.getElementById('totalScore');
  const maxScoreElement = document.getElementById('maxScore');
  const levelElement = document.getElementById('levelText');
  const descriptionElement = document.getElementById('levelDesc');
  
  if (scoreElement) {
    scoreElement.textContent = scoreResult.totalScore;
  }
  
  if (maxScoreElement) {
    maxScoreElement.textContent = scoreResult.maxScore;
  }
  
  if (levelElement) {
    levelElement.textContent = scoreResult.level;
  }
  
  if (descriptionElement) {
    descriptionElement.textContent = scoreResult.description;
  }
}

/**
 * 切换显示模式
 * @param {string} mode - 模式名称：'explanation' 或 'ai'
 */
function switchMode(mode) {
  currentMode = mode;
  logger.info('Result', '切换显示模式', { mode });
  
  // 更新模式按钮样式
  const explanationModeBtn = document.getElementById('explanationMode');
  const aiModeBtn = document.getElementById('aiMode');
  
  if (explanationModeBtn) {
    explanationModeBtn.classList.toggle('active', mode === 'explanation');
  }
  
  if (aiModeBtn) {
    aiModeBtn.classList.toggle('active', mode === 'ai');
  }
  
  // 显示/隐藏相应内容
  const explanationContainer = document.getElementById('explanationContainer');
  const aiContainer = document.getElementById('aiContainer');
  
  if (explanationContainer) {
    explanationContainer.style.display = mode === 'explanation' ? 'block' : 'none';
    
    // 如果是题目解析模式，渲染题目解析
    if (mode === 'explanation' && explanationContainer.children.length === 0) {
      renderExplanations(explanationContainer);
    }
  }
  
  if (aiContainer) {
    aiContainer.style.display = mode === 'ai' ? 'block' : 'none';
    
    // 如果是AI解析模式，显示AI解析内容
    if (mode === 'ai') {
      renderAIAnalysis(aiContainer);
    }
  }
}

/**
 * 渲染题目解析
 * @param {HTMLElement} container - 容器元素
 */
function renderExplanations(container) {
  if (!scoreResult || !scoreResult.details) return;
  
  // 清空容器
  container.innerHTML = '';
  
  // 创建题目解析列表
  const explanationList = document.createElement('div');
  explanationList.className = 'explanation-list';
  
  // 按题目ID排序
  const sortedDetails = [...scoreResult.details].sort((a, b) => a.questionId - b.questionId);
  
  // 遍历题目详情
  sortedDetails.forEach(detail => {
    const question = questionsData.find(q => q.id === detail.questionId);
    if (!question) return;
    
    // 创建题目项
    const itemElement = document.createElement('div');
    itemElement.className = 'explanation-item';
    
    // 题目标题和得分
    const titleElement = document.createElement('div');
    titleElement.className = 'explanation-title';
    titleElement.innerHTML = `<span>${question.id}. ${question.title}</span> <span class="score">得分：${detail.score}</span>`;
    itemElement.appendChild(titleElement);
    
    // 用户选择
    const answerElement = document.createElement('div');
    answerElement.className = 'explanation-answer';
    
    if (question.type === 'single') {
      const selectedOption = question.options.find(opt => opt.key === detail.answer);
      answerElement.textContent = `您的选择：${selectedOption ? selectedOption.text : '未作答'}`;
    } else if (question.type === 'multiple') {
      const selectedKeys = Object.keys(detail.answer || {});
      const selectedOptions = question.options
        .filter(opt => selectedKeys.includes(opt.key))
        .map(opt => opt.text);
      answerElement.textContent = `您的选择：${selectedOptions.length > 0 ? selectedOptions.join('、') : '未作答'}`;
    } else if (question.type === 'text') {
      answerElement.textContent = `您的回答：${detail.answer || '未作答'}`;
    }
    
    itemElement.appendChild(answerElement);
    
    // 解析
    const explanationElement = document.createElement('div');
    explanationElement.className = 'explanation-content';
    explanationElement.textContent = question.explanation || '暂无解析';
    itemElement.appendChild(explanationElement);
    
    explanationList.appendChild(itemElement);
  });
  
  container.appendChild(explanationList);
}

/**
 * 渲染AI解析
 * @param {HTMLElement} container - 容器元素
 */
function renderAIAnalysis(container) {
  // 清空容器
  container.innerHTML = '';
  
  // 创建AI解析内容
  const aiContent = document.createElement('div');
  aiContent.className = 'ai-content';
  
  // 在Web版本中，我们暂时不提供真正的AI解析功能
  // 这里只是一个占位显示
  aiContent.innerHTML = `
    <div class="ai-placeholder">
      <h3>AI解析功能</h3>
      <p>在Web版本中，暂不提供AI智能解析功能。</p>
      <p>您可以查看"题目解析"标签页，了解每道题的详细解释。</p>
    </div>
  `;
  
  container.appendChild(aiContent);
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
  alert(message);
}