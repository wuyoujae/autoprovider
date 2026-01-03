const path = require("path");

/**
 * 获取项目基础路径
 * 优先级：环境变量 PROJECTS_BASE_PATH > 相对路径（基于当前文件位置）
 * @returns {string} 项目基础路径
 */
const getProjectsBasePath = () => {
  // 如果设置了环境变量，优先使用环境变量
  if (process.env.PROJECTS_BASE_PATH) {
    return process.env.PROJECTS_BASE_PATH;
  }

  // 否则使用相对路径（兼容开发环境）
  // 从当前文件位置计算：utils/getProjectsBasePath.js -> projects
  // 路径层级：utils -> autoprovider -> backend -> 项目根目录
  return path.join(__dirname, "../../../projects");
};

module.exports = getProjectsBasePath;

