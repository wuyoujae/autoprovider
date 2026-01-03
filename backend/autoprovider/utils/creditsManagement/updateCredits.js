const { v4: uuidv4 } = require("uuid");
const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");

/**
 * 更新用户积分
 *
 * 功能说明：
 * 1. 在credit_history表中插入积分变化记录
 * 2. 在user_info表中更新用户的积分数量
 * 3. 使用事务确保数据一致性
 *
 * @param {string} user_id - 用户ID
 * @param {number} changeAmount - 积分变化数量（有符号整数，正数表示增加，负数表示减少）
 * @param {string} changeReason - 积分变化的描述信息
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
async function updateCredits(user_id, changeAmount, changeReason) {
  const connection = await pool.getConnection();
  try {
    // 参数验证
    if (!user_id || typeof user_id !== "string") {
      return {
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      };
    }

    if (typeof changeAmount !== "number" || isNaN(changeAmount)) {
      return {
        status: 1,
        message: "积分变化数量必须是数字",
        data: "fail",
      };
    }

    // 积分变化数量必须是整数
    if (!Number.isInteger(changeAmount)) {
      return {
        status: 1,
        message: "积分变化数量必须是整数",
        data: "fail",
      };
    }

    // 积分变化数量不能为0
    if (changeAmount === 0) {
      return {
        status: 1,
        message: "积分变化数量不能为0",
        data: "fail",
      };
    }

    if (!changeReason || typeof changeReason !== "string") {
      return {
        status: 1,
        message: "积分变化描述不能为空",
        data: "fail",
      };
    }

    // 开启事务
    await connection.beginTransaction();

    // 1. 查询用户当前积分
    await connection.query("use autoprovider_open");
    const getUserCreditsSql = `SELECT credits FROM user_info WHERE user_id = ? AND status = 0`;
    const [userRows] = await connection.query(getUserCreditsSql, [user_id]);

    if (userRows.length === 0) {
      await connection.rollback();
      return {
        status: 1,
        message: "用户不存在或已注销",
        data: "fail",
      };
    }

    const currentCredits = userRows[0].credits || 0;

    // 2. 计算更新后的积分
    const newCredits = currentCredits + changeAmount;

    // 3. 确定变化类型（允许积分为负数）
    const changeType = changeAmount > 0 ? "increase" : "decrease";

    // 5. 生成记录ID
    const record_id = uuidv4();

    // 6. 在credit_history表中插入记录
    const insertHistorySql = `INSERT INTO credit_history 
      (record_id, user_id, change_amount, change_type, change_reason, create_time) 
      VALUES (?, ?, ?, ?, ?, NOW())`;
    await connection.query("use autoprovider_open");
    await connection.query(insertHistorySql, [
      record_id,
      user_id,
      changeAmount,
      changeType,
      changeReason,
    ]);

    // 7. 更新user_info表中的积分
    const updateCreditsSql = `UPDATE user_info 
      SET credits = credits + ? 
      WHERE user_id = ? AND status = 0`;
    await connection.query("use autoprovider_open");
    const [updateResult] = await connection.query(updateCreditsSql, [
      changeAmount,
      user_id,
    ]);

    // 8. 检查更新是否成功
    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return {
        status: 1,
        message: "更新用户积分失败",
        data: "fail",
      };
    }

    // 提交事务
    await connection.commit();

    return {
      status: 0,
      message:
        changeAmount > 0
          ? `成功增加${changeAmount}积分`
          : `成功扣除${Math.abs(changeAmount)}积分`,
      data: {
        record_id,
        user_id,
        previous_credits: currentCredits,
        change_amount: changeAmount,
        new_credits: newCredits,
        change_type: changeType,
        change_reason: changeReason,
      },
    };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    recordErrorLog(error, "updateCredits 1");
    return {
      status: 1,
      message: "更新积分失败，服务器内部错误",
      data: "fail",
    };
  } finally {
    // 释放连接
    connection.release();
  }
}

/**
 * 批量更新多个用户的积分
 * @param {Array<{user_id: string, change_amount: number, change_reason: string}>} updates - 更新列表
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
async function batchUpdateCredits(updates) {
  try {
    // 参数验证
    if (!Array.isArray(updates) || updates.length === 0) {
      return {
        status: 1,
        message: "更新列表不能为空",
        data: "fail",
      };
    }

    const results = [];
    const errors = [];

    // 逐个更新
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const result = await updateCredits(
        update.user_id,
        update.change_amount,
        update.change_reason
      );

      if (result.status === 0) {
        results.push({
          user_id: update.user_id,
          success: true,
          data: result.data,
        });
      } else {
        errors.push({
          user_id: update.user_id,
          success: false,
          message: result.message,
        });
      }
    }

    return {
      status: errors.length === 0 ? 0 : 1,
      message:
        errors.length === 0
          ? "批量更新积分成功"
          : `批量更新完成，成功${results.length}个，失败${errors.length}个`,
      data: {
        success_count: results.length,
        error_count: errors.length,
        results,
        errors,
      },
    };
  } catch (error) {
    recordErrorLog(error, "batchUpdateCredits");
    return {
      status: 1,
      message: "批量更新积分失败，服务器内部错误",
      data: "fail",
    };
  }
}

/**
 * 查询用户的积分变化历史
 * @param {string} user_id - 用户ID
 * @param {number} limit - 查询数量限制，默认10条
 * @param {number} offset - 查询偏移量，默认0
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
async function getCreditHistory(user_id, limit = 10, offset = 0) {
  try {
    // 参数验证
    if (!user_id) {
      return {
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      };
    }

    const connection = await pool.getConnection();

    // 查询积分变化历史
    const getHistorySql = `SELECT 
      record_id,
      user_id,
      change_amount,
      change_type,
      change_reason,
      create_time
    FROM credit_history 
    WHERE user_id = ?
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?`;
    await connection.query("use autoprovider_open");
    const [rows] = await connection.query(getHistorySql, [
      user_id,
      limit,
      offset,
    ]);

    // 查询总数
    const getCountSql = `SELECT COUNT(*) as total FROM credit_history WHERE user_id = ?`;
    const [countRows] = await connection.query(getCountSql, [user_id]);
    const total = countRows[0].total;

    return {
      status: 0,
      message: "查询积分历史成功",
      data: {
        total,
        limit,
        offset,
        records: rows,
      },
    };
  } catch (error) {
    recordErrorLog(error, "getCreditHistory");
    return {
      status: 1,
      message: "查询积分历史失败，服务器内部错误",
      data: "fail",
    };
  } finally {
    // 释放连接
    connection.release();
  }
}

/**
 * 查询用户当前积分
 * @param {string} user_id - 用户ID
 * @returns {Promise<{status: number, message: string, data: any}>} 返回操作结果
 */
async function getUserCredits(user_id) {
  const connection = await pool.getConnection();
  try {
    // 参数验证
    if (!user_id) {
      return {
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      };
    }

    await connection.query("use autoprovider_open");
    // 查询用户积分
    const getUserCreditsSql = `SELECT credits FROM user_info WHERE user_id = ? AND status = 0`;
    const [rows] = await connection.query(getUserCreditsSql, [user_id]);

    if (rows.length === 0) {
      return {
        status: 1,
        message: "用户不存在或已注销",
        data: "fail",
      };
    }

    return {
      status: 0,
      message: "查询积分成功",
      data: {
        user_id,
        credits: rows[0].credits || 0,
      },
    };
  } catch (error) {
    recordErrorLog(error, "getUserCredits");
    return {
      status: 1,
      message: "查询积分失败，服务器内部错误",
      data: "fail",
    };
  } finally {
    // 释放连接
    connection.release();
  }
}

module.exports = {
  updateCredits,
  batchUpdateCredits,
  getCreditHistory,
  getUserCredits,
};
