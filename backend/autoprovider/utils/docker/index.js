/**
 * Docker 工具模块
 * 提供所有 Docker 操作的统一入口
 */

const {
  docker,
  dockerConfig,
  testConnection,
  getVersion,
  isAvailable,
} = require("./client");

module.exports = {
  // Docker 客户端实例
  docker,
  dockerConfig,

  // 连接与状态
  testConnection,
  getVersion,
  isAvailable,
};

