const pool = require("../../../db");
const { v4: uuidv4 } = require("uuid");
const recordErrorLog = require("../../recordErrorLog");

// create table operation_record
// (
//     operation_id     varchar(50)                        not null comment '操作ID，由系统生成唯一标识'
//         primary key,
//     dialogue_id      varchar(50)                        not null comment '对话ID，来源于dialogue_record表的dialogue_id',
//     operation_code   longtext                           not null comment '操作代码，解析前整个方法标签的代码',
//     create_time      datetime default CURRENT_TIMESTAMP null comment '创建时间',
//     operation_method varchar(200)                       null comment '操作方法，操作的function名称',
//     operation_status tinyint  default 0                 null comment '操作状态：0-正常应用，1-被回撤',
//     operation_index  int                                null
// )
//     comment '操作记录表' collate = utf8mb4_unicode_ci;

const updateOperationRecord = async ({
  operationId,
  dialogueId,
  operationCode,
  operationMethod,
  operationIndex,
}) => {
  const connection = await pool.getConnection();
  try {
    if (!operationId) {
      recordErrorLog("operation_id 不能为空", "updateOperationRecord");
    }
    if (!dialogueId) {
      recordErrorLog("dialogue_id 不能为空", "updateOperationRecord");
    }
    if (!operationCode) {
      recordErrorLog("operation_code 不能为空", "updateOperationRecord");
    }
    if (!operationMethod) {
      recordErrorLog("operation_method 不能为空", "updateOperationRecord");
    }
    if (!operationIndex) {
      recordErrorLog("operation_index 不能为空", "updateOperationRecord");
    }

    await connection.query("use autoprovider_open");
    const insertSql = `INSERT INTO operation_record (operation_id, dialogue_id, operation_code, operation_method, operation_index) VALUES (?, ?, ?, ?, ?)`;
    await connection.query(insertSql, [
      operationId,
      dialogueId,
      operationCode,
      operationMethod,
      operationIndex,
    ]);
    return {
      status: 0,
      message: "插入操作记录成功",
    };
  } catch (error) {
    recordErrorLog(error, "updateOperationRecord");
    return {
      status: 1,
      message: "插入操作记录失败",
      data: {
        error: error.message,
      },
    };
  } finally {
    // 释放连接
    connection.release();
  }
};

module.exports = updateOperationRecord;
