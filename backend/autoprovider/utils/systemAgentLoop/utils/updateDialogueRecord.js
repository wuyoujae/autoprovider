const pool = require("../../../db");
const { v4: uuidv4 } = require("uuid");
const recordErrorLog = require("../../recordErrorLog");

// create table dialogue_record
// (
//     dialogue_id     varchar(50)                        not null comment '对话ID，由系统生成唯一标识'
//         primary key,
//     create_time     datetime default CURRENT_TIMESTAMP null comment '创建时间',
//     role_type       varchar(20)                        not null comment '发起角色：user-用户，ai-AI，tool-工具调用',
//     content         text                               not null comment '对话内容，如果是tool角色，则是工具调用的结果',
//     dialogue_status tinyint  default 0                 null comment '对话状态：0-正常使用，1-已撤回',
//     dialogue_index  int                                not null comment '对话索引，用于记录对话先后顺序，实现回撤功能',
//     dialogue_sender varchar(20)                        null comment '发送这条消息的平台，client和system，客户端和系统都可以使用user这个role给AI发送消息',
//     tool_call_id    varchar(125)                       null comment '记录工具调用的tools id',
//     work_id         varchar(50)                        null comment '对应的work'
// )
const updateDialogueRecord = async ({
  dialogueId,
  role,
  content,
  dialogue_index,
  dialogue_sender,
  tool_call_id,
  work_id,
  tool_call,
  session_id,
  is_mini_model = 0,
  is_agent_generate = 0,
}) => {
  console.log("记录一下");
  const connection = await pool.getConnection();
  try {
    // if (!dialogueId) {
    //   recordErrorLog("dialogue_id 不能为空", "updateDialogueRecord");
    // }
    if (!role) {
      recordErrorLog("role 不能为空", "updateDialogueRecord");
    }
    if (!content && !tool_call) {
      recordErrorLog(
        "content 和 tool_call 不能同时为空",
        "updateDialogueRecord"
      );
      // 允许 content 为空，只要有 tool_call 即可（针对 assistant role 发起 tool call 的情况）
    }

    await connection.query("use autoprovider_open");
    //   插入一张新记录
    const insertSql = `INSERT INTO dialogue_record (dialogue_id, create_time, role_type, content, dialogue_index, dialogue_sender, tool_call_id, work_id, tool_call, session_id, is_mini_model, is_agent_generate) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      dialogueId,
      role,
      content,
      dialogue_index,
      dialogue_sender,
      tool_call_id,
      work_id,
      tool_call,
      session_id,
      is_mini_model,
      is_agent_generate,
    ];

    // Debug logs

    const result = await connection.query(insertSql, params);

    return {
      status: 0,
      message: "插入对话记录成功",
      data: {
        dialogueId,
      },
    };
  } catch (error) {
    recordErrorLog(error, "updateDialogueRecord 1");
    return {
      status: 1,
      message: "插入对话记录失败",
    };
  } finally {
    // 释放连接
    connection.release();
  }
};

module.exports = updateDialogueRecord;
