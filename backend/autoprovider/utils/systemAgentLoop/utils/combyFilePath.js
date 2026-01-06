const fs = require("fs");
const path = require("path");
const recordErrorLog = require("../../recordErrorLog");
const getProjectsBasePath = require("../../getProjectsBasePath");

// 使用统一的路径获取函数
const basePath = getProjectsBasePath();

/**
 * 路径修正规则配置
 * 这是一个可扩展的规则列表，用于修正 AI 生成的错误路径
 * format: { pattern: RegExp, replacement: string }
 */
const PATH_RULES = [
  // 开源模板（my-app）：项目根目录就是项目文件夹（含 package.json）
  // AI 可能会错误地生成 /frontend、/backend 前缀，这里统一映射到项目根目录
  { pattern: /^\/frontend(\/|$)/, replacement: "/" },
  { pattern: /^\/backend(\/|$)/, replacement: "/" },
  // 常见误写：把项目根目录当成 /app，再拼一次 Next.js 的 app 目录，形成 /app/app/...
  // 修正为 /app/...
  { pattern: /^\/app\/app(\/|$)/, replacement: "/app/" },
  // 兼容 src 层写法（如果未来模板引入 src）
  { pattern: /^\/src\/frontend(\/|$)/, replacement: "/src/" },
  { pattern: /^\/src\/backend(\/|$)/, replacement: "/src/" },
  // AI 可能错误地把 Docker 容器路径 /app 当成项目根目录前缀
  // 当路径是 /app/xxx 且 xxx 不是 Next.js 的 app 目录下的典型文件时，尝试移除 /app 前缀
  // 注意：这个规则通过特殊标记处理，不在这里直接匹配
  // 可以在此处继续添加更多规则...
];

/**
 * 修正文件路径
 * @param {string} filePath - 原始文件路径
 * @returns {string} 修正后的文件路径
 */
const correctFilePath = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    recordErrorLog("文件路径不能为空", "combyfilepath in correctFilePath");
    return filePath;
  }

  // 1. 统一路径分隔符为 /
  let normalizedPath = filePath.replace(/\\/g, "/");

  // 2. 确保路径以 / 开头，便于统一正则匹配
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = "/" + normalizedPath;
  }

  // 3. 应用修正规则
  for (const rule of PATH_RULES) {
    if (rule.pattern.test(normalizedPath)) {
      const original = normalizedPath;
      normalizedPath = normalizedPath.replace(rule.pattern, rule.replacement);
      break; // 匹配到一个规则后停止，避免冲突
    }
  }

  // 4. 清理可能产生的多余斜杠 (例如 //frontend -> /frontend)
  normalizedPath = normalizedPath.replace(/\/+/g, "/");

  return normalizedPath;
};

/**
 * 组合文件路径
 * @param {string} projectId - 项目ID
 * @param {string} filePath - 文件路径（可能包含错误的根目录）
 * @returns {string} 完整的文件路径
 */
const combyFilePath = (projectId, filePath) => {
  if (!projectId || typeof projectId !== "string") {
    throw new Error("项目ID不能为空");
  }

  if (!filePath || typeof filePath !== "string") {
    throw new Error("文件路径不能为空");
  }

  // 修正文件路径
  const correctedPath = correctFilePath(filePath);

  // 主路径：直接拼接项目根目录
  const primaryPath = path.join(basePath, projectId, correctedPath);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  // Fallback 1: 如果路径以 /app/ 开头但文件不存在，尝试移除 /app 前缀
  // 这是因为 AI 可能把 Docker 容器的 /app 工作目录当成了绝对路径前缀
  if (correctedPath.startsWith("/app/")) {
    const withoutAppPrefix = correctedPath.replace(/^\/app/, "");
    const fallbackPath = path.join(basePath, projectId, withoutAppPrefix);
    if (fs.existsSync(fallbackPath)) {
      return fallbackPath;
    }
  }

  // Fallback 2: 如果路径不以 /app/ 开头，尝试添加 /app 前缀
  // 这是为了兼容 Next.js 的 app 目录结构
  if (!correctedPath.startsWith("/app/") && !correctedPath.startsWith("/app")) {
    const withAppPrefix = path.join(basePath, projectId, "app", correctedPath);
    if (fs.existsSync(withAppPrefix)) {
      return withAppPrefix;
    }
  }

  // 不存在则直接返回主路径，由上层处理错误
  return primaryPath;
};

module.exports = combyFilePath;
