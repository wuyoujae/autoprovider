const recordErrorLog = require("../recordErrorLog");
const recordOperation = require("../systemAgentLoop/utils/recordOperation");

/**
 * 构建操作记录代码
 * @param {string} functionName - 函数名
 * @param {Array} params - 参数数组
 * @returns {Object} 操作记录对象
 */
const constructOperationCode = (functionName, params) => {
  return {
    functionName,
    params,
  };
};

/**
 * 生成并更新会话名称
 * @param {Object} payload - 函数参数对象
 * @param {string} payload.description - 会话的描述性短语（将被转换为 kebab-case 格式）
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function generateConversationName(payload = {}, infoObject = {}) {
  try {
    // 参数验证
    if (!infoObject.sessionId) {
      return {
        status: 1,
        message: "generateconversationname fail",
        data: {
          error: "会话ID不能为空",
        },
      };
    }

    // 从 payload 中获取参数
    const description = payload?.description;

    if (
      !description ||
      typeof description !== "string" ||
      description.trim() === ""
    ) {
      return {
        status: 1,
        message: "generateconversationname fail",
        data: {
          error: "description 参数不能为空，必须是字符串",
        },
      };
    }

    // 使用 infoObject 中的 connection
    const connection = infoObject?.connection;
    if (!connection) {
      return {
        status: 1,
        message: "generateconversationname fail",
        data: {
          error: "数据库连接不可用",
        },
      };
    }

    // 验证会话是否存在
    const checkSessionSql = `SELECT session_id, session_title 
      FROM session_record 
      WHERE session_id = ? AND session_status = 0`;

    const [sessionRows] = await connection.query(checkSessionSql, [
      infoObject.sessionId,
    ]);

    if (sessionRows.length === 0) {
      return {
        status: 1,
        message: "generateconversationname fail",
        data: {
          error: "会话不存在或已被删除",
        },
      };
    }

    // 使用 description 作为会话标题（AI 已经根据描述生成了 kebab-case 格式的名称）
    const newSessionTitle = description.trim();

    // 更新会话标题
    const updateSessionSql = `UPDATE session_record 
      SET session_title = ? 
      WHERE session_id = ? AND session_status = 0`;

    await connection.query(updateSessionSql, [
      newSessionTitle,
      infoObject.sessionId,
    ]);

    // 记录操作到数据库
    if (infoObject.dialogueId && infoObject.connection) {
      const operationCode = constructOperationCode(
        "generate_conversation_name",
        [
          {
            session_id: infoObject.sessionId,
            new_session_title: newSessionTitle,
          },
        ]
      );
      await recordOperation({
        dialogueId: infoObject.dialogueId,
        operationCode: operationCode,
        operationMethod: "generate_conversation_name",
        operationStatus: 0,
        connection: infoObject.connection,
      });
    }

    // 构建返回数据
    const responseData = {
      session_id: infoObject.sessionId,
      old_session_title: sessionRows[0].session_title,
      new_session_title: newSessionTitle,
    };

    return {
      status: 0,
      message: "generateconversationname success",
      data: responseData,
    };
  } catch (error) {
    recordErrorLog(error, "generateConversationName");
    console.error(
      "[generateConversationName] ❌ 更新会话名称失败:",
      error.message
    );
    return {
      status: 1,
      message: "generateconversationname fail",
      data: {
        error: error.message || "更新会话名称时发生未知错误",
      },
    };
  }
}

module.exports = generateConversationName;
