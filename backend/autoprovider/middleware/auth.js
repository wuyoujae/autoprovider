const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const recordErrorLog = require("../utils/recordErrorLog");

// 解析 token 中间件
const parseToken = (req, res, next) => {
  try {
    // 从请求头获取 token
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.send({
        status: 1,
        message: "未提供token",
        data: "fail",
      });
    }

    // 验证并解析 token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // 确保 req.body 存在（GET 请求可能没有 body）
    if (!req.body) {
      req.body = {};
    }

    // 将 user_id 添加到 req.body
    req.body.user_id = decoded.user_id;

    // 继续执行下一个中间件
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.send({
        status: 1,
        message: "token已过期",
        data: "fail",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.send({
        status: 1,
        message: "无效的token",
        data: "fail",
      });
    }

    recordErrorLog(error, "parseToken");
    return res.send({
      status: 1,
      message: "token解析失败",
      data: "fail",
    });
  }
};

module.exports = {
  parseToken,
};
