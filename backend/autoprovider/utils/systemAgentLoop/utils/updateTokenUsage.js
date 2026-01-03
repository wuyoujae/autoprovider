const pool = require("../../../db");
const recordErrorLog = require("../../recordErrorLog");

/**
 * 更新工作记录的 token 使用量
 * @param {Object} params
 * @param {string} params.workId - 工作ID
 * @param {number} params.promptTokens - 输入 token 数量
 * @param {number} params.completionTokens - 输出 token 数量
 * @param {Object} [params.connection] - 可选的数据库连接
 * @returns {Promise<{status: number, message: string}>}
 */
async function updateTokenUsage({
  workId,
  promptTokens,
  completionTokens,
  connection,
}) {
  let shouldReleaseConnection = false;
  let conn = connection;

  try {
    if (!workId) {
      return { status: 1, message: "workId 不能为空" };
    }

    if (!conn) {
      conn = await pool.getConnection();
      shouldReleaseConnection = true;
    }

    await conn.query("use autoprovider_open");

    // 更新 token 使用量
    const updateSql = `
      UPDATE work_record 
      SET 
        last_prompt_tokens = ?,
        last_completion_tokens = ?,
        total_prompt_tokens = total_prompt_tokens + ?,
        total_completion_tokens = total_completion_tokens + ?
      WHERE work_id = ?
    `;

    await conn.query(updateSql, [
      promptTokens || 0,
      completionTokens || 0,
      promptTokens || 0,
      completionTokens || 0,
      workId,
    ]);

    return { status: 0, message: "更新成功" };
  } catch (error) {
    recordErrorLog(error, "updateTokenUsage");
    return { status: 1, message: error.message || "更新 token 使用量失败" };
  } finally {
    if (shouldReleaseConnection && conn) {
      conn.release();
    }
  }
}

/**
 * 获取会话的 token 使用情况
 * @param {string} sessionId - 会话ID
 * @returns {Promise<{status: number, message: string, data: Object}>}
 */
async function getSessionTokenUsage(sessionId) {
  let connection;
  try {
    if (!sessionId) {
      return { status: 1, message: "sessionId 不能为空", data: null };
    }

    connection = await pool.getConnection();
    await connection.query("use autoprovider_open");

    // 获取该会话下最新工作的 token 使用情况
    const querySql = `
      SELECT 
        last_prompt_tokens,
        last_completion_tokens,
        total_prompt_tokens,
        total_completion_tokens
      FROM work_record 
      WHERE session_id = ? AND work_status = 0
      ORDER BY work_index DESC
      LIMIT 1
    `;

    const [rows] = await connection.query(querySql, [sessionId]);

    if (rows.length === 0) {
      return {
        status: 0,
        message: "暂无使用记录",
        data: {
          last_prompt_tokens: 0,
          last_completion_tokens: 0,
          total_prompt_tokens: 0,
          total_completion_tokens: 0,
        },
      };
    }

    return {
      status: 0,
      message: "获取成功",
      data: {
        last_prompt_tokens: rows[0].last_prompt_tokens || 0,
        last_completion_tokens: rows[0].last_completion_tokens || 0,
        total_prompt_tokens: rows[0].total_prompt_tokens || 0,
        total_completion_tokens: rows[0].total_completion_tokens || 0,
      },
    };
  } catch (error) {
    recordErrorLog(error, "getSessionTokenUsage");
    return {
      status: 1,
      message: error.message || "获取 token 使用情况失败",
      data: null,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  updateTokenUsage,
  getSessionTokenUsage,
};
