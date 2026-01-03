const fs = require("fs").promises;
const path = require("path");
const recordErrorLog = require("../../recordErrorLog");
const getProjectsBasePath = require("../../getProjectsBasePath");
const chatToFrontend = require("../functionChatToFrontend/chatToFrontend");

const BASE_DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  "out",
  "logs",
  "tmp",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
  ".DS_Store",
  "*.log",
  "*.lock",
  "*.zip",
  "*.tar",
  "*.gz",
  "*.tgz",
  "*.rar",
  "*.7z",
  "*.exe",
  "*.dll",
  "*.so",
  "*.dylib",
  "*.bin",
  "*.pdf",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.bmp",
  "*.ico",
  "*.db",
  "*.sqlite",
];

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isIgnored = (segments, ignoreSet) => {
  return segments.some((seg) => ignoreSet.has(seg));
};

const shouldSkipFile = (stat, maxFileSize) => {
  if (!stat.isFile()) return true;
  // 跳过超大文件，避免阻塞
  return stat.size > maxFileSize;
};

const loadIgnoreFromFile = async () => {
  try {
    const ignorePath = path.join(__dirname, ".grepignore");
    const content = await fs.readFile(ignorePath, "utf-8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch (_) {
    return [];
  }
};

/**
 * 递归遍历并查找包含关键字的文件
 */
const walkAndSearch = async ({
  root,
  keywordReg,
  ignoreSet,
  maxFileSize,
  maxMatches,
}) => {
  const results = [];
  let filesScanned = 0;
  let skippedFiles = 0;

  const walk = async (dir) => {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      // 读取目录失败时仅记录，继续下一个
      recordErrorLog(err, "grep_file readdir");
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relFromRoot = path.relative(root, fullPath);
      const segments = relFromRoot.split(path.sep);

      if (isIgnored(segments, ignoreSet)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch (e) {
        skippedFiles += 1;
        continue;
      }

      if (shouldSkipFile(stat, maxFileSize)) {
        skippedFiles += 1;
        continue;
      }

      filesScanned += 1;

      let content;
      try {
        content = await fs.readFile(fullPath, "utf-8");
      } catch (e) {
        skippedFiles += 1;
        continue;
      }

      if (!keywordReg.test(content)) continue;

      results.push({
        file_path: "/" + relFromRoot.replace(/\\/g, "/"),
        match_count: 1, // 至少命中过一次，具体行不再返回
      });

      if (results.length >= maxMatches) return;
    }
  };

  await walk(root);

  return { results, filesScanned, skippedFiles };
};

/**
 * 在项目内搜索包含关键字的文件（类似 VSCode 全局搜索）
 * @param {Object} payload
 * @param {string} payload.keyword - 需要搜索的字符串/关键词
 * @param {boolean} [payload.case_sensitive=false] - 是否区分大小写
 * @param {string[]} [payload.ignore_paths=[]] - 需要忽略的目录或路径片段
 * @param {number} [payload.max_results=200] - 最多返回多少个命中文件
 * @param {number} [payload.max_file_size_mb=2] - 单文件最大扫描体积（MB）
 */
async function grepFile(payload = {}, infoObject = {}) {
  try {
    const keyword = payload?.keyword;
    const caseSensitive = Boolean(payload?.case_sensitive);
    const ignorePaths = Array.isArray(payload?.ignore_paths)
      ? payload.ignore_paths
      : [];
    const maxResults =
      typeof payload?.max_results === "number" && payload.max_results > 0
        ? payload.max_results
        : 200;
    const maxFileSizeMb =
      typeof payload?.max_file_size_mb === "number" &&
      payload.max_file_size_mb > 0
        ? payload.max_file_size_mb
        : 2;

    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "grepfile fail",
        data: { error: "系统问题出错，请暂停工作" },
      };
    }

    if (!keyword || typeof keyword !== "string") {
      return {
        status: 1,
        message: "grepfile fail",
        data: { error: "keyword 不能为空，且必须为字符串" },
      };
    }

    const projectRoot = path.join(getProjectsBasePath(), infoObject.projectId);
    const fileIgnores = await loadIgnoreFromFile();
    const ignoreSet = new Set([
      ...BASE_DEFAULT_IGNORES,
      ...fileIgnores,
      ...ignorePaths,
    ]);
    const keywordReg = new RegExp(
      escapeRegExp(keyword),
      caseSensitive ? "" : "i"
    );

    // 通知前端开始搜索
    chatToFrontend(`搜索关键词: ${keyword}`, "grep_file", infoObject);

    const { results } = await walkAndSearch({
      root: projectRoot,
      keywordReg,
      ignoreSet,
      maxFileSize: maxFileSizeMb * 1024 * 1024,
      maxMatches: maxResults,
    });

    return {
      status: 0,
      message: "grepfile success",
      data: {
        matches: results,
      },
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in grep file");
    return {
      status: 1,
      message: "grepfile fail",
      data: { error: error?.message || "系统错误请暂停工作" },
    };
  }
}

module.exports = grepFile;
