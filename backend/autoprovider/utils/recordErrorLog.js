const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

/**
 * 将错误对象转换为可读字符串
 * @param {any} error - 错误对象
 * @returns {string} 错误信息字符串
 */
const formatError = (error) => {
  if (error === null || error === undefined) {
    return "null";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ""}`;
  }
  if (typeof error === "object") {
    try {
      return JSON.stringify(error, null, 2);
    } catch (e) {
      return `[Object: ${Object.prototype.toString.call(error)}]`;
    }
  }
  return String(error);
};

const recordErrorLog = async (error, position) => {
  const current_time = new Date();
  //时间格式化成xxxx-xx-xx xx:xx:xx
  const current_time_str = current_time
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  // 格式化错误信息
  const errorStr = formatError(error);

  //错误信息组成
  const error_log = `[${current_time_str}]：报错发生位置：${position}：${errorStr} \n\n`;
  // 错误信息写入文件，统一放在 backend/autoprovider/log/error.log
  const logDir = path.resolve(__dirname, "../log");
  const error_log_file = path.join(logDir, "error.log");
  // 如果目录/文件不存在，则创建
  try {
    if (!fsSync.existsSync(logDir)) {
      fsSync.mkdirSync(logDir, { recursive: true });
    }
    if (!fsSync.existsSync(error_log_file)) {
      await fs.writeFile(error_log_file, "");
    }
    await fs.appendFile(error_log_file, error_log);
  } catch (e) {
    console.error("写入错误日志失败", e);
  }
  console.log("服务器发生错误，请前往日志文件查看");
};

module.exports = recordErrorLog;
