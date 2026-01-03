-- 为 work_record 表添加 token 使用量字段
-- 用于记录每次工作的 token 消耗情况

ALTER TABLE work_record
ADD COLUMN last_prompt_tokens INT DEFAULT 0 COMMENT '最后一次请求的输入token数',
ADD COLUMN last_completion_tokens INT DEFAULT 0 COMMENT '最后一次请求的输出token数',
ADD COLUMN total_prompt_tokens INT DEFAULT 0 COMMENT '该工作累计输入token数',
ADD COLUMN total_completion_tokens INT DEFAULT 0 COMMENT '该工作累计输出token数';

-- 添加索引以提高查询效率
CREATE INDEX idx_work_session_id ON work_record (session_id);

