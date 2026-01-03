const fs = require("fs").promises;
const combyFilePath = require("../../../combyFilePath");
const recordErrorLog = require("../../../../../recordErrorLog");

/**
 * 读取单个文件（简化版，只返回内容）
 * @param {string} relativePath - 相对路径（项目内）
 * @param {Object} infoObject - 需要包含 projectId
 * @returns {Promise<string>} 文件内容
 */
const miniReadFile = async (relativePath, infoObject = {}) => {
  if (!infoObject.projectId) {
    throw new Error("miniReadFile: projectId 不能为空");
  }
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("miniReadFile: relativePath 不能为空");
  }

  try {
    const absPath = combyFilePath(infoObject.projectId, relativePath);
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) {
      throw new Error(`路径不是文件: ${absPath}`);
    }
    const content = await fs.readFile(absPath, "utf-8");
    return content;
  } catch (error) {
    recordErrorLog(error, "miniReadFile");
    throw error;
  }
};

module.exports = miniReadFile;
