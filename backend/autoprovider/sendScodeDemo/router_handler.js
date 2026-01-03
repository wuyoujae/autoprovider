// 发送登录验证码
exports.sendLoginCode = async (req, res) => {
  const { username, turnstileToken } = req.body;

  // 验证 Turnstile token
  if (turnstileToken) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const verifyResult = await verifyTurnstileToken(turnstileToken, clientIp);

    if (!verifyResult.success) {
      return res.send({
        status: 1,
        message: verifyResult.message || "人机验证失败，请重试",
      });
    }
  } else {
    return res.send({
      status: 1,
      message: "请完成人机验证",
    });
  }

  // 判断用户名是否符合要求
  if (!username_check(username)) {
    return res.send({
      status: 1,
      message: "用户名格式错误，请输入手机号或邮箱",
    });
  }

  // 验证用户是否存在且状态正常
  const sql = `SELECT status FROM user_baseinfo WHERE username = ?`;
  pool.query(sql, [username], (err, results) => {
    if (err) {
      recordErrorLog(err);
      return res.send({
        status: 1,
        message: "服务器出错",
      });
    }

    // 用户不存在
    if (results.length === 0) {
      return res.send({
        status: 1,
        message: "用户还没有注册，请先注册",
      });
    }

    // 用户已被删除
    if (results[0].status !== 0) {
      return res.send({
        status: 1,
        message: "账户已被删除，无法登录",
      });
    }

    // 检查用户是否已完成注册（验证user_verify表中的status）
    const checkRegisterSql = `SELECT status FROM user_verify WHERE username = ?`;
    pool.query(checkRegisterSql, [username], (err, verifyResults) => {
      if (err) {
        recordErrorLog(err);
        return res.send({
          status: 1,
          message: "服务器出错",
        });
      }

      // 用户验证记录不存在或未完成注册
      if (verifyResults.length === 0 || verifyResults[0].status !== 1) {
        return res.send({
          status: 1,
          message: "用户还没有注册，请先注册",
        });
      }

      // 检查验证码发送频率限制
      const sql_1 = `SELECT latest_sendtime FROM user_verify WHERE username = ?`;
      pool.query(sql_1, [username], (err, results) => {
        if (err) {
          recordErrorLog(err);
          return res.send({
            status: 1,
            message: "服务器出错",
          });
        }

        if (results.length > 0) {
          const latest_sendtime = results[0].latest_sendtime;
          const current_time = new Date();
          const time_diff = current_time - latest_sendtime;

          // 如果时间差小于2分钟，则不能发送验证码
          if (time_diff <= 120000) {
            return res.send({
              status: 1,
              message: "验证码发送过于频繁，请稍后再试",
            });
          }

          // 可以发送验证码，更新现有记录
          const scode = getScode();
          const sql_2 = `UPDATE user_verify SET scode = ?, latest_sendtime = ? WHERE username = ?`;
          pool.query(
            sql_2,
            [scode, current_time, username],
            async (err, results) => {
              if (err) {
                recordErrorLog(err);
                return res.send({
                  status: 1,
                  message: "服务器出错",
                });
              }

              // 如果是邮箱，发送邮件验证码
              const emailRegex =
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              if (emailRegex.test(username)) {
                try {
                  await sendEmailCode(username, scode);
                } catch (emailErr) {
                  recordErrorLog(emailErr);
                  return res.send({
                    status: 1,
                    message: "邮件发送失败，请稍后重试",
                  });
                }
              }

              return res.send({
                status: 0,
                message: "验证码发送成功",
                data: {
                  scode: "success",
                },
              });
            }
          );
        } else {
          // 用户验证记录不存在，创建新记录
          const scode = getScode();
          const current_time = new Date();
          const sql_2 = `INSERT INTO user_verify (username, scode, latest_sendtime) VALUES (?, ?, ?)`;
          pool.query(
            sql_2,
            [username, scode, current_time],
            async (err, results) => {
              if (err) {
                recordErrorLog(err);
                return res.send({
                  status: 1,
                  message: "服务器出错",
                });
              }

              // 如果是邮箱，发送邮件验证码
              const emailRegex =
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              if (emailRegex.test(username)) {
                try {
                  await sendEmailCode(username, scode);
                } catch (emailErr) {
                  recordErrorLog(emailErr);
                  return res.send({
                    status: 1,
                    message: "邮件发送失败，请稍后重试",
                  });
                }
              }

              return res.send({
                status: 0,
                message: "验证码发送成功",
                data: {
                  scode: "success",
                },
              });
            }
          );
        }
      });
    });
  });
};

