# 问卷调查Web应用

## 项目简介
本项目为一个简易的问卷调查Web应用，包含首页、问卷填写页与结果页，演示了题目选择、数据存储与结果展示等流程。原项目是基于微信小程序开发的，现已转换为纯Web应用。

## 技术栈
- HTML5/CSS3/JavaScript
- 不依赖第三方框架库

## 目录结构
- index.html：首页，进入问卷
- survey.html：问卷填写逻辑
- result.html：结果展示与操作
- css/：样式文件目录
  - style.css：全局样式
  - index.css：首页样式
  - survey.css：问卷页样式
  - result.css：结果页样式
  - navigation.css：导航栏样式
- js/：JavaScript文件目录
  - app.js：全局脚本
  - index.js：首页脚本
  - survey.js：问卷页脚本
  - result.js：结果页脚本
  - navigation.js：导航栏组件脚本
- utils/：工具模块目录
  - logger.js：项目内置日志模块
  - questions.js：问题库和评分规则
  - storage.js：本地存储工具

## 主要功能与数据流
1. 用户在问卷页完成单选、多选、文本输入等题目。
2. 提交后将答案写入本地存储（localStorage，key：`surveyAnswers`）。
3. 结果页从本地读取答案，进行格式化处理并展示。

## 开发与运行
1. 直接在浏览器中打开index.html即可运行应用。
2. 也可以使用任何Web服务器（如Live Server）来提供更好的开发体验。

## 代码规范
- 所有新增代码均包含中文注释，聚焦“为什么/怎么做”。
- 日志覆盖关键流程，便于排查问题与回溯用户操作路径。

## 日志记录说明（utils/logger.js）
- 支持级别：`error` < `warn` < `info` < `debug`。
- 默认级别为 `info`，可通过本地存储切换：
  - 在控制台执行：`localStorage.setItem('logLevel', 'debug')`。
  - 刷新页面后生效。
- 使用方式：
  - 引入：`const logger = require('路径/utils/logger.js')`
  - 示例：
    - `logger.info('Survey', '提交成功', { count: 4 })`
    - `logger.debug('Survey', '单选', { questionId: 1, optionIndex: 0 })`
    - `logger.captureError('Result', error, { stage: 'load' })`
    - `logger.logPageLifecycle('Index', 'onLoad')`

## 后续规划
- 补充网络请求示例与接口容错
- 增加更多题型与校验规则
- 引入更完善的埋点与可视化报表