-- 问卷数据库表结构设计
-- 创建数据库
CREATE DATABASE IF NOT EXISTS survey_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE survey_db;

-- 问卷结果表
CREATE TABLE IF NOT EXISTS survey_results (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    phone VARCHAR(20) NOT NULL COMMENT '用户手机号码',
    answers JSON COMMENT '用户答题数据（JSON格式）',
    total_score INT NOT NULL COMMENT '问卷总分',
    percentage DECIMAL(5,2) DEFAULT 0 COMMENT '得分率（百分比）',
    section1_score INT NOT NULL COMMENT '第一部分得分',
    section2_score INT NOT NULL COMMENT '第二部分得分', 
    section3_score INT NOT NULL COMMENT '第三部分得分',
    ai_analysis TEXT COMMENT 'AI解析内容',
    start_time TIMESTAMP NOT NULL COMMENT '问卷开始时间',
    end_time TIMESTAMP NOT NULL COMMENT '问卷结束时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    -- 索引
    INDEX idx_phone (phone),
    INDEX idx_created_at (created_at),
    INDEX idx_total_score (total_score),
    INDEX idx_percentage (percentage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='问卷结果数据表';

-- 扩展：摇一摇密码与公益进度（为了兼容，直接追加到原问卷表）
ALTER TABLE survey_results 
  ADD COLUMN password_hash VARCHAR(255) NULL COMMENT '摇一摇功能密码的哈希（bcrypt）' AFTER phone;
ALTER TABLE survey_results 
  ADD COLUMN public_progress JSON NULL COMMENT '公益互动进度（如累计天数、勋章数等），前端按需解析' AFTER ai_analysis;

-- 新增：公益祝福内容表（摇一摇）
CREATE TABLE IF NOT EXISTS blessings (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    phone VARCHAR(20) NOT NULL COMMENT '发布者手机号（沿用问卷手机号体系）',
    title VARCHAR(100) NOT NULL COMMENT '祝福名称/标题',
    tag VARCHAR(50) DEFAULT NULL COMMENT '主题标签（如急救故事/献血日记/灾区祝福）',
    content TEXT NOT NULL COMMENT '祝福语文本',
    image_url VARCHAR(255) DEFAULT NULL COMMENT '主题照片存储位置（URL或相对路径）',
    audio_url VARCHAR(255) DEFAULT NULL COMMENT '语音存储位置（URL或相对路径）',
    review_status ENUM('pending','approved','rejected') DEFAULT 'pending' COMMENT '审核状态',
    likes INT DEFAULT 0 COMMENT '点赞数',
    medals INT DEFAULT 0 COMMENT '爱心勋章数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_phone (phone),
    INDEX idx_status (review_status),
    INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公益祝福内容表（摇一摇）';

-- 插入示例数据（可选）
-- INSERT INTO survey_results (phone, answers, total_score, percentage, section1_score, section2_score, section3_score, ai_analysis, start_time, end_time) 
-- VALUES ('13800138000', '{"q1":"A","q2":"B"}', 85, 85.0, 30, 25, 30, '根据您的答题情况，建议加强...', '2024-01-20 10:00:00', '2024-01-20 10:15:00');