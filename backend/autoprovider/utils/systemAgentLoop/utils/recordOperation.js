const { v4: uuidv4 } = require("uuid");
const pool = require("../../../db");
const recordErrorLog = require("../../recordErrorLog");

/**
 * 记录操作到数据库
 * @param {Object} params
 * @param {string} params.dialogueId - 对话ID
 * @param {string|Object} params.operationCode - 操作代码，可以是字符串或对象 { functionName: string, params: array }
 * @param {string} params.operationMethod - 操作方法名称
 * @param {number} [params.operationStatus=0] - 操作状态：0-正常应用，1-被回撤
 * @param {number} [params.operationIndex] - 操作索引
 * @param {Object} params.connection - 数据库连接
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
const recordOperation = async ({
  dialogueId,
  operationCode,
  operationMethod,
  operationStatus = 0,
  operationIndex,
  connection,
}) => {
  // 标记是否由本函数创建连接
  let shouldReleaseConnection = false;
  try {
    // 如果数据库连接为空，自己建立，结束后负责释放
    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }
    //在开始记录数据之前，切换回autoprovider的数据库
    await connection.query("use autoprovider_open");

    // 参数验证
    if (!dialogueId) {
      recordErrorLog("dialogue_id 不能为空", "recordOperation");
      return {
        status: 1,
        message: "dialogue_id 不能为空",
        data: {
          error: "dialogue_id is required",
        },
      };
    }

    if (!operationCode) {
      recordErrorLog("operation_code 不能为空", "recordOperation");
      return {
        status: 1,
        message: "operation_code 不能为空且必须是字符串或对象",
        data: {
          error: "operation_code must be a string or an object",
        },
      };
    }

    if (!operationMethod) {
      recordErrorLog("operation_method 不能为空", "recordOperation");
      return {
        status: 1,
        message: "operation_method 不能为空",
        data: {
          error: "operation_method is required",
        },
      };
    }

    // 生成操作ID
    const operationId = uuidv4();

    // 将 operationCode 转换为字符串（如果已经是字符串则直接使用，如果是对象则转换为 JSON）
    const operationCodeJson =
      typeof operationCode === "string" ? operationCode : operationCode;

    // 插入操作记录
    const insertSql = `INSERT INTO operation_record 
      (operation_id, dialogue_id, operation_code, create_time, operation_method, operation_status, operation_index) 
      VALUES (?, ?, ?, NOW(), ?, ?, ?)`;

    //没有Index默认为0
    await connection.query(insertSql, [
      operationId,
      dialogueId,
      operationCodeJson,
      operationMethod,
      operationStatus,
      operationIndex || 0,
    ]);

    return {
      status: 0,
      message: "操作记录成功",
      data: {
        operationId,
        dialogueId,
        operationMethod,
      },
    };
  } catch (error) {
    recordErrorLog(error, "recordOperation");
    return {
      status: 1,
      message: "操作记录失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  } finally {
    if (connection && shouldReleaseConnection) {
      connection.release();
    }
  }
};

module.exports = recordOperation;
