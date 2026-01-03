const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");
const { v4: uuidv4 } = require("uuid");

/**
 * 创建新会话
 * @param {string} project_id - 项目ID
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果，包含 session_id
 */
async function createSession(project_id) {
  const connection = await pool.getConnection();

  try {
    // 参数验证
    if (!project_id || typeof project_id !== "string") {
      return {
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      };
    }

    // 开启事务
    await connection.beginTransaction();

    // 1. 检查项目是否存在且状态正常
    const checkProjectSql = `SELECT project_id, project_status 
      FROM project_info 
      WHERE project_id = ? AND project_status = 0`;

    const [projectRows] = await connection.query(checkProjectSql, [project_id]);

    if (projectRows.length === 0) {
      await connection.rollback();
      return {
        status: 1,
        message: "项目不存在或已被删除",
        data: "fail",
      };
    }

    // 2. 生成会话ID
    const session_id = uuidv4();

    // 3. 插入会话记录
    const insertSessionSql = `INSERT INTO session_record 
      (session_id, project_id, session_title, session_status, create_time) 
      VALUES (?, ?, ?, ?, NOW())`;

    await connection.query(insertSessionSql, [
      session_id,
      project_id,
      "新会话", // 默认会话标题
      0, // session_status: 0-正常使用
    ]);

    // 提交事务
    await connection.commit();

    return {
      status: 0,
      message: "创建会话成功",
      data: {
        session_id,
        project_id,
      },
    };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    recordErrorLog(error, "createSession");
    return {
      status: 1,
      message: "创建会话失败，服务器内部错误",
      data: "fail",
    };
  } finally {
    // 释放连接
    connection.release();
  }
}

module.exports = createSession;
