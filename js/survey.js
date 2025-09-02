/**
 * survey.js
 * 问卷页面JavaScript逻辑
 * 
 * 注意：此文件依赖于logger.js和storage.js先加载
 */

// 使用全局日志模块和存储模块

// 全局变量
let answers = {};
let currentQuestionIndex = 0;
let questionsData = []; // 存储从questions模块获取的题目数据

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 记录页面生命周期
  logger.info('Survey', '页面加载完成');
  
  // 初始化问题数据
  initQuestions();
  

  
  // 绑定提交按钮事件
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
  }
});

/**
 * 初始化问题数据
 */
function initQuestions() {
  try {
    // 从全局questions对象获取所有问题
    if (window.questions && typeof window.questions.getAllQuestions === 'function') {
      questionsData = window.questions.getAllQuestions();
    } else {
      // 如果全局对象不可用，尝试从storage获取
      questionsData = storage.getStorage('questions', []);
    }
    
    if (!questionsData || questionsData.length === 0) {
      logger.error('Survey', '获取问题失败');
      showError('获取问题数据失败，请刷新页面重试');
      return;
    }
    
    logger.info('Survey', '问题数据初始化成功', { count: questionsData.length });
    
    // 初始化答案对象
    answers = storage.getStorage('draft_answers', {});
    
    // 渲染第一个问题
    renderQuestion(0);
    
    // 更新进度指示器
    updateProgress();
    
    // 初始化提交按钮状态（默认隐藏）
    updateSubmitButtonVisibility();
  } catch (error) {
    logger.error('Survey', '初始化问题数据失败', error);
    showError('初始化问题数据失败，请刷新页面重试');
  }
}

/**
 * 渲染问题
 * @param {number} index - 问题索引
 */
function renderQuestion(index) {
  if (index < 0 || index >= questionsData.length) {
    logger.warn('Survey', '问题索引超出范围', { index });
    return;
  }
  
  currentQuestionIndex = index;
  const question = questionsData[index];
  
  // 获取问题容器
  const questionContainer = document.getElementById('questionsContainer');
  if (!questionContainer) return;
  
  // 清空容器
  questionContainer.innerHTML = '';
  
  // 创建问题标题
  const titleElement = document.createElement('div');
  titleElement.className = 'question-title';
  titleElement.textContent = `${index + 1}. ${question.title}`;
  questionContainer.appendChild(titleElement);
  
  // 根据问题类型渲染不同的选项
  if (question.type === 'single') {
    renderSingleChoice(questionContainer, question);
  } else if (question.type === 'multiple') {
    renderMultipleChoice(questionContainer, question);
  } else if (question.type === 'text') {
    renderTextInput(questionContainer, question);
  }
  
  // 添加上一题/下一题按钮到底部容器
  renderNavigationButtons();
  
  // 更新进度指示器
  updateProgress();
}

/**
 * 渲染单选题
 * @param {HTMLElement} container - 容器元素
 * @param {Object} question - 问题对象
 */
function renderSingleChoice(container, question) {
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-container';
  
  question.options.forEach(option => {
    const optionElement = document.createElement('div');
    optionElement.className = 'option-item';
    
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = `question_${question.id}`;
    radioInput.value = option.key;
    radioInput.id = `option_${question.id}_${option.key}`;
    
    // 如果已有答案，设置选中状态
    if (answers[question.id] === option.key) {
      radioInput.checked = true;
    }
    
    // 添加事件监听
    radioInput.addEventListener('change', function() {
      if (this.checked) {
        answers[question.id] = option.key;
        storage.setStorage('draft_answers', answers);
        logger.debug('Survey', '保存单选答案', { questionId: question.id, answer: option.key });
        // 更新提交按钮显示状态
        updateSubmitButtonVisibility();
      }
    });
    
    const label = document.createElement('label');
    label.htmlFor = `option_${question.id}_${option.key}`;
    label.textContent = option.text;
    
    optionElement.appendChild(radioInput);
    optionElement.appendChild(label);
    optionsContainer.appendChild(optionElement);
  });
  
  container.appendChild(optionsContainer);
}

/**
 * 渲染多选题
 * @param {HTMLElement} container - 容器元素
 * @param {Object} question - 问题对象
 */
function renderMultipleChoice(container, question) {
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options-container';
  
  question.options.forEach(option => {
    const optionElement = document.createElement('div');
    optionElement.className = 'option-item';
    
    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.name = `question_${question.id}`;
    checkboxInput.value = option.key;
    checkboxInput.id = `option_${question.id}_${option.key}`;
    
    // 如果已有答案，设置选中状态
    if (answers[question.id] && answers[question.id][option.key]) {
      checkboxInput.checked = true;
    }
    
    // 添加事件监听
    checkboxInput.addEventListener('change', function() {
      if (!answers[question.id]) {
        answers[question.id] = {};
      }
      
      if (this.checked) {
        answers[question.id][option.key] = true;
      } else {
        delete answers[question.id][option.key];
      }
      
      storage.setStorage('draft_answers', answers);
      logger.debug('Survey', '保存多选答案', { questionId: question.id, answer: answers[question.id] });
      // 更新提交按钮显示状态
      updateSubmitButtonVisibility();
    });
    
    const label = document.createElement('label');
    label.htmlFor = `option_${question.id}_${option.key}`;
    label.textContent = option.text;
    
    optionElement.appendChild(checkboxInput);
    optionElement.appendChild(label);
    optionsContainer.appendChild(optionElement);
  });
  
  container.appendChild(optionsContainer);
}

