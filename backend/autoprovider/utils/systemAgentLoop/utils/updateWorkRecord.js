const pool = require("../../../db");
const recordErrorLog = require("../../recordErrorLog");

const updateWorkRecord = async (infoObject) => {
  const connection = await pool.getConnection();
  try {
    //     create table work_record
    // (
    //     work_id     varchar(50)                        not null comment '工作id'
    //         primary key,
    //     create_time datetime default CURRENT_TIMESTAMP not null comment '工作开始时间',
    //     work_status tinyint  default 0                 null comment '工作状态，0是正常，1是操作撤回',
    //     session_id  varchar(50)                        null comment '对应的session的id'
    // )
    //     comment '工作记录，一个工作包含多个dialogue';

    await connection.query("use autoprovider_open");
    const insertSql = `INSERT INTO work_record (work_id,session_id,work_index) VALUES (?, ?, ?)`;
    await connection.query(insertSql, [
      infoObject.workId,
      infoObject.sessionId,
      infoObject.workIndex,
    ]);
    return {
      status: 0,
      message: "更新工作记录成功",
    };
  } catch (error) {
    recordErrorLog(error, "updateWorkRecord");
    return {
      status: 1,
      message: "更新工作记录失败",
    };
  } finally {
    // 释放连接
    connection.release();
  }
};

module.exports = updateWorkRecord;
