const recordErrorLog = require("../recordErrorLog");
const operationHistoryMatch = require("./operationHistoryMatch");

/**
 * 获取会话的所有对话记录和操作记录
 * @param {string} session_id - 会话ID
 * @param {Object} connection - 数据库连接
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
async function getSessionDialogs(session_id, connection) {
  try {
    // 参数验证
    if (!session_id || typeof session_id !== "string") {
      return {
        status: 1,
        message: "会话ID不能为空",
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

    // 1. 查询该session的所有work，按dialogue_index排序
    const getDialogsSql = `SELECT 
      dialogue_id,
      create_time,
      role_type,
      content,
      dialogue_index,
      dialogue_sender
    FROM dialogue_record
    WHERE session_id = ? AND dialogue_status = 0
    ORDER BY dialogue_index ASC`;

    const [dialogRows] = await connection.query(getDialogsSql, [session_id]);

    if (dialogRows.length === 0) {
      return {
        status: 0,
        message: "获取会话对话记录成功",
        data: {
          dialogs: [],
        },
      };
    }

    // 2. 获取所有AI回复的dialogue_id 和 system发送的user消息的dialogue_id（用于查询operation）
    const dialogueIdsForOperations = dialogRows
      .filter((row) => {
        // AI的对话
        if (row.role_type === "ai") {
          return true;
        }
        // system发送的user消息（这些消息本身不显示，但operations要显示）
        if (row.role_type === "user" && row.dialogue_sender === "system") {
          return true;
        }
        return false;
      })
      .map((row) => row.dialogue_id);

    // 3. 查询所有对话对应的operation，按operation_index和create_time排序
    let operationRows = [];
    if (dialogueIdsForOperations.length > 0) {
      const getOperationsSql = `SELECT 
        dialogue_id,
        operation_code,
        operation_method,
        create_time,
        operation_index
      FROM operation_record
      WHERE dialogue_id IN (${dialogueIdsForOperations
        .map(() => "?")
        .join(",")}) 
        AND operation_status = 0
      ORDER BY 
        CASE WHEN operation_index IS NULL THEN 1 ELSE 0 END ASC,
        operation_index ASC,
        create_time ASC`;

      const [rows] = await connection.query(
        getOperationsSql,
        dialogueIdsForOperations
      );
      operationRows = rows;
    }

    // 4. 将operation按dialogue_id分组
    const operationsByDialogueId = {};
    operationRows.forEach((operation) => {
      if (!operationsByDialogueId[operation.dialogue_id]) {
        operationsByDialogueId[operation.dialogue_id] = [];
      }
      operationsByDialogueId[operation.dialogue_id].push(operation);
    });

    // 5. 构建dialogs数组：
    // - client发送的user消息
    // - system发送的user消息 -> 只展示它的operations，不展示消息本身
    // - ai消息 -> 展示它的operations
    // 所有operations都使用紧跟在client user消息后的第一个AI回复的dialogue_id
    const dialogs = [];
    let lastAiDialogueIdAfterClientUser = null; // 跟踪紧跟在client user消息后的AI回复的dialogue_id
    let previousDialog = null; // 跟踪上一个对话

    dialogRows.forEach((dialog) => {
      // 如果是client发送的user消息，直接添加
      if (dialog.role_type === "user" && dialog.dialogue_sender !== "system") {
        dialogs.push({
          dialogue_id: dialog.dialogue_id,
          create_time: dialog.create_time,
          role_type: dialog.role_type,
          content: dialog.content,
          dialogue_index: dialog.dialogue_index,
        });
        previousDialog = dialog;
        return;
      }

      // 如果是AI消息，判断是否是紧跟在client user消息后的第一个AI回复
      if (dialog.role_type === "ai") {
        // 如果上一个消息是client发送的user消息，更新lastAiDialogueIdAfterClientUser
        if (
          previousDialog &&
          previousDialog.role_type === "user" &&
          previousDialog.dialogue_sender !== "system"
        ) {
          lastAiDialogueIdAfterClientUser = dialog.dialogue_id;
        }

        const operations = operationsByDialogueId[dialog.dialogue_id] || [];

        operations.forEach((operation) => {
          dialogs.push({
            dialogue_id: lastAiDialogueIdAfterClientUser || dialog.dialogue_id, // 使用跟在client user后的AI dialogue_id
            create_time: dialog.create_time,
            role_type: dialog.role_type,
            content: operation.operation_code || "",
            dialogue_index: dialog.dialogue_index,
            operation_index: operation.operation_index,
          });
        });
        previousDialog = dialog;
        return;
      }

      // 如果是system发送的user消息，只添加它的operations，不添加消息本身
      // operations使用lastAiDialogueIdAfterClientUser作为dialogue_id
      if (dialog.role_type === "user" && dialog.dialogue_sender === "system") {
        const operations = operationsByDialogueId[dialog.dialogue_id] || [];

        operations.forEach((operation) => {
          dialogs.push({
            dialogue_id: lastAiDialogueIdAfterClientUser || dialog.dialogue_id, // 使用跟在client user后的AI dialogue_id
            create_time: dialog.create_time,
            role_type: "ai", // 将operations显示为ai的操作
            content: operation.operation_code || "",
            dialogue_index: dialog.dialogue_index,
            operation_index: operation.operation_index,
          });
        });
        previousDialog = dialog;
        return;
      }
    });

    // 6. 将dialogs传递给operationHistoryMatch进行处理
    const matchedResult = await operationHistoryMatch(dialogs);

    return {
      status: 0,
      message: "获取会话对话记录成功",
      data: {
        dialogs: matchedResult,
      },
    };
  } catch (error) {
    recordErrorLog(error, "getSessionDialogs");
    return {
      status: 1,
      message: "获取会话对话记录失败，服务器内部错误",
      data: "fail",
    };
  }
}

module.exports = getSessionDialogs;