/**
 * 渲染文本输入题
 * @param {HTMLElement} container - 容器元素
 * @param {Object} question - 问题对象
 */
function renderTextInput(container, question) {
  const inputContainer = document.createElement('div');
  inputContainer.className = 'text-input-container';
  
  const textInput = document.createElement('textarea');
  textInput.className = 'text-input';
  textInput.placeholder = '请输入您的回答...';
  textInput.id = `question_${question.id}`;
  
  // 如果已有答案，填充内容
  if (answers[question.id]) {
    textInput.value = answers[question.id];
  }
  
  // 添加事件监听
  textInput.addEventListener('input', function() {
    answers[question.id] = this.value;
    storage.setStorage('draft_answers', answers);
    logger.debug('Survey', '保存文本答案', { questionId: question.id, answer: this.value });
    // 更新提交按钮显示状态
    updateSubmitButtonVisibility();
  });
  
  inputContainer.appendChild(textInput);
  container.appendChild(inputContainer);
}

/**
 * 渲染导航按钮（上一题/下一题）
 * 将导航按钮放置在底部按钮容器中，与提交按钮共享位置
 */
function renderNavigationButtons() {
  // 获取底部按钮容器
  const bottomContainer = document.querySelector('.bottom-button-container');
  if (!bottomContainer) return;
  
  // 清除现有的导航按钮
  const existingNav = bottomContainer.querySelector('.question-nav');
  if (existingNav) {
    existingNav.remove();
  }
  
  // 创建导航容器
  const navContainer = document.createElement('div');
  navContainer.className = 'question-nav';
  
  // 上一题按钮
  if (currentQuestionIndex > 0) {
    const prevButton = document.createElement('button');
    prevButton.className = 'btn-secondary';
    prevButton.textContent = '上一题';
    prevButton.addEventListener('click', function() {
      renderQuestion(currentQuestionIndex - 1);
    });
    navContainer.appendChild(prevButton);
  }
  
  // 下一题按钮
  if (currentQuestionIndex < questionsData.length - 1) {
    const nextButton = document.createElement('button');
    nextButton.className = 'btn-primary';
    nextButton.textContent = '下一题';
    nextButton.addEventListener('click', function() {
      renderQuestion(currentQuestionIndex + 1);
    });
    navContainer.appendChild(nextButton);
  }
  
  // 将导航容器添加到底部容器中
  bottomContainer.appendChild(navContainer);
}

/**
 * 更新进度指示器
 */
function updateProgress() {
  const completedCountElement = document.getElementById('completedCount');
  const totalCountElement = document.getElementById('totalCount');
  const progressFillElement = document.getElementById('progressFill');
  
  if (completedCountElement) {
    completedCountElement.textContent = currentQuestionIndex + 1;
  }
  
  if (totalCountElement) {
    totalCountElement.textContent = questionsData.length;
  }
  
  if (progressFillElement) {
    const progress = Math.round(((currentQuestionIndex + 1) / questionsData.length) * 100);
    progressFillElement.style.width = `${progress}%`;
  }
  
  // 检查是否显示提交按钮
  updateSubmitButtonVisibility();
}

/**
 * 更新提交按钮和导航按钮的显示状态
 * 只有当所有题目都回答完毕时才显示提交按钮，否则显示导航按钮
 */
function updateSubmitButtonVisibility() {
  const submitBtn = document.getElementById('submitBtn');
  const navContainer = document.querySelector('.question-nav');
  if (!submitBtn) return;
  
  const remaining = calculateRemainingQuestions();
  if (remaining === 0) {
    // 所有题目都已回答，显示提交按钮，隐藏导航按钮
    submitBtn.style.display = 'flex';
    if (navContainer) {
      navContainer.style.display = 'none';
    }
    logger.info('Survey', '所有题目已完成，显示提交按钮');
  } else {
    // 还有未回答的题目，隐藏提交按钮，显示导航按钮
    submitBtn.style.display = 'none';
    if (navContainer) {
      navContainer.style.display = 'flex';
    }
  }
}

/**
 * 计算剩余未答题数量
 * @returns {number} 未答题数量
 */
function calculateRemainingQuestions() {
  let remaining = 0;
  
  questionsData.forEach(question => {
    const answer = answers[question.id];
    if (answer === undefined || answer === null || answer === '') {
      remaining++;
    } else if (question.type === 'multiple' && Object.keys(answer).length === 0) {
      remaining++;
    }
  });
  
  return remaining;
}

/**
 * 处理问卷提交
 */
function handleSubmit() {
  logger.info('Survey', '点击提交问卷按钮');
  
  // 检查是否有未答题
  const remaining = calculateRemainingQuestions();
  if (remaining > 0) {
    if (!confirm(`还有${remaining}道题未回答，确定要提交吗？`)) {
      return;
    }
  }
  
  try {
    // 保存答案到本地存储
    storage.setStorage('survey_answers', answers);
    logger.info('Survey', '问卷提交成功', { answerCount: Object.keys(answers).length });
    
    // 清除草稿
    storage.setStorage('draft_answers', {});
    
    // 跳转到结果页
    window.location.href = 'result.html';
  } catch (error) {
    logger.error('Survey', '问卷提交失败', error);
    showError('提交失败，请重试');
  }
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
  alert(message);
}