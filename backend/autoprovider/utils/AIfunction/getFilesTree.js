const fsSync = require("fs");
const path = require("path");

/**
 * 解析 .autoignore 文件，返回忽略规则数组（同步版本，因为文件树生成需要快速响应）
 * 注意：getFilesTree 是同步函数，被 contentStandardization 调用
 * 如果需要完全异步化，需要修改 contentStandardization 及其调用链
 * @param {string} ignoreFilePath - .autoignore 文件路径
 * @returns {string[]} 忽略规则数组
 */
function parseAutoIgnore(ignoreFilePath) {
  if (!fsSync.existsSync(ignoreFilePath)) {
    return [];
  }

  const content = fsSync.readFileSync(ignoreFilePath, "utf-8");
  const rules = [];

  content.split("\n").forEach((line) => {
    // 去除首尾空白
    line = line.trim();

    // 跳过空行和注释
    if (!line || line.startsWith("#")) {
      return;
    }

    rules.push(line);
  });

  return rules;
}

/**
 * 检查路径是否匹配忽略规则
 * @param {string} filePath - 完整文件路径
 * @param {string} relativePath - 相对路径
 * @param {string[]} ignoreRules - 忽略规则数组
 * @param {boolean} isDirectory - 是否为目录
 * @returns {boolean} 是否应该忽略
 */
function shouldIgnore(filePath, relativePath, ignoreRules, isDirectory) {
  // 规范化路径分隔符为 /
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const pathParts = normalizedPath.split("/").filter((p) => p);

  for (const rule of ignoreRules) {
    // 处理否定规则（以 ! 开头）
    if (rule.startsWith("!")) {
      continue; // 简化处理，暂时跳过否定规则
    }

    let pattern = rule.trim();
    const isDirRule = pattern.endsWith("/");
    if (isDirRule) {
      pattern = pattern.slice(0, -1);
    }

    // 处理以 / 开头的规则（从根目录开始匹配）
    const isRootRule = pattern.startsWith("/");
    if (isRootRule) {
      pattern = pattern.slice(1);
    }

    // 转换通配符为正则表达式
    // ** 匹配任意层级目录
    // * 匹配单层目录/文件名（不包含 /）
    let regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, "___DOUBLE_STAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___DOUBLE_STAR___/g, ".*");

    // 如果是目录规则，只匹配目录
    if (isDirRule && !isDirectory) {
      continue;
    }

    // 检查完整路径匹配
    const fullPathRegex = new RegExp(`^${regexPattern}$`);
    if (fullPathRegex.test(normalizedPath)) {
      return true;
    }

    // 检查路径中的任何部分是否匹配（包括目录名本身）
    for (let i = 0; i < pathParts.length; i++) {
      const subPath = pathParts.slice(i).join("/");
      if (fullPathRegex.test(subPath)) {
        return true;
      }
      // 也检查单个路径部分（目录名）
      if (fullPathRegex.test(pathParts[i])) {
        return true;
      }
    }

    // 检查文件名匹配（对于非根规则）
    if (!isRootRule) {
      const fileName = path.basename(relativePath);
      const fileNameRegex = new RegExp(`^${regexPattern}$`);
      if (fileNameRegex.test(fileName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 递归构建文件树（同步版本）
 * 注意：保持同步是因为 getFilesTree 被 contentStandardization 同步调用
 * @param {string} dirPath - 目录路径
 * @param {string} relativePath - 相对路径
 * @param {string[]} ignoreRules - 忽略规则数组
 * @param {string} rootPath - 根路径
 * @returns {Object|null} 文件树节点或 null
 */
function buildFileTree(dirPath, relativePath, ignoreRules, rootPath) {
  const fullPath = relativePath ? path.join(dirPath, relativePath) : dirPath;
  const stat = fsSync.statSync(fullPath);
  const isDirectory = stat.isDirectory();

  // 检查当前路径是否被忽略
  if (shouldIgnore(fullPath, relativePath || "", ignoreRules, isDirectory)) {
    // 如果是目录且被忽略，返回一个标记为忽略的节点
    if (isDirectory) {
      return {
        name: path.basename(relativePath) || path.basename(rootPath),
        isDirectory: true,
        isIgnored: true,
      };
    }
    // 文件被忽略则返回 null
    return null;
  }

  if (stat.isDirectory()) {
    const children = [];

    try {
      const entries = fsSync.readdirSync(fullPath);

      for (const entry of entries) {
        const entryRelativePath = relativePath
          ? path.join(relativePath, entry)
          : entry;

        const childNode = buildFileTree(
          rootPath,
          entryRelativePath,
          ignoreRules,
          rootPath
        );

        if (childNode) {
          children.push(childNode);
        }
      }

      // 按目录优先，然后按名称排序
      children.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      // 如果无法读取目录，跳过
      console.error(`无法读取目录: ${fullPath}`, error);
    }

    return {
      name:
        path.basename(relativePath) || relativePath || path.basename(rootPath),
      isDirectory: true,
      children,
    };
  } else {
    return {
      name: path.basename(relativePath),
      isDirectory: false,
    };
  }
}

/**
 * 将文件树转换为 markdown 格式
 * @param {Object} node - 文件树节点
 * @param {string} prefix - 前缀字符串
 * @param {boolean} isLast - 是否为最后一个节点
 * @returns {string} markdown 格式的字符串
 */
function treeToMarkdown(node, prefix = "", isLast = true) {
  const connector = isLast ? "└── " : "├── ";
  // 如果是目录且名称不以 / 结尾，添加 /
  let displayName = node.name;
  if (node.isDirectory && !displayName.endsWith("/")) {
    displayName += "/";
  }
  let result = prefix + connector + displayName + "\n";

  if (node.isDirectory && !node.isIgnored && node.children) {
    const newPrefix = prefix + (isLast ? "    " : "│   ");
    const childrenCount = node.children.length;

    node.children.forEach((child, index) => {
      const isLastChild = index === childrenCount - 1;
      result += treeToMarkdown(child, newPrefix, isLastChild);
    });
  }

  return result;
}

/**
 * 获取文件树（同步版本）
 * 注意：保持同步是因为这个函数被 contentStandardization 同步调用
 * 如果要完全异步化，需要修改整个调用链
 * @param {string} projectPath - 项目路径，例如：/10082/app
 * @returns {string} markdown 格式的文件树字符串，包含 ```file-tree 代码块
 */
function getFilesTree(projectPath) {
  // 检查路径是否存在
  if (!fsSync.existsSync(projectPath)) {
    throw new Error(`路径不存在: ${projectPath}`);
  }

  // 检查是否是目录
  const stat = fsSync.statSync(projectPath);
  if (!stat.isDirectory()) {
    throw new Error(`路径不是目录: ${projectPath}`);
  }

  // 读取 .autoignore 文件
  const ignoreFilePath = path.join(projectPath, ".autoignore");
  const ignoreRules = parseAutoIgnore(ignoreFilePath);

  // 构建文件树（root 仅作为容器，不输出项目名以避免重复拼接）
  const rootNode = buildFileTree(projectPath, "", ignoreRules, projectPath);

  if (!rootNode || !rootNode.children || rootNode.children.length === 0) {
    return "```file-tree\n\n```";
  }

  // 直接输出子节点，避免在树中包含 projectId 作为顶层目录
  const treeContent = rootNode.children
    .map((child, idx) =>
      treeToMarkdown(child, "", idx === rootNode.children.length - 1)
    )
    .join("");

  // 返回带代码块的格式
  return `\`\`\`file-tree\n${treeContent}\`\`\``;
}

module.exports = getFilesTree;
