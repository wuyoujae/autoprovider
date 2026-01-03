const pool = require("../../../db");
const { v4: uuidv4 } = require("uuid");
const recordErrorLog = require("../../recordErrorLog");
const getNewWorkId = async (infoObject) => {
  // 验证必要的参数
  if (!infoObject || !infoObject.sessionId) {
    return {
      status: 1,
      message: "sessionId不能为空",
    };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取当前session中最大的work_index，并且必须是work_status为0的
    let maxWorkIndex = 0;
    const [rows] = await connection.query(
      "SELECT MAX(work_index) AS max_work_index FROM work_record WHERE work_status = 0 AND session_id = ?",
      [infoObject.sessionId]
    );

    if (rows.length > 0 && rows[0].max_work_index !== null) {
      maxWorkIndex = parseInt(rows[0].max_work_index) || 0;
    }

    // 生成新的work_index（当前最大值+1）
    const newWorkIndex = maxWorkIndex + 1;
    const workId = uuidv4();

    // 可选：立即插入记录或返回数据让调用者插入
    // 如果选择立即插入，可以在这里添加插入语句

    await connection.commit();

    console.log("sessionId:", infoObject.sessionId);
    console.log("maxWorkIndex:", maxWorkIndex);
    console.log("newWorkIndex:", newWorkIndex);
    console.log("workId:", workId);

    return {
      status: 0,
      workIndex: newWorkIndex,
      workId,
      sessionId: infoObject.sessionId,
    };
  } catch (error) {
    await connection.rollback();
    recordErrorLog(error, "getNewWorkId");
    return {
      status: 1,
      message: "获取新的工作ID失败",
      data: {
        error: error.message,
      },
    };
  } finally {
    connection.release();
  }
};

module.exports = getNewWorkId;
