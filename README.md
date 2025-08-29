# 微信小程序问卷示例项目

## 项目简介
本项目为一个简易的问卷小程序，包含首页、问卷填写页与结果页，演示了题目选择、数据存储与结果展示等流程。

## 技术栈
- 小程序原生框架（不依赖第三方库）
- WXML/WXSS/JS

## 目录结构
- app.js / app.json / app.wxss：全局入口与配置
- pages/index：首页，进入问卷
- pages/survey：问卷填写逻辑
- pages/result：结果展示与操作
- components/navigation-bar：自定义导航栏
- utils/logger.js：项目内置日志模块

## 主要功能与数据流
1. 用户在问卷页完成单选、多选、文本输入等题目。
2. 提交后将答案写入本地存储（key：`surveyAnswers`）。
3. 结果页从本地读取答案，进行格式化处理并展示。

## 开发与运行
1. 在微信开发者工具中打开本项目目录 `WX_prj`。
2. 使用对应的 AppID（或体验版 AppID）运行与预览。
3. 代码热重载：保存文件后，开发者工具会自动刷新。

## 代码规范
- 所有新增代码均包含中文注释，聚焦“为什么/怎么做”。
- 日志覆盖关键流程，便于排查问题与回溯用户操作路径。

## 日志记录说明（utils/logger.js）
- 支持级别：`error` < `warn` < `info` < `debug`。
- 默认级别为 `info`，可通过本地存储切换：
  - 在控制台执行：`wx.setStorageSync('logLevel', 'debug')`。
  - 重启小程序后生效。
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