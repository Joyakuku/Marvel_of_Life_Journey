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

-- 数据库表结构更新脚本（如果表已存在）
-- ALTER TABLE survey_results ADD COLUMN answers JSON COMMENT '用户答题数据（JSON格式）' AFTER phone;
-- ALTER TABLE survey_results ADD COLUMN percentage DECIMAL(5,2) DEFAULT 0 COMMENT '得分率（百分比）' AFTER total_score;
-- ALTER TABLE survey_results ADD INDEX idx_percentage (percentage);

-- 插入示例数据（可选）
-- INSERT INTO survey_results (phone, answers, total_score, percentage, section1_score, section2_score, section3_score, ai_analysis, start_time, end_time) 
-- VALUES ('13800138000', '{"q1":"A","q2":"B"}', 85, 85.0, 30, 25, 30, '根据您的答题情况，建议加强...', '2024-01-20 10:00:00', '2024-01-20 10:15:00');

-- 查询表结构
-- DESCRIBE survey_results;

-- 查询所有数据
-- SELECT * FROM survey_results ORDER BY created_at DESC;