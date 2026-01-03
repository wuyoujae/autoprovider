const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const decodeHtmlEntities = require("../systemAgentLoop/utils/decodeHtmlEntities");
const pool = require("../../db");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");
const recordErrorLog = require("../recordErrorLog");

/**
 * 创建单个文件或文件夹（异步版本）
 * @param {string} rawPath - 文件或文件夹路径
 * @param {Object} infoObject - 项目信息对象
 * @param {string} [content=""] - 文件内容（可选，仅对文件有效）
 */
const createSinglePath = async (rawPath, infoObject, content = "") => {
  const normalizedPath = path.normalize(rawPath);

  // 判断是否为文件夹（.floder 后缀）
  const isFolder = normalizedPath.endsWith(".floder");
  const targetPath = isFolder ? normalizedPath.slice(0, -7) : normalizedPath;

  // 使用 combyFilePath 组合完整的项目路径
  const absoluteTargetPath = combyFilePath(infoObject.projectId, targetPath);

  const hasContent = !isFolder && content && content.length > 0;
  chatToFrontend(
    isFolder
      ? `创建文件夹${targetPath}`
      : hasContent
      ? `创建文件${targetPath}`
      : `创建文件${targetPath}`,
    "create_file",
    infoObject
  );

  // 获取父目录
  const parentDir = path.dirname(absoluteTargetPath);

  // 确保父目录存在（递归创建，异步）
  if (parentDir && parentDir !== "." && parentDir !== absoluteTargetPath) {
    try {
      await fs.access(parentDir);
    } catch (e) {
      await fs.mkdir(parentDir, { recursive: true });
    }
  }

  // 检查目标路径是否已存在（异步）
  let targetExists = false;
  try {
    await fs.access(absoluteTargetPath);
    targetExists = true;
  } catch (e) {
    targetExists = false;
  }

  // 创建文件或文件夹（异步）
  if (isFolder) {
    if (!targetExists) {
      await fs.mkdir(absoluteTargetPath, { recursive: true });
    }
  } else {
    // 文件：如果不存在则创建，如果有内容则写入（覆盖空文件）
    // 如果文件已存在且有内容参数，也写入（支持创建时带内容）
    if (!targetExists || hasContent) {
      await fs.writeFile(absoluteTargetPath, content || "", "utf-8");
    }
  }

  return { targetPath, hasContent, contentLength: content?.length || 0 };
};

