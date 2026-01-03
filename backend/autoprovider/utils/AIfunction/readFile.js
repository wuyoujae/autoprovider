const fs = require("fs").promises;
const fsSync = require("fs");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const combyToolResponse = require("../systemAgentLoop/utils/combyToolResponse");
const decodeHtmlEntities = require("../systemAgentLoop/utils/decodeHtmlEntities");
const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");

/**
 * 读取单个文件（异步版本）
 * @param {string} relativePath - 相对路径
 * @param {Object} infoObject - 信息对象
 * @returns {Promise<Object>} 文件内容和信息
 */
const readSingleFile = async (relativePath, infoObject) => {
  const projectPath = combyFilePath(infoObject.projectId, relativePath);

  // 检查文件是否存在（异步）
  let stat = null;
  try {
    stat = await fs.stat(projectPath);
  } catch (e) {
    throw new Error(`文件不存在: ${projectPath}`);
  }

  if (!stat.isFile()) {
    throw new Error(`文件夹无法读取: ${projectPath}`);
  }

  // 异步读取文件内容
  const content = await fs.readFile(projectPath, "utf-8");

  return {
    content,
    fileSize: stat.size,
    linesCount: content.split(/\r?\n/).length,
  };
};
/**
 * 读取文件内容（支持按顺序读取多个文件）
 * @param {Object} payload - 函数参数对象
 * @param {string[]} payload.file_paths - 要读取的文件路径数组
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function readFile(payload = {}, infoObject = {}) {
  try {
    // 参数验证
    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "readfile fail",
        data: {
          error: "系统问题出错，请暂停工作",
        },
      };
    }

    // 从 payload 中获取 file_paths 参数
    const filePaths = payload?.file_paths;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return {
        status: 1,
        message: "readfile fail",
        data: {
          error: "file_paths 参数不能为空，必须是数组",
        },
      };
    }

    const fileResults = {};
    const failedDetails = [];
    let successfulReads = 0;
    let failedReads = 0;
    let totalContentSize = 0;

    for (const targetPath of filePaths) {
      try {
        if (!targetPath || typeof targetPath !== "string") {
          const reason = "路径必须是非空字符串";
          fileResults[String(targetPath)] = {
            result: `读取结果：read fail【${reason}】`,
            content: null,
            file_size: 0,
            lines_count: 0,
          };
          failedDetails.push({
            file_path: String(targetPath),
            reason,
          });
          failedReads += 1;
          continue;
        }

        // 解码 HTML 实体
        const decodedPath = decodeHtmlEntities(targetPath);

        // 通知前端
        chatToFrontend("阅读文件" + decodedPath, "read_file", infoObject);

        const { content, fileSize, linesCount } = await readSingleFile(
          decodedPath,
          infoObject
        );

        fileResults[decodedPath] = {
          result: "读取结果：read success",
          content,
          file_size: fileSize,
          lines_count: linesCount,
        };
        successfulReads += 1;
        totalContentSize += fileSize;
      } catch (error) {
        recordErrorLog(error, "AgentFunction in read file");
        const decodedPath =
          typeof targetPath === "string"
            ? decodeHtmlEntities(targetPath)
            : String(targetPath);
        const reason = error.message?.replace(/^[^【]+【?/, "") || "读取失败";
        const normalizedReason = reason.includes("文件不存在")
          ? "文件不存在"
          : reason.includes("文件夹无法读取")
          ? "文件夹无法读取"
          : reason;

        fileResults[decodedPath] = {
          result: `读取结果：read fail【${normalizedReason}】`,
          content: null,
          file_size: 0,
          lines_count: 0,
        };

        failedDetails.push({
          file_path: decodedPath,
          reason: normalizedReason,
        });

        failedReads += 1;
      }
    }

    const totalFiles = filePaths.length;
    const summary = {
      total_files: totalFiles,
      successful_reads: successfulReads,
      failed_reads: failedReads,
      total_content_size: totalContentSize,
      failed_details: failedDetails,
    };

    let status = 0;
    let message = "readfile success";

    if (successfulReads === 0 && failedReads > 0) {
      status = 1;
      message = "所有文件读取失败";
    } else if (failedReads > 0) {
      status = 1;
      message = "部分文件读取失败";
    }

    return {
      status,
      message,
      data: {
        ...fileResults,
        summary,
      },
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in read file");
    return {
      status: 1,
      message: "readfile fail",
      data: {
        error: "系统错误请停止工作",
      },
    };
  }
}

module.exports = readFile;
