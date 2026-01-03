const recordErrorLog = require("../../recordErrorLog");

const SENDCLOUD_ENDPOINT =
  process.env.SENDCLOUD_ENDPOINT ||
  "https://api.sendcloud.net/apiv2/mail/sendtemplate";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 解析布尔环境变量
 */
const toBool = (value) => value === true || value === "true" || value === "1";

/**
 * 将对象转为 x-www-form-urlencoded 形式
 */
const toFormData = (data) => {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  });
  return form;
};

/**
 * 调用 SendCloud 发送邮件验证码
 * @param {Object} params
 * @param {string} params.account - 收件邮箱
 * @param {string} params.scode - 验证码
 * @param {string} [params.scene] - 业务场景，用于模板占位
 * @param {string} [params.subject] - 邮件标题
 * @param {string} [params.templateInvokeName] - SendCloud 模板名称
 * @param {number} [params.timeoutMs] - 请求超时时间
 * @returns {Promise<{status:0|1,message:string,data:any}>}
 */
async function sendEmailScode(params = {}) {
  const account = params.account || params.email || "";
  const scode = params.scode || params.code || "";
  const scene = params.scene || "default";

  // 参数校验
  if (!account) {
    return { status: 1, message: "账号不能为空", data: "fail" };
  }
  if (!EMAIL_REGEX.test(account)) {
    return { status: 1, message: "账号必须是有效的邮箱地址", data: "fail" };
  }
  if (!scode) {
    return { status: 1, message: "验证码不能为空", data: "fail" };
  }

  const apiUser = params.apiUser || process.env.SENDCLOUD_API_USER;
  const apiKey = params.apiKey || process.env.SENDCLOUD_API_KEY;
  const from = params.from || process.env.SENDCLOUD_FROM;
  const fromName =
    params.fromName || process.env.SENDCLOUD_FROM_NAME || "autoprovider";
  const templateInvokeName =
    params.templateInvokeName ||
    process.env.SENDCLOUD_TEMPLATE ||
    "auroprovider"; // 对应已创建的 autoprovider 模板
  const subject =
    params.subject ||
    process.env.SENDCLOUD_SUBJECT ||
    "autoprovider-邮箱验证码";
  const mockSend = toBool(process.env.MOCK_SEND_EMAIL);
  const timeoutMs = Number(params.timeoutMs) || 10000;

  // 配置检查
  const configMissing = !apiUser || !apiKey || !from || !templateInvokeName;
  if (configMissing) {
    if (mockSend) {
      return {
        status: 0,
        message: "已跳过邮件发送（MOCK_SEND_EMAIL=true）",
        data: { mock: true, account, scode },
      };
    }
    return {
      status: 1,
      message: "邮件服务未正确配置",
      data: "fail",
    };
  }

  if (typeof fetch !== "function") {
    return {
      status: 1,
      message: "当前运行环境缺少 fetch，请升级 Node.js >= 18",
      data: "fail",
    };
  }

  // 组装 SendCloud 请求体
  const xsmtpapi = {
    to: [account],
    sub: {
      "%code%": [scode],
      "%scene%": [scene],
    },
  };

  const formData = toFormData({
    apiUser,
    apiKey,
    from,
    fromName,
    templateInvokeName,
    subject,
    xsmtpapi: JSON.stringify(xsmtpapi),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(SENDCLOUD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = { raw: text };
    }

    console.log("杰哥", parsed);
    const sendSuccess =
      parsed?.result === true ||
      parsed?.statusCode === 200 ||
      parsed?.info?.emailId;

    if (sendSuccess) {
      return {
        status: 0,
        message: "验证码发送成功",
        data: {
          account,
          scene,
          requestId: parsed?.info?.emailId || parsed?.info?.messageId || null,
        },
      };
    }

    return {
      status: 1,
      message: parsed?.message || "验证码发送失败",
      data: "fail",
    };
  } catch (error) {
    recordErrorLog(error, "sendEmailScode");
    const isAbortError = error?.name === "AbortError";
    return {
      status: 1,
      message: isAbortError
        ? "发送超时，请稍后重试"
        : "验证码发送失败，服务器内部错误",
      data: "fail",
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = sendEmailScode;
