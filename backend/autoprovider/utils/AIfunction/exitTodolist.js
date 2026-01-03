const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");

/**
 * 退出当前会话的待办循环（仅影响本轮工作，不修改待办状态）
 * @param {Object} payload
 * @param {string} [payload.todolist_name] 指定要退出的待办列表名称（可选）
 * @param {string} [payload.reason] 退出原因（可选，用于返回信息）
 * @param {Object} infoObject
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function exitTodolist(payload = {}, infoObject = {}) {
  // 优先使用外部传入连接，未提供则自建并在 finally 释放
  let connection = infoObject.connection;
  let shouldReleaseConnection = false;
  if (!connection) {
    connection = await pool.getConnection();
    shouldReleaseConnection = true;
  }

  try {
    // 参数校验
    const sessionId = infoObject.sessionId;
    const todolistName = payload?.todolist_name;
    const reason = payload?.reason;

    if (!sessionId || typeof sessionId !== "string") {
      return {
        status: 1,
        message: "exit_todolist fail",
        data: {
          error: "sessionId 不能为空",
        },
      };
    }

    if (todolistName && typeof todolistName !== "string") {
      return {
        status: 1,
        message: "exit_todolist fail",
        data: {
          error: "todolist_name 必须是字符串",
        },
      };
    }

    // 查询进行中的待办
    const querySql = `SELECT todolist_id, todolist_name
      FROM todolist
      WHERE session_id = ? AND todolist_status = 0
      ${todolistName ? "AND todolist_name = ?" : ""}`;

    const params = todolistName ? [sessionId, todolistName] : [sessionId];
    const [rows] = await connection.query(querySql, params);

    const hasRunning = rows.length > 0;

    // 标记本轮退出（交由 AgentWork 检查后跳出循环）
    if (hasRunning) {
      infoObject.exitTodolist = true;
    }

    const data = {
      has_running_todolist: hasRunning,
      affected_todolists: rows.map((r) => ({
        todolist_id: r.todolist_id,
        todolist_name: r.todolist_name,
      })),
      reason: reason || undefined,
      summary: {
        total_running: rows.length,
        will_skip_current_workloop: hasRunning,
      },
    };

    const message = hasRunning
      ? "exit_todolist success - 已退出本轮待办循环"
      : "exit_todolist success - 当前无进行中的待办";

    return {
      status: 0,
      message,
      data,
    };
  } catch (error) {
    recordErrorLog(error, "exitTodolist");
    return {
      status: 1,
      message: "exit_todolist fail",
      data: {
        error: error.message || "退出待办循环时发生未知错误",
      },
    };
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
}

module.exports = exitTodolist;