exports.sendRegisterCode = async (req, res) => {
  const { username, turnstileToken } = req.body;

  // 验证 Turnstile token
  if (turnstileToken) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const verifyResult = await verifyTurnstileToken(turnstileToken, clientIp);

    if (!verifyResult.success) {
      return res.send({
        status: 1,
        message: verifyResult.message || "人机验证失败，请重试",
      });
    }
  } else {
    return res.send({
      status: 1,
      message: "请完成人机验证",
    });
  }

  //判断用户名是否符合要求
  if (!username_check(username)) {
    return res.send({
      status: 1,
      message: "用户名格式错误，请输入手机号或邮箱",
    });
  }
  //首先判断用户是否已经注册
  const sql = `select status from user_baseinfo where username = ?`;
  pool.query(sql, [username], (err, results) => {
    if (err) {
      //记录错误
      recordErrorLog(err);
      return res.send({
        status: 1,
        message: "服务器出错",
      });
    }
    if (results.length > 0 && results[0].status == 0) {
      return res.send({
        status: 1,
        message: "用户已注册",
      });
    } else {
      //检查用户上一个验证码是否过期
      const sql_1 = `select latest_sendtime from user_verify where username = ?`;
      pool.query(sql_1, [username], (err, results) => {
        if (err) {
          //记录错误
          recordErrorLog(err);
          return res.send({
            status: 1,
            message: "服务器出错",
          });
        }
        if (results.length > 0) {
          //最后发送时间是十位时间戳格式
          const latest_sendtime = results[0].latest_sendtime;
          //当前时间
          const current_time = new Date();
          //时间差
          const time_diff = current_time - latest_sendtime;
          //如果时间差超过2分钟，则可以发送验证码
          if (time_diff > 120000) {
            //生成随机验证码
            const scode = getScode();
            //将验证码写入数据库
            const sql_2 = `update user_verify set scode = ?,latest_sendtime = ? where username = ?`;
            pool.query(
              sql_2,
              [scode, current_time, username],
              async (err, results) => {
                if (err) {
                  //记录错误
                  recordErrorLog(err);
                  return res.send({
                    status: 1,
                    message: "服务器出错",
                  });
                }

                // 如果是邮箱，发送邮件验证码
                const emailRegex =
                  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (emailRegex.test(username)) {
                  try {
                    await sendEmailCode(username, scode);
                  } catch (emailErr) {
                    recordErrorLog(emailErr);
                    return res.send({
                      status: 1,
                      message: "邮件发送失败，请稍后重试",
                    });
                  }
                }

                return res.send({
                  status: 0,
                  message: "验证码发送成功",
                  data: {
                    scode: "success",
                  },
                });
              }
            );
          } else {
            return res.send({
              status: 1,
              message: "验证码发送过于频繁，请稍后再试",
            });
          }
        } else {
          //如果数据库中没有记录，则可以发送验证码
          const scode = getScode();
          const current_time = new Date();
          const sql_2 = `insert into user_verify (username,scode,latest_sendtime) values (?,?,?)`;
          pool.query(
            sql_2,
            [username, scode, current_time],
            async (err, results) => {
              if (err) {
                //记录错误
                recordErrorLog(err);
                return res.send({
                  status: 1,
                  message: "服务器出错",
                });
              }

              // 如果是邮箱，发送邮件验证码
              const emailRegex =
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
              if (emailRegex.test(username)) {
                try {
                  await sendEmailCode(username, scode);
                } catch (emailErr) {
                  recordErrorLog(emailErr);
                  return res.send({
                    status: 1,
                    message: "邮件发送失败，请稍后重试",
                  });
                }
              }

              return res.send({
                status: 0,
                message: "验证码发送成功",
                data: "done",
              });
            }
          );
        }
      });
    }
  });
};
