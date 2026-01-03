-- 为 dialogue_record 表添加 extend_info 字段
-- 用于存储工具调用的元数据（tool_call_id, tool_name 等）
-- 支持 AI 一次调用多个函数时，每个函数返回都有独立的记录和元数据

ALTER TABLE dialogue_record 
ADD COLUMN extend_info TEXT NULL COMMENT '扩展信息，用于存储工具调用的元数据（JSON格式）' 
AFTER dialogue_sender;

-- 执行后的完整表结构参考：
-- CREATE TABLE dialogue_record
-- (
--     dialogue_id     VARCHAR(50)                        NOT NULL COMMENT '对话ID，由系统生成唯一标识'
--         PRIMARY KEY,
--     session_id      VARCHAR(50)                        NOT NULL COMMENT '所属会话ID',
--     create_time     DATETIME DEFAULT CURRENT_TIMESTAMP NULL COMMENT '创建时间',
--     role_type       VARCHAR(20)                        NOT NULL COMMENT '发起角色：user-用户，ai-AI，tool-工具',
--     content         TEXT                               NOT NULL COMMENT '对话内容',
--     dialogue_status TINYINT  DEFAULT 0                 NULL COMMENT '对话状态：0-正常使用，1-已撤回',
--     dialogue_index  INT                                NOT NULL COMMENT '对话索引',
--     dialogue_sender VARCHAR(20)                        NULL COMMENT '发送这条消息的平台',
--     extend_info     TEXT                               NULL COMMENT '扩展信息，用于存储工具调用的元数据（JSON格式）'
-- )
-- COMMENT '对话记录表' COLLATE = utf8mb4_unicode_ci;

