const axios = require("axios");

/**
 * 使用示例:
 * const { sendEmailCode } = require('./sendemailscode');
 *
 * // 发送验证码
 * sendEmailCode('user@example.com', '123456')
 *   .then(result => {
 *     if (result.success) {
 *       console.log('验证码发送成功');
 *     } else {
 *       console.error('发送失败:', result.message);
 *     }
 *   });
 */

/**
 * 发送邮箱验证码
 * @param {string} email - 收件人邮箱地址
 * @param {string} code - 验证码
 * @returns {Promise} 发送结果
 */
async function sendEmailCode(email, code) {
  try {
    // 根据SendCloud文档修正参数格式
    const response = await axios.post(
      "https://api.sendcloud.net/apiv2/mail/sendtemplate",
      {
        apiUser: "chumeng2004@wyj",
        apiKey: "b0fc78e0613e90f864d663fb79423b3b",
        from: "Mingslide@m.infaxis.com", // 修正发件人地址格式
        templateInvokeName: "sendscode_mingslide",
        subject: "MingSlide 邮箱验证码",
        xsmtpapi: JSON.stringify({
          to: [email],
          sub: {
            "%code%": [code],
          },
        }),
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        transformRequest: [
          function (data) {
            return Object.keys(data)
              .map(
                (key) =>
                  encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
              )
              .join("&");
          },
        ],
      }
    );

    console.log("邮件发送成功:", response.data);
    return {
      success: true,
      data: response.data,
      message: "验证码发送成功",
    };
  } catch (error) {
    console.error("发送邮箱验证码失败:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      message: "验证码发送失败",
    };
  }
}

module.exports = {
  sendEmailCode,
};
