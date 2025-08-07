// index.js
Page({
  data: {
    
  },

  onLoad: function() {
    
  },

  // 开始问卷
  startSurvey: function() {
    wx.navigateTo({
      url: '/pages/survey/survey'
    })
  }
})
