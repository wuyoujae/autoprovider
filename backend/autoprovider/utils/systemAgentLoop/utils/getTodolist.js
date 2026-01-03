const pool = require("../../../db");
const recordErrorLog = require("../../recordErrorLog");

/**
 * 获取指定 session 下未完成的 todolist 中的所有 todo 项
 * @param {Object|string} infoObject - 包含 sessionId 的对象或直接传入 sessionId
 * @returns {Promise<Array>} 对应 todolist 的 todo 列表，查询失败或不存在时返回空数组
 */
const getTodolist = async (infoObject) => {
  try {
    const sessionId =
      typeof infoObject === "string"
        ? infoObject
        : infoObject && infoObject.sessionId;

    if (!sessionId) {
      recordErrorLog(new Error("sessionId不能为空"), "getTodolist");
      return [];
    }

    const unfinishedSql = `
      SELECT todolist_id
      FROM todolist
      WHERE session_id = ?
        AND todolist_status = 0
      ORDER BY create_time DESC
      LIMIT 1
    `;
    const [todolistRows] = await pool.query(unfinishedSql, [sessionId]);

    if (!todolistRows || todolistRows.length === 0) {
      return [];
    }

    const todolistId = todolistRows[0].todolist_id;
    const todoSql = `
      SELECT todo_id,
             todolist_id,
             todo_title,
             todo_desc,
             todo_status,
             create_time
      FROM todo
      WHERE todolist_id = ?
      ORDER BY create_time ASC
    `;
    const [todoRows] = await pool.query(todoSql, [todolistId]);

    return todoRows;
  } catch (error) {
    recordErrorLog(error, "getTodolist");
    return [];
  }
};

module.exports = getTodolist;