/**
 * 创建文件或文件夹
 * @param {Object} payload - 函数参数对象
 * @param {Array<{file_path: string, content: string}>} [payload.files] - 带内容的文件数组（新格式，推荐）
 * @param {string[]} [payload.file_names] - 文件/文件夹路径数组（旧格式，兼容）
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function createFile(payload = {}, infoObject = {}) {
  try {
    const resultMap = {};
    const failedDetails = [];
    const itemsByType = {
      files: 0,
      folders: 0,
      files_with_content: 0,
    };
    let successfulCreations = 0;
    let failedCreations = 0;

    const getItemType = (rawPath) =>
      typeof rawPath === "string" && rawPath.endsWith(".floder")
        ? "folder"
        : "file";

    const buildSuccessMessage = (hasContent, contentLength) =>
      hasContent
        ? `创建结果：create success【已写入 ${contentLength} 字符】`
        : "创建结果：create success";

    const buildFailMessage = (reason) =>
      `创建结果：create fail【${reason || "未知错误"}】`;

    // 参数验证
    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "createfile fail",
        data: {
          error: "平台系统问题出错，请暂停工作",
        },
      };
    }

    // 从 payload 中获取参数（支持新旧两种格式）
    const files = payload?.files; // 新格式：[{file_path, content}]
    const fileNames = payload?.file_names; // 旧格式：["/path/to/file"]

    // 容错处理：如果 files 是字符串，尝试 JSON.parse
    let parsedFiles = files;
    if (typeof files === "string") {
      try {
        parsedFiles = JSON.parse(files);
        console.log("[createFile] 已自动解析字符串形式的 files 数组");
      } catch (parseError) {
        return {
          status: 1,
          message: "createfile fail",
          data: {
            error: "files 参数格式错误，无法解析为数组",
          },
        };
      }
    }

    // 参数验证：至少需要 files 或 file_names 其中之一
    const hasFiles =
      parsedFiles && Array.isArray(parsedFiles) && parsedFiles.length > 0;
    const hasFileNames =
      fileNames && Array.isArray(fileNames) && fileNames.length > 0;

    if (!hasFiles && !hasFileNames) {
      return {
        status: 1,
        message: "createfile fail",
        data: {
          error:
            "请提供 files 数组（推荐，支持带内容创建）或 file_names 数组。files 格式：[{file_path: '/path', content: 'code'}]",
        },
      };
    }

    // 处理新格式：files 数组（带内容）
    if (hasFiles) {
      for (const fileObj of parsedFiles) {
        const rawPath = fileObj?.file_path;
        const content = fileObj?.content || "";

        if (!rawPath || typeof rawPath !== "string") {
          const reason = "file_path 必须是非空字符串";
          resultMap[String(rawPath)] = buildFailMessage(reason);
          failedDetails.push({
            file_path: String(rawPath),
            reason,
            type: "file",
          });
          failedCreations += 1;
          continue;
        }

        // 解码 HTML 实体
        const decodedPath = decodeHtmlEntities(rawPath);
        const decodedContent =
          typeof content === "string" ? decodeHtmlEntities(content) : "";

        try {
          const result = await createSinglePath(
            decodedPath,
            infoObject,
            decodedContent
          );
          resultMap[decodedPath] = buildSuccessMessage(
            result.hasContent,
            result.contentLength
          );
          itemsByType.files += 1;
          if (result.hasContent) {
            itemsByType.files_with_content += 1;
          }
          successfulCreations += 1;
        } catch (error) {
          recordErrorLog(error, "AgentFunction in create file (files)");
          const reason = error.message || "创建失败";
          resultMap[decodedPath] = buildFailMessage(reason);
          failedDetails.push({
            file_path: decodedPath,
            reason,
            type: "file",
          });
          failedCreations += 1;
        }
      }
    }

    // 处理旧格式：file_names 数组（兼容）
    if (hasFileNames) {
      for (const rawPath of fileNames) {
        const itemType = getItemType(rawPath);
        itemsByType[itemType === "folder" ? "folders" : "files"] += 1;

        if (!rawPath || typeof rawPath !== "string") {
          const reason = "路径必须是非空字符串";
          resultMap[String(rawPath)] = buildFailMessage(reason);
          failedDetails.push({
            file_path: String(rawPath),
            reason,
            type: itemType,
          });
          failedCreations += 1;
          continue;
        }

        // 解码 HTML 实体
        const decodedPath = decodeHtmlEntities(rawPath);

        try {
          const result = await createSinglePath(decodedPath, infoObject, "");
          resultMap[decodedPath] = buildSuccessMessage(false, 0);
          successfulCreations += 1;
        } catch (error) {
          recordErrorLog(error, "AgentFunction in create file (file_names)");
          const reason = error.message || "创建失败";
          resultMap[decodedPath] = buildFailMessage(reason);
          failedDetails.push({
            file_path: decodedPath,
            reason,
            type: itemType,
          });
          failedCreations += 1;
        }
      }
    }

    const totalItems =
      (hasFiles ? parsedFiles.length : 0) +
      (hasFileNames ? fileNames.length : 0);
    const summary = {
      total_items: totalItems,
      successful_creations: successfulCreations,
      failed_creations: failedCreations,
      items_by_type: itemsByType,
      failed_details: failedDetails,
    };

    const hasSuccess = successfulCreations > 0;
    const status = hasSuccess ? 0 : 1;
    let message = "createfile success";

    if (!hasSuccess) {
      message = "所有文件创建失败";
    } else if (failedCreations > 0) {
      message = "部分文件创建失败";
    }

    const data = {
      ...resultMap,
      summary,
    };

    return {
      status,
      message,
      data,
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in create file");
    return {
      status: 1,
      message: "createfile fail",
      data: {
        error: "系统错误请停止工作",
      },
    };
  }
}

module.exports = createFile;
