const pool = require("../db");
const recordErrorLog = require("../utils/recordErrorLog");
const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const bcrypt = require("bcryptjs");

const login = async (req, res) => {
  try {
    const account = req.body && req.body.account;
    const password = req.body && req.body.password;

    // 参数验证
    if (!account) {
      return res.send({
        status: 1,
        message: "账号不能为空",
        data: "fail",
      });
    }

    // 必须提供密码
    if (!password) {
      return res.send({
        status: 1,
        message: "请输入密码",
        data: "fail",
      });
    }

    // 查询用户信息和密码
    const login_sql = `SELECT 
      ui.user_id,
      ui.account,
      ui.username,
      ui.create_time,
      uv.password
    FROM user_info ui
    LEFT JOIN user_vec uv ON ui.account = uv.account
    WHERE ui.account = ?`;

    const [rows] = await pool.query(login_sql, [account]);

    // 用户不存在
    if (rows.length === 0) {
      return res.send({
        status: 1,
        message: "账号不存在",
        data: "fail",
      });
    }

    const user = rows[0];

    // 密码登录
    // 检查用户是否有密码记录
    if (!user.password) {
      return res.send({
        status: 1,
        message: "账号异常，请联系管理员",
        data: "fail",
      });
    }

    // 验证密码（使用 bcrypt 比较）
    const is_password_valid = await bcrypt.compare(password, user.password);
    if (!is_password_valid) {
      return res.send({
        status: 1,
        message: "密码错误",
        data: "fail",
      });
    }

    // 生成 token
    const token = jwt.sign({ user_id: user.user_id }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    // 登录成功，返回用户信息和 token（不返回密码）
    delete user.password;

    res.send({
      status: 0,
      message: "登录成功",
      data: {
        ...user,
        token,
      },
    });
  } catch (error) {
    recordErrorLog(error, "login");
    res.send({
      status: 1,
      message: "登录失败，服务器内部错误",
      data: "fail",
    });
  }
};

// 获取用户信息
const getuserinfo = async (req, res) => {
  try {
    const user_id = req.body.user_id;

    // 查询用户信息
    const getUserSql = `SELECT 
      user_id,
      account,
      username,
      create_time,
      status
    FROM user_info 
    WHERE user_id = ?`;

    const [rows] = await pool.query(getUserSql, [user_id]);

    // 用户不存在
    if (rows.length === 0) {
      return res.send({
        status: 1,
        message: "用户不存在",
        data: "fail",
      });
    }

    const user = rows[0];

    res.send({
      status: 0,
      message: "获取用户信息成功",
      data: {
        ...user,
      },
    });
  } catch (error) {
    recordErrorLog(error, "getuserinfo");
    res.send({
      status: 1,
      message: "获取用户信息失败，服务器内部错误",
      data: "fail",
    });
  }
};

// 获取用户 token 使用历史
const getusertokenhistory = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const { page = 1, page_size = 10, date } = req.body;

    // 参数验证
    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }

    // 验证分页参数
    const page_num = parseInt(page);
    const page_size_num = parseInt(page_size);

    if (isNaN(page_num) || page_num < 1) {
      return res.send({
        status: 1,
        message: "页码参数错误",
        data: "fail",
      });
    }

    if (isNaN(page_size_num) || page_size_num < 1 || page_size_num > 100) {
      return res.send({
        status: 1,
        message: "每页数量参数错误，范围应在1-100之间",
        data: "fail",
      });
    }

    // 验证 date 参数（如果提供，格式应为 YYYY-MM-DD）
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.send({
        status: 1,
        message: "日期参数格式错误，应为 YYYY-MM-DD 格式",
        data: "fail",
      });
    }

    // 计算偏移量
    const offset = (page_num - 1) * page_size_num;

    // 构建查询条件
    let whereClause = "WHERE user_id = ?";
    const queryParams = [user_id];

    // 日期筛选：筛选指定日期的记录（只比较日期部分，忽略时间）
    if (date) {
      whereClause += " AND DATE(create_time) = ?";
      queryParams.push(date);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM token_usage_history ${whereClause}`;
    const [countRows] = await pool.query(countSql, queryParams);
    const total = countRows[0].total;

    // 查询分页数据
    const listSql = `SELECT 
      record_id,
      user_id,
      tokens_used,
      usage_reason,
      create_time
    FROM token_usage_history 
    ${whereClause}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?`;

    const queryParamsWithPagination = [...queryParams, page_size_num, offset];
    const [rows] = await pool.query(listSql, queryParamsWithPagination);

    res.send({
      status: 0,
      message: "获取用户 token 使用历史成功",
      data: {
        total,
        page: page_num,
        page_size: page_size_num,
        total_pages: Math.ceil(total / page_size_num),
        list: rows,
      },
    });
  } catch (error) {
    recordErrorLog(error, "getusertokenhistory");
    res.send({
      status: 1,
      message: "获取用户 token 使用历史失败，服务器内部错误",
      data: "fail",
    });
  }
};

module.exports = {
  login,
  getuserinfo,
  getusertokenhistory,
};
