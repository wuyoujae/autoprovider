const recordErrorLog = require("../../recordErrorLog");

/**
 * 获取指定 dialogue_id 列表的附件（不含内容）
 * @param {Object} params
 * @param {Object} params.connection
 * @param {string[]} params.dialogueIds
 * @returns {Promise<Map<string, Array<{source_id:string, source_name:string, source_type:string}>>>}
 */
async function getSourcesByDialogues({ connection, dialogueIds }) {
  const resultMap = new Map();
  if (!dialogueIds || dialogueIds.length === 0) return resultMap;

  const placeholders = dialogueIds.map(() => "?").join(",");
  const sql = `
    SELECT dialogue_id, source_id, source_name, source_type
    FROM source_list
    WHERE dialogue_id IN (${placeholders})
      AND source_status = 0
  `;
  const [rows] = await connection.query(sql, dialogueIds);
  rows.forEach((row) => {
    const list = resultMap.get(row.dialogue_id) || [];
    list.push({
      source_id: row.source_id,
      source_name: row.source_name || "未命名文件",
      source_type: row.source_type || "",
    });
    resultMap.set(row.dialogue_id, list);
  });
  return resultMap;
}

/**
 * 获取指定会话下的所有 work 块及其操作记录
 * @param {string} sessionId - 会话 ID
 * @param {Object} connection - 复用的数据库连接
 * @returns {Promise<{status:number,message:string,data:any}>}
 */
async function getSessionOperations(sessionId, connection) {
  try {
    if (!sessionId || typeof sessionId !== "string") {
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

    // 1. 查询会话下所有有效 work
    const getWorksSql = `SELECT 
        work_id,
        create_time
      FROM work_record
      WHERE session_id = ? AND work_status = 0
      ORDER BY create_time ASC`;
    const [workRows] = await connection.query(getWorksSql, [sessionId]);

    if (workRows.length === 0) {
      return {
        status: 0,
        message: "获取会话操作记录成功",
        data: {
          session_id: sessionId,
          works: [],
        },
      };
    }

    const workIds = workRows.map((work) => work.work_id).filter(Boolean);
    const workMap = new Map();
    workRows.forEach((work) => {
      workMap.set(work.work_id, {
        work_id: work.work_id,
        work_create_time: work.create_time,
        user_messages: [],
        operations: [],
      });
    });

    // 2. 查询用户消息（client 发送的 user 消息）
    if (workIds.length > 0) {
      const placeholders = workIds.map(() => "?").join(",");
      const userMessageSql = `SELECT 
          dialogue_id,
          work_id,
          content,
          dialogue_index,
          create_time
        FROM dialogue_record
        WHERE work_id IN (${placeholders})
          AND role_type = 'user'
          AND dialogue_sender = 'client'
          AND dialogue_status = 0
          AND (is_agent_generate IS NULL OR is_agent_generate = 0)
        ORDER BY dialogue_index ASC, create_time ASC`;
      const [userRows] = await connection.query(userMessageSql, workIds);

      // 预取附件元数据
      const dialogueIds = userRows.map((r) => r.dialogue_id).filter(Boolean);
      const sourcesMap = await getSourcesByDialogues({
        connection,
        dialogueIds,
      });

      userRows.forEach((row) => {
        const targetWork = workMap.get(row.work_id);
        if (!targetWork) {
          return;
        }
        targetWork.user_messages.push({
          dialogue_id: row.dialogue_id,
          dialogue_index: row.dialogue_index,
          create_time: row.create_time,
          user_content:
            typeof row.content === "string"
              ? row.content
              : row.content
              ? row.content.toString()
              : "",
          source_lists: sourcesMap.get(row.dialogue_id) || [],
        });
      });
    }

    // 3. 查询所有 operation
    if (workIds.length > 0) {
      const placeholders = workIds.map(() => "?").join(",");
      const operationSql = `SELECT 
          o.operation_id,
          o.operation_code,
          o.operation_method,
          o.operation_index,
          o.create_time AS operation_create_time,
          d.work_id,
          d.dialogue_id,
          d.dialogue_index
        FROM operation_record o
        INNER JOIN dialogue_record d ON o.dialogue_id = d.dialogue_id
        WHERE d.work_id IN (${placeholders})
          AND (d.dialogue_status = 0 OR d.dialogue_status IS NULL)
          AND (o.operation_status = 0 OR o.operation_status IS NULL)
        ORDER BY 
          d.work_id,
          d.dialogue_index ASC,
          CASE WHEN o.operation_index IS NULL THEN 1 ELSE 0 END ASC,
          o.operation_index ASC,
          o.create_time ASC`;
      const [operationRows] = await connection.query(operationSql, workIds);
      operationRows.forEach((row) => {
        const targetWork = workMap.get(row.work_id);
        if (!targetWork) {
          return;
        }
        const normalizedOperationCode =
          typeof row.operation_code === "string"
            ? row.operation_code
            : row.operation_code
            ? row.operation_code.toString()
            : "";

        targetWork.operations.push({
          operation_id: row.operation_id,
          dialogue_id: row.dialogue_id,
          dialogue_index: row.dialogue_index,
          operation_index:
            typeof row.operation_index === "number"
              ? row.operation_index
              : row.operation_index === null
              ? null
              : Number(row.operation_index),
          operation_method: row.operation_method,
          operation_code: normalizedOperationCode,
          create_time: row.operation_create_time,
        });
      });
    }

    // 4. 对每个 work 内的操作再做一次排序，确保顺序稳定
    workMap.forEach((workItem) => {
      workItem.operations.sort((a, b) => {
        if (a.dialogue_index !== b.dialogue_index) {
          return a.dialogue_index - b.dialogue_index;
        }
        const aIndex =
          typeof a.operation_index === "number" ? a.operation_index : Infinity;
        const bIndex =
          typeof b.operation_index === "number" ? b.operation_index : Infinity;
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }
        return new Date(a.create_time) - new Date(b.create_time);
      });

      workItem.user_messages.sort((a, b) => {
        if (a.dialogue_index !== b.dialogue_index) {
          return a.dialogue_index - b.dialogue_index;
        }
        return new Date(a.create_time) - new Date(b.create_time);
      });
    });

    // 5. 按 work 创建时间排序输出
    const works = workRows
      .map((row) => workMap.get(row.work_id))
      .filter(Boolean);

    return {
      status: 0,
      message: "获取会话操作记录成功",
      data: {
        session_id: sessionId,
        works,
      },
    };
  } catch (error) {
    recordErrorLog(error, "getSessionOperationsUtil");
    return {
      status: 1,
      message: "获取会话对话记录失败，服务器内部错误",
      data: "fail",
    };
  }
}

module.exports = getSessionOperations;
