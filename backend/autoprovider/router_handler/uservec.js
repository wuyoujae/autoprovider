const pool = require("../db");
const recordErrorLog = require("../utils/recordErrorLog");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
// 验证邮箱格式
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证密码格式：英文+数字，8位以上
const isValidPassword = (password) => {
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 8;
  return hasLetter && hasNumber && hasMinLength;
};

// 注册
const register = async (req, res) => {
  try {
    const account = req.body && req.body.account;
    const password = req.body && req.body.password;

    // 参数验证
    if (!account || !password) {
      return res.send({
        status: 1,
        message: "账号和密码不能为空",
        data: "fail",
      });
    }

    // 验证邮箱格式
    if (!isValidEmail(account)) {
      return res.send({
        status: 1,
        message: "账号必须是有效的邮箱地址",
        data: "fail",
      });
    }

    // 验证密码格式
    if (!isValidPassword(password)) {
      return res.send({
        status: 1,
        message: "密码必须包含英文和数字，且长度不少于8位",
        data: "fail",
      });
    }

    // 检查账号是否已经注册
    const checkAccountSql = `SELECT user_id FROM user_info WHERE account = ?`;
    const [accountRows] = await pool.query(checkAccountSql, [account]);

    if (accountRows.length > 0) {
      return res.send({
        status: 1,
        message: "该账号已经注册",
        data: "fail",
      });
    }

    // 生成用户ID
    const user_id = uuidv4();

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashed_password = await bcrypt.hash(password, salt);

    // 插入用户信息，赠送注册积分
    const insertUserSql = `INSERT INTO user_info (user_id, account, username) 
      VALUES (?, ?, ?)`;
    await pool.query(insertUserSql, [user_id, account, account.split("@")[0]]);

    // 插入 user_vec 表，存储加密后的密码
    const insertVecSql = `INSERT INTO user_vec (vec_id, account, password) VALUES (?, ?, ?)`;
    await pool.query(insertVecSql, [uuidv4(), account, hashed_password]);

    res.send({
      status: 0,
      message: "注册成功",
      data: {
        user_id,
        account,
        username: account.split("@")[0],
      },
    });
  } catch (error) {
    recordErrorLog(error, "register");
    res.send({
      status: 1,
      message: "注册失败，服务器内部错误",
      data: "fail",
    });
  }
};

module.exports = {
  register,
};
