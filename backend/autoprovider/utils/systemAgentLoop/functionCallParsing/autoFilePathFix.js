const path = require("path");

/**
 * 路径自动修正器
 * 模板已统一为 Next.js 单体项目，根目录为 /app
 * 兼容旧输入：/frontend、/backend、/src/frontend、/src/backend
 *
 * @param {Object} params
 * @param {Object} params.functionParams - 函数参数对象
 * @param {string} params.functionName - 函数名（如 "createFile"）
 * @returns {Object} 修正后的函数参数对象
 */
const autoFilePathFix = ({ functionParams, functionName }) => {
  try {
    console.log("\n[autoFilePathFix] ========== 开始路径自动修正 ==========");
    console.log(`[autoFilePathFix] 函数名: ${functionName}`);
    console.log(
      `[autoFilePathFix] 原始参数:`,
      JSON.stringify(functionParams, null, 2)
    );

    // 需要修正路径的函数列表
    const fileOperationFunctions = [
      "createFile",
      "readFile",
      "editFile",
      "deleteFile",
    ];

    // 如果不是文件操作函数，直接返回
    if (!fileOperationFunctions.includes(functionName)) {
      console.log(
        `[autoFilePathFix] ⚠️ 函数 ${functionName} 不需要路径修正，跳过`
      );
      return functionParams;
    }

    // 需要修正的路径字段名列表
    const pathFields = ["fileName", "path", "fullPath", "targetPath", "file"];

    // 创建修正后的参数对象副本
    const correctedParams = { ...functionParams };
    let hasCorrection = false;

    // 遍历所有可能的路径字段
    for (const field of pathFields) {
      if (
        correctedParams[field] &&
        typeof correctedParams[field] === "string"
      ) {
        const originalPath = correctedParams[field];
        const correctedPath = correctFilePath(originalPath);

        if (correctedPath !== originalPath) {
          console.log(
            `[autoFilePathFix] 🔧 修正字段 ${field}: ${originalPath} -> ${correctedPath}`
          );
          correctedParams[field] = correctedPath;
          hasCorrection = true;
        }
      }
    }

    // 如果参数是数组（如 createFile 可能接收多个 fileName）
    if (Array.isArray(correctedParams.fileName)) {
      const correctedArray = correctedParams.fileName.map((filePath) => {
        if (typeof filePath === "string") {
          const corrected = correctFilePath(filePath);
          if (corrected !== filePath) {
            console.log(
              `[autoFilePathFix] 🔧 修正数组项: ${filePath} -> ${corrected}`
            );
            hasCorrection = true;
          }
          return corrected;
        }
        return filePath;
      });
      correctedParams.fileName = correctedArray;
    }

    if (hasCorrection) {
      console.log(
        `[autoFilePathFix] ✅ 路径修正完成，修正后的参数:`,
        JSON.stringify(correctedParams, null, 2)
      );
    } else {
      console.log(`[autoFilePathFix] ℹ️ 未发现需要修正的路径`);
    }

    console.log("[autoFilePathFix] ========== 路径自动修正完成 ==========\n");

    return correctedParams;
  } catch (error) {
    console.error("[autoFilePathFix] ❌ 路径自动修正失败:", error.message);
    // 失败时返回原始参数
    return functionParams;
  }
};

/**
 * 修正单个文件路径
 * @param {string} filePath - 原始文件路径
 * @returns {string} 修正后的文件路径
 */
const correctFilePath = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    return filePath;
  }

  // 规范化路径分隔符（统一使用 /）
  let normalizedPath = filePath.replace(/\\/g, "/");

  // 保留单个前导斜杠
  normalizedPath = normalizedPath.replace(/^\/+/, "/");
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = "/" + normalizedPath;
  }

  // 统一到 /app 根目录（兼容旧写法）
  if (/^\/frontend(\/|$)/.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/frontend(\/|$)/, "/app/");
  } else if (/^\/backend(\/|$)/.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/backend(\/|$)/, "/app/");
  } else if (/^\/src\/frontend(\/|$)/.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/src\/frontend(\/|$)/, "/app/src/");
  } else if (/^\/src\/backend(\/|$)/.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/src\/backend(\/|$)/, "/app/src/");
  } else if (/^\/src\//.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/src\//, "/app/src/");
  } else if (!/^\/app(\/|$)/.test(normalizedPath)) {
    // 其他情况强制前缀 /app
    normalizedPath = "/app" + normalizedPath;
  }

  // 清理多余斜杠
  normalizedPath = normalizedPath.replace(/\/+/g, "/");

  return normalizedPath;
};

module.exports = autoFilePathFix;
