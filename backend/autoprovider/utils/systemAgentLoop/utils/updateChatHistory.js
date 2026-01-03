const pool = require("../../../db");
const { v4: uuidv4 } = require("uuid");
const recordErrorLog = require("../../recordErrorLog");
/**
 * 初始化对话记录：插入user消息和空的ai消息
 * @param {Object} params
 * @param {string} params.sessionId - 会话ID
 * @param {string} params.userPrompt - 用户消息内容
 * @param {string} [params.dialogueSender] - 对话发送者：'client' 或 'system'，默认为 'client'
 * @param {Object} params.connection - 数据库连接
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
const initDialogueRecord = async ({
  sessionId,
  userPrompt,
  dialogueSender = "client",
  connection,
}) => {
  if (!sessionId || typeof sessionId !== "string") {
    return {
      status: 1,
      message: "会话ID不能为空",
      data: "fail",
    };
  }

  if (!userPrompt || typeof userPrompt !== "string") {
    return {
      status: 1,
      message: "用户消息内容不能为空",
      data: "fail",
    };
  }

  if (!connection) {
    return {
      status: 1,
      message: "数据库连接不能为空",
      data: "fail",
    };
  }

  try {
    // 1. 获取当前会话的最大 dialogue_index
    const getMaxIndexSql = `SELECT MAX(dialogue_index) as max_index 
      FROM dialogue_record 
      WHERE session_id = ?`;

    const [maxIndexRows] = await connection.query(getMaxIndexSql, [sessionId]);
    const nextIndex =
      (maxIndexRows[0]?.max_index !== null ? maxIndexRows[0].max_index : -1) +
      1;

    // 2. 插入用户消息
    const userDialogueId = uuidv4();
    const insertUserDialogueSql = `INSERT INTO dialogue_record 
      (dialogue_id, session_id, create_time, role_type, content, dialogue_status, dialogue_index, dialogue_sender) 
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`;

    await connection.query(insertUserDialogueSql, [
      userDialogueId,
      sessionId,
      "user",
      userPrompt,
      0,
      nextIndex,
      dialogueSender,
    ]);

    // 3. 插入空的AI消息（占位，等待后续更新）
    const aiDialogueId = uuidv4();
    const insertAiDialogueSql = `INSERT INTO dialogue_record 
      (dialogue_id, session_id, create_time, role_type, content, dialogue_status, dialogue_index, dialogue_sender) 
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`;

    await connection.query(insertAiDialogueSql, [
      aiDialogueId,
      sessionId,
      "ai",
      "", // 空内容，等待更新
      0,
      nextIndex + 1,
      null,
    ]);

    return {
      status: 0,
      message: "对话记录初始化成功",
      data: {
        userDialogueId,
        aiDialogueId,
        nextIndex,
      },
    };
  } catch (error) {
    console.error("initDialogueRecord执行失败:", error);
    return {
      status: 1,
      message: error.message || "初始化对话记录失败",
      data: "fail",
    };
  }
};

/**
 * 更新AI对话内容
 * @param {Object} params
 * @param {string} params.dialogueId - 对话ID
 * @param {string} params.sessionId - 会话ID
 * @param {string} params.aiResponse - AI回复内容
 * @param {string} [params.toolCalls] - tool_calls JSON字符串（可选）
 * @param {Object} params.connection - 数据库连接
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
const updateAiDialogue = async ({
  dialogueId,
  sessionId,
  aiResponse,
  toolCalls,
  connection,
}) => {
  if (!dialogueId) {
    recordErrorLog("dialogue_id 不能为空", "updateAiDialogue");
    return {
      status: 1,
      message: "对话ID不能为空",
      data: "fail",
    };
  }

  if (!sessionId) {
    recordErrorLog("session_id 不能为空", "updateAiDialogue");
    return {
      status: 1,
      message: "会话ID不能为空",
      data: "fail",
    };
  }

  if (!aiResponse) {
    recordErrorLog("ai_response 不能为空", "updateAiDialogue");
    return {
      status: 1,
      message: "AI回复内容不能为空",
      data: "fail",
    };
  }

  // 如果未传入连接则自建，并在 finally 里负责释放
  let shouldReleaseConnection = false;
  if (!connection) {
    connection = await pool.getConnection();
    shouldReleaseConnection = true;
  }

  try {
    let updateSql;
    let params;

    if (toolCalls) {
      // 如果有 tool_calls，保存到 extend_info
      const extendInfo = JSON.stringify({ tool_calls: JSON.parse(toolCalls) });
      updateSql = `UPDATE dialogue_record 
        SET content = ?, extend_info = ?
        WHERE dialogue_id = ? AND session_id = ? AND role_type = 'ai'`;
      params = [aiResponse, extendInfo, dialogueId, sessionId];
    } else {
      // 没有 tool_calls，只更新 content
      updateSql = `UPDATE dialogue_record 
        SET content = ? 
        WHERE dialogue_id = ? AND session_id = ? AND role_type = 'ai'`;
      params = [aiResponse, dialogueId, sessionId];
    }

    await connection.query(updateSql, params);

    return {
      status: 0,
      message: "AI对话内容更新成功",
      data: {
        dialogueId,
      },
    };
  } catch (error) {
    console.error("updateAiDialogue执行失败:", error);
    return {
      status: 1,
      message: error.message || "更新AI对话内容失败",
      data: "fail",
    };
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

/**
 * 更新对话历史到数据库
 * @param {Object} params
 * @param {string} params.sessionId - 会话ID
 * @param {string} [params.userPrompt] - 用户消息内容（与aiResponse一起使用时）
 * @param {string} [params.aiResponse] - AI回复内容（与userPrompt一起使用时）
 * @param {string} [params.toolContent] - 工具返回内容（单独插入tool类型消息时使用）
 * @param {string} [params.toolCallId] - 工具调用ID（tool消息必需）
 * @param {string} [params.toolName] - 工具名称（tool消息可选）
 * @param {string} [params.dialogueSender] - 对话发送者：'client'（客户端）或 'system'（系统），默认为 'client'
 * @param {Object} [params.connection] - 可选的数据库连接（如果提供则使用该连接，否则创建新连接）
 * @param {Array} [params.messages] - 消息数组（兼容旧格式，如果提供则按旧逻辑处理）
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
const updateChatHistory = async ({
  sessionId,
  userPrompt,
  aiResponse,
  toolContent,
  toolCallId,
  toolName,
  dialogueSender = "client",
  connection = null,
  messages = null,
}) => {
  // 参数验证
  if (!sessionId || typeof sessionId !== "string") {
    return {
      status: 1,
      message: "会话ID不能为空",
      data: "fail",
    };
  }

  // 兼容旧格式：如果传入 messages 数组（来自 combyToolResponse）
  if (messages && Array.isArray(messages) && messages.length > 0) {
    const message = messages[0];
    if (message.role === "tool" && message.content) {
      return await updateChatHistory({
        sessionId,
        toolContent: message.content,
        toolCallId: message.tool_call_id || "unknown",
        toolName: message.tool_name,
        dialogueSender: "system",
        connection,
      });
    }
  }

  // 如果只插入 tool 类型的消息
  if (toolContent) {
    // 如果没有传入连接，则创建新连接
    const shouldReleaseConnection = !connection;
    if (!connection) {
      connection = await pool.getConnection();
    }

    try {
      // 获取当前会话的最大 dialogue_index
      const getMaxIndexSql = `SELECT MAX(dialogue_index) as max_index 
        FROM dialogue_record 
        WHERE session_id = ?`;

      const [maxIndexRows] = await connection.query(getMaxIndexSql, [
        sessionId,
      ]);
      const nextIndex =
        (maxIndexRows[0]?.max_index !== null ? maxIndexRows[0].max_index : -1) +
        1;

      // 构建 tool 消息的扩展信息（包含 tool_call_id 和 tool_name）
      const toolMetadata = JSON.stringify({
        tool_call_id: toolCallId || "unknown",
        tool_name: toolName || "unknown",
      });

      // 插入 tool 消息
      const toolDialogueId = uuidv4();
      const insertToolDialogueSql = `INSERT INTO dialogue_record 
        (dialogue_id, session_id, create_time, role_type, content, dialogue_status, dialogue_index, dialogue_sender, extend_info) 
        VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)`;

      await connection.query(insertToolDialogueSql, [
        toolDialogueId,
        sessionId,
        "tool", // role_type: 'tool'
        toolContent,
        0, // dialogue_status: 0-正常使用
        nextIndex,
        "system", // dialogue_sender: tool消息的sender为'system'
        toolMetadata, // 将 tool_call_id 和 tool_name 保存到 extend_info 字段
      ]);

      return {
        status: 0,
        message: "工具消息更新成功",
        data: {
          toolDialogueId,
          nextIndex,
        },
      };
    } catch (error) {
      console.error("updateChatHistory执行失败:", error);
      return {
        status: 1,
        message: error.message || "更新对话历史失败",
        data: "fail",
      };
    } finally {
      // 如果是我们创建的连接，需要释放
      if (shouldReleaseConnection && connection) {
        connection.release();
      }
    }
  }

  // 原有逻辑：插入 user 和 ai 消息
  if (!userPrompt || typeof userPrompt !== "string") {
    return {
      status: 1,
      message: "用户消息内容不能为空",
      data: "fail",
    };
  }

  if (!aiResponse || typeof aiResponse !== "string") {
    return {
      status: 1,
      message: "AI回复内容不能为空",
      data: "fail",
    };
  }

  // 如果没有传入连接，则创建新连接
  const shouldReleaseConnection = !connection;
  if (!connection) {
    connection = await pool.getConnection();
  }

  try {
    // 1. 获取当前会话的最大 dialogue_index
    const getMaxIndexSql = `SELECT MAX(dialogue_index) as max_index 
      FROM dialogue_record 
      WHERE session_id = ?`;

    const [maxIndexRows] = await connection.query(getMaxIndexSql, [sessionId]);
    const nextIndex =
      (maxIndexRows[0]?.max_index !== null ? maxIndexRows[0].max_index : -1) +
      1;

    // 2. 插入用户消息
    const userDialogueId = uuidv4();
    const insertUserDialogueSql = `INSERT INTO dialogue_record 
      (dialogue_id, session_id, create_time, role_type, content, dialogue_status, dialogue_index, dialogue_sender) 
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`;

    await connection.query(insertUserDialogueSql, [
      userDialogueId,
      sessionId,
      "user",
      userPrompt,
      0, // dialogue_status: 0-正常使用
      nextIndex,
      dialogueSender, // dialogue_sender: 'client' 或 'system'
    ]);

    // 3. 插入AI回复消息
    const aiDialogueId = uuidv4();
    const insertAiDialogueSql = `INSERT INTO dialogue_record 
      (dialogue_id, session_id, create_time, role_type, content, dialogue_status, dialogue_index, dialogue_sender) 
      VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`;

    await connection.query(insertAiDialogueSql, [
      aiDialogueId,
      sessionId,
      "ai",
      aiResponse,
      0, // dialogue_status: 0-正常使用
      nextIndex + 1,
      null, // dialogue_sender: AI消息为null
    ]);

    return {
      status: 0,
      message: "对话历史更新成功",
      data: {
        userDialogueId,
        aiDialogueId,
        nextIndex,
      },
    };
  } catch (error) {
    console.error("updateChatHistory执行失败:", error);
    return {
      status: 1,
      message: error.message || "更新对话历史失败",
      data: "fail",
    };
  } finally {
    // 如果是我们创建的连接，需要释放
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

module.exports = updateChatHistory;
module.exports.initDialogueRecord = initDialogueRecord;
module.exports.updateAiDialogue = updateAiDialogue;
