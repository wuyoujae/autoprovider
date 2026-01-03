const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");

const getTodolist = require("./utils/getTodolist");
/**
 * 判断指定session的todolist是否全部完成
 * @param {Object} infoObject - 包含sessionId的对象
 * @returns {Promise<boolean>} 如果还有未完成的todolist返回true，如果全部完成返回false
 */
const epoche = async (infoObject) => {
  try {
    // 参数验证
    if (!infoObject || !infoObject.sessionId) {
      recordErrorLog(new Error("sessionId不能为空"), "Agent work in epoche");
      return false;
    }

    const sessionId = infoObject.sessionId;

    // 查询该session_id下的所有todolist
    const querySql = `SELECT todolist_id, todolist_status 
      FROM todolist 
      WHERE session_id = ? AND todolist_status = 0`;

    const [rows] = await pool.query(querySql, [sessionId]);

    if (rows.length === 0) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    recordErrorLog(error, "Agent work in epoche");
    return false;
  }
};

module.exports = epoche;
