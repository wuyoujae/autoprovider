const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const decodeHtmlEntities = require("../systemAgentLoop/utils/decodeHtmlEntities");
const pool = require("../../db");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");
const recordErrorLog = require("../recordErrorLog");

/**
 * 删除文件或文件夹
 * @param {Object} payload - 函数参数对象
 * @param {Array<string>} payload.file_paths - 文件或文件夹路径数组，例如：
 *   - /app/src/components/loginPannle.floder (删除文件夹)
 *   - /app/src/components/loginPannle (删除文件，无后缀)
 *   - /app/src/components/loginPannle/loginPannle.vue (删除文件)
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function deleteFile(payload = {}, infoObject = {}) {
  try {
    const resultsMap = {};
    const failedDetails = [];
    let successfulDeletions = 0;
    let failedDeletions = 0;

    const successMessage = "删除结果：delete success";
    const buildFailMessage = (reason) =>
      `删除结果：delete fail【${reason || "删除失败"}】`;

    // 参数验证
    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "deletefile fail",
        data: {
          error: "系统问题出错，请暂停工作",
        },
      };
    }

    // 从 payload 中获取 file_paths 参数
    const filePaths = payload?.file_paths;

    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return {
        status: 1,
        message: "deletefile fail",
        data: {
          error:
            "file_paths 参数传递必须是array形式，请你阅读functionlist并重新调用",
        },
      };
    }

    // 遍历每个文件路径
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      // 参数验证
      if (!filePath || typeof filePath !== "string") {
        const reason = "文件路径不能为空，必须是字符串";
        const invalidPath = String(filePath);
        resultsMap[invalidPath] = buildFailMessage(reason);
        failedDetails.push({
          file_path: invalidPath,
          reason,
        });
        failedDeletions += 1;
        continue;
      }

      const normalizedInput = decodeHtmlEntities(filePath);

      // 规范化路径（处理 Windows 和 Unix 路径）
      const normalizedPath = path.normalize(normalizedInput);

      // 判断是否为文件夹（.floder 后缀）
      const isFolderBySuffix = normalizedPath.endsWith(".floder");

      let targetPath;
      if (isFolderBySuffix) {
        // 移除 .floder 后缀，得到实际的文件夹路径
        targetPath = normalizedPath.slice(0, -7); // .floder 长度为 7
      } else {
        targetPath = normalizedPath;
      }

      // 使用 combyFilePath 组合完整的项目路径
      const absoluteTargetPath = combyFilePath(
        infoObject.projectId,
        targetPath
      );

      // 检查路径是否存在（异步）
      let pathExists = false;
      try {
        await fs.access(absoluteTargetPath);
        pathExists = true;
      } catch (e) {
        pathExists = false;
      }
      
      if (!pathExists) {
        const reason = "路径不存在";
        resultsMap[targetPath] = buildFailMessage(reason);
        failedDetails.push({
          file_path: targetPath,
          reason,
        });
        failedDeletions += 1;
        continue;
      }

      // 判断是否为文件夹：
      // 只有以 .floder 结尾的路径才被解析为文件夹
      // 没有后缀名或有具体后缀名的路径都作为文件处理
      const isFolder = isFolderBySuffix;

      // 向前端推送删除开始消息
      chatToFrontend(
        isFolder ? "删除文件夹" + targetPath : "删除文件" + targetPath,
        "delete_file",
        infoObject
      );

      try {
        // 执行删除操作（异步）
        if (isFolder) {
          // 删除文件夹（递归删除所有内容）
          await fs.rm(absoluteTargetPath, { recursive: true, force: true });
        } else {
          // 删除文件
          await fs.unlink(absoluteTargetPath);
        }

        resultsMap[targetPath] = successMessage;
        successfulDeletions += 1;
      } catch (deleteError) {
        recordErrorLog(deleteError, "AgentFunction in delete file");
        const reason = deleteError.message || "删除失败";
        resultsMap[targetPath] = buildFailMessage(reason);
        failedDetails.push({
          file_path: targetPath,
          reason,
        });
        failedDeletions += 1;
      }
    }

    const totalFiles = filePaths.length;
    const summary = {
      total_files: totalFiles,
      successful_deletions: successfulDeletions,
      failed_deletions: failedDeletions,
      failed_details: failedDetails,
    };

    const data = {
      ...resultsMap,
      summary,
    };

    let status = 0;
    let message = "deletefile success";

    if (successfulDeletions === 0 && failedDeletions > 0) {
      status = 1;
      message = "所有文件删除失败";
    } else if (failedDeletions > 0) {
      status = 1;
      message = "部分文件删除失败";
    }

    return {
      status,
      message,
      data,
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in delete file");
    return {
      status: 1,
      message: "deletefile fail",
      data: {
        error: "系统错误请停止工作",
      },
    };
  }
}

module.exports = deleteFile;
