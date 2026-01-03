const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// Add demo/node_modules to search path
module.paths.push(path.resolve(__dirname, "../demo/node_modules"));

const OpenAI = require("openai");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const decodeHtmlEntities = require("../systemAgentLoop/utils/decodeHtmlEntities");
const pool = require("../../db");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");
const recordErrorLog = require("../recordErrorLog");
const { getLLMConfigSync, getLLMConfig } = require("../llmConfig");

// ============ LLM 配置 ============

const str = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};
const num = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
// tokenLimit 专用：确保有合理的最小值
const tokenLimitNum = (value, fallback = 130000) => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  const MIN_TOKEN_LIMIT = 10000;
  return Number.isFinite(n) && n >= MIN_TOKEN_LIMIT ? n : fallback;
};
const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

// ============ 从数据库读取用户配置的模型 ============
const buildModelConfig = () => {
  try {
    const cfg = getLLMConfigSync();
    const list = Array.isArray(cfg?.editFileModels) ? cfg.editFileModels : [];
    const api = {};
    const priority = [];

    list.forEach((item, idx) => {
      const baseUrl = str(item?.baseUrl);
      const modelName = str(item?.model);
      const apiKey = str(item?.apiKey);
      if (!baseUrl || !modelName || !apiKey) return;
      const tokenLimit = tokenLimitNum(item?.tokenLimit, 130000);
      const provider = `edit_${idx + 1}`;
      api[provider] = {
        baseUrl,
        apiKey,
        model: modelName,
        tokenLimit,
      };
      priority.push(provider);
    });

    if (priority.length > 0) {
      console.log(
        `[editFile] 加载 EditFile 模型配置，共 ${priority.length} 个`
      );
    } else {
      console.log(
        "[editFile] ⚠️ 未配置任何 EditFile 模型，请在设置页面添加模型"
      );
    }

    return { api, priority };
  } catch (error) {
    console.log("[editFile] 读取模型配置失败:", error.message);
    return { api: {}, priority: [] };
  }
};

let API = {};
let MODEL_PRIORITY = [];

const setModelConfig = (list, source = "cache") => {
  const api = {};
  const priority = [];

  list.forEach((item, idx) => {
    const baseUrl = str(item?.baseUrl);
    const modelName = str(item?.model);
    const apiKey = str(item?.apiKey);
    if (!baseUrl || !modelName || !apiKey) return;
    const tokenLimit = num(item?.tokenLimit, 130000);
    const provider = `edit_${idx + 1}`;
    api[provider] = {
      baseUrl,
      apiKey,
      model: modelName,
      tokenLimit,
    };
    priority.push(provider);
  });

  API = api;
  MODEL_PRIORITY = priority;

  if (priority.length > 0) {
    console.log(
      `[editFile] 加载 EditFile 模型配置（${source}），共 ${priority.length} 个`
    );
  } else {
    console.log("[editFile] ⚠️ 未配置任何 EditFile 模型，请在设置页面添加模型");
  }
};

const cacheCfg = getLLMConfigSync();
setModelConfig(cacheCfg?.editFileModels || [], "cache");

const loadModelConfigAsync = async () => {
  try {
    const cfg = await getLLMConfig();
    setModelConfig(cfg?.editFileModels || [], "db");
    resetModelIndex();
  } catch (error) {
    console.log("[editFile] 从数据库读取模型失败:", error.message);
  }
};

const getConfigByIndex = (index) => {
  if (index >= MODEL_PRIORITY.length) return null;
  const provider = MODEL_PRIORITY[index];
  const cfg = API[provider];
  if (
    !cfg ||
    !hasValue(cfg.baseUrl) ||
    !hasValue(cfg.apiKey) ||
    !hasValue(cfg.model)
  ) {
    return null;
  }
  return { ...cfg, provider };
};

const findNextAvailableConfig = (startIndex = 0) => {
  let idx = startIndex;
  while (idx < MODEL_PRIORITY.length) {
    const cfg = getConfigByIndex(idx);
    if (cfg) {
      return { cfg, index: idx };
    }
    idx++;
  }
  return { cfg: null, index: MODEL_PRIORITY.length };
};

let currentModelIndex = 0;

// 获取当前模型配置
const getCurrentConfig = () => currentConfig;

// 创建 OpenAI 客户端
const createLLMClient = (config) => {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    timeout: 120000, // 2分钟超时，editFile 追求速度
    maxRetries: 1,
  });
};

// 切换到下一个模型
const switchToNextModel = () => {
  const { cfg, index } = findNextAvailableConfig(currentModelIndex + 1);
  if (!cfg) {
    console.log("[editFile] ❌ 所有模型都已尝试，无可用模型");
    return null;
  }
  currentModelIndex = index;
  currentConfig = cfg;
  llmClient = createLLMClient(cfg);
  console.log(`[editFile] 🔄 切换到模型: ${cfg.provider}/${cfg.model}`);
  return cfg;
};

// 重置模型索引
const resetModelIndex = () => {
  const { cfg, index } = findNextAvailableConfig(0);
  currentModelIndex = cfg ? index : 0;
  currentConfig = cfg;
  if (!cfg) {
    llmClient = null;
    return;
  }
  llmClient = createLLMClient(cfg);
};

// 初始化
const { cfg: initialModelCfg, index: initialIndex } =
  findNextAvailableConfig(0);
currentModelIndex = initialModelCfg ? initialIndex : 0;
let currentConfig = initialModelCfg;
let llmClient = initialModelCfg ? createLLMClient(initialModelCfg) : null;

setImmediate(() => {
  loadModelConfigAsync();
});

// ============ 响应构建 ============

/**
 * 计算简单的行级变更统计
 * @param {string} original - 原始内容
 * @param {string} modified - 修改后内容
 * @returns {Object} 变更统计
 */
const calculateChangeSummary = (original, modified) => {
  const originalLines = (original || "").split("\n");
  const modifiedLines = (modified || "").split("\n");

  const originalLineCount = originalLines.length;
  const modifiedLineCount = modifiedLines.length;
  const lineDiff = modifiedLineCount - originalLineCount;

  // 简单估算：比较行数变化
  let addedLines = 0;
  let removedLines = 0;
  let modifiedLinesCount = 0;

  if (lineDiff > 0) {
    addedLines = lineDiff;
  } else if (lineDiff < 0) {
    removedLines = Math.abs(lineDiff);
  }

  // 估算修改的行数（非精确，但够用）
  const minLines = Math.min(originalLineCount, modifiedLineCount);
  for (let i = 0; i < minLines; i++) {
    if (originalLines[i] !== modifiedLines[i]) {
      modifiedLinesCount++;
    }
  }

  // 生成变更预览（最多显示前 3 个变更行）
  const changedLineNumbers = [];
  for (let i = 0; i < minLines && changedLineNumbers.length < 3; i++) {
    if (originalLines[i] !== modifiedLines[i]) {
      changedLineNumbers.push(i + 1);
    }
  }

  return {
    originalLineCount,
    modifiedLineCount,
    lineDiff,
    addedLines,
    removedLines,
    modifiedLinesCount,
    changedLineNumbers,
  };
};

/**
 * 生成人类可读的变更描述
 * @param {Object} changeSummary - calculateChangeSummary 的返回值
 * @param {boolean} isNewFile - 是否为新文件
 * @returns {string} 变更描述
 */
const generateChangeDescription = (changeSummary, isNewFile) => {
  if (isNewFile) {
    return `创建了新文件，共 ${changeSummary.modifiedLineCount} 行`;
  }

  const parts = [];

  if (changeSummary.addedLines > 0) {
    parts.push(`新增 ${changeSummary.addedLines} 行`);
  }
  if (changeSummary.removedLines > 0) {
    parts.push(`删除 ${changeSummary.removedLines} 行`);
  }
  if (changeSummary.modifiedLinesCount > 0) {
    parts.push(`修改 ${changeSummary.modifiedLinesCount} 行`);
  }

  if (parts.length === 0) {
    return "文件内容未发生变化";
  }

  let description = parts.join("，");

  if (changeSummary.changedLineNumbers.length > 0) {
    description += `（变更位置: 第 ${changeSummary.changedLineNumbers.join(
      ", "
    )} 行附近）`;
  }

  return description;
};

const buildEditResponse = ({
  status,
  message,
  filePathResult,
  originalLength = 0,
  newLength = 0,
  originalContent = "",
  newContent = "",
  isNewFile = false,
  targetFile = "",
}) => {
  // 计算变更摘要
  const changeSummary = calculateChangeSummary(originalContent, newContent);
  const changeDescription = generateChangeDescription(changeSummary, isNewFile);

  return {
    status,
    message,
    data: {
      file_path: filePathResult,
      target_file: targetFile,
      is_new_file: isNewFile,
      summary: {
        original_length: originalLength,
        new_length: newLength,
        original_line_count: changeSummary.originalLineCount,
        new_line_count: changeSummary.modifiedLineCount,
        lines_added: changeSummary.addedLines,
        lines_removed: changeSummary.removedLines,
        lines_modified: changeSummary.modifiedLinesCount,
        change_description: changeDescription,
      },
      // AI 友好的简短描述
      ai_summary: isNewFile
        ? `成功创建文件 ${targetFile}，${changeSummary.modifiedLineCount} 行代码`
        : `成功编辑文件 ${targetFile}，${changeDescription}`,
    },
  };
};

// ============ LLM API 调用 ============

/**
 * 调用 LLM API (OpenAI 兼容格式) - 支持自动切换模型
 * @param {string} systemPrompt - 系统提示
 * @param {string} userMessage - 用户消息
 * @returns {Promise<string>} LLM 响应内容
 */
async function callLLM(systemPrompt, userMessage) {
  let lastError = null;
  let attempts = 0;
  const maxAttempts = MODEL_PRIORITY.length;

  // 每次调用重置到第一个模型
  resetModelIndex();
  currentConfig = getCurrentConfig();
  llmClient = createLLMClient(currentConfig);

  while (attempts < maxAttempts) {
    try {
      const config = getCurrentConfig();
      console.log(
        `[editFile] 🤖 尝试调用模型: ${config?.provider}/${
          config?.model
        } (尝试: ${attempts + 1})`
      );

      const response = await llmClient.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0,
        max_tokens: 8192,
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("LLM response empty");
      }

      console.log(`[editFile] ✅ 模型 ${config?.provider} 调用成功`);
      return content;
    } catch (error) {
      lastError = error;
      const config = getCurrentConfig();
      console.log(
        `[editFile] ❌ 模型 ${config?.provider} 调用失败: ${error.message}`
      );

      // 尝试切换到下一个模型
      const nextConfig = switchToNextModel();
      attempts++;

      if (!nextConfig) {
        break;
      }

      // 更新客户端
      llmClient = createLLMClient(nextConfig);
    }
  }

  // 所有模型都失败了
  const message =
    lastError?.response?.data?.error?.message ||
    lastError?.message ||
    "所有 LLM 模型调用失败";
  throw new Error(message);
}

// ============ 编辑应用逻辑 ============

/**
 * 构建系统提示词
 */
// 读取外部 prompt（agent/editfilePrompt.md），并做缓存
let cachedEditFilePrompt = null;
async function getEditFilePrompt() {
  if (cachedEditFilePrompt) return cachedEditFilePrompt;
  const promptPath = path.resolve(__dirname, "../../agent/editfilePrompt.md");
  cachedEditFilePrompt = await fs.readFile(promptPath, "utf-8");
  return cachedEditFilePrompt;
}

/**
 * 构建用户消息
 */
function buildUserMessage(originalContent, codeEdit, instructions, filePath) {
  return `## 文件路径
${filePath}

## 编辑说明
${instructions}

## 原始文件内容
\`\`\`
${originalContent}
\`\`\`

## 编辑指令 (code_edit)
\`\`\`
${codeEdit}
\`\`\`

请输出应用编辑后的完整文件内容：`;
}

/**
 * 检查是否包含 existing code 标记
 */
function hasExistingCodeMarker(codeEdit) {
  const pattern =
    /(?:\/\/|#|--|\/\*|<!--)\s*\.\.\.\s*existing\s+code\s*\.\.\..*?(?:\*\/|-->)?/i;
  return pattern.test(codeEdit);
}

/**
 * 清理 LLM 输出
 */
function cleanLLMOutput(output) {
  let cleaned = output.trim();

  // 移除开头的 markdown 代码块标记
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
  }

  // 移除结尾的 markdown 代码块标记
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  return cleaned.trim();
}

/**
 * 构建智能合并的系统提示词（无 existing code 标记时使用）
 */
function buildSmartMergePrompt() {
  return `你是一个代码编辑助手。你的任务是将用户提供的代码片段智能合并到原始文件中。

## 规则：

1. 用户会提供：
   - 原始文件的完整内容
   - 要修改/添加的代码片段
   - 编辑说明（instructions）

2. 你需要根据编辑说明理解用户的意图：
   - 如果是修改某个函数/方法，找到对应位置替换
   - 如果是添加新代码，找到合适的位置插入
   - 保留原文件中不相关的部分（如 template、style 等）

3. 输出要求：
   - 只输出最终的完整文件内容
   - 不要有任何解释或 markdown 代码块标记
   - 保持原始文件的结构和格式
   - 确保代码语法正确`;
}

/**
 * 应用编辑到原始文件（使用 LLM）
 * @param {string} originalContent - 原始文件内容
 * @param {string} codeEdit - 编辑指令
 * @param {string} filePath - 文件路径
 * @param {string} instructions - 编辑说明
 * @returns {Promise<string>} 修改后的文件内容
 */
async function applyEditWithLLM(
  originalContent,
  codeEdit,
  filePath,
  instructions
) {
  // 情况1: 原文件为空或不存在 - 创建新文件
  if (!originalContent || originalContent.trim() === "") {
    if (hasExistingCodeMarker(codeEdit)) {
      const systemPrompt = await getEditFilePrompt();
      const result = await callLLM(systemPrompt, codeEdit);
      return cleanLLMOutput(result);
    }
    return codeEdit;
  }

  // 情况2: 有 existing code 标记 - 使用标准合并逻辑
  if (hasExistingCodeMarker(codeEdit)) {
    const systemPrompt = await getEditFilePrompt();
    const userMessage = buildUserMessage(
      originalContent,
      codeEdit,
      instructions,
      filePath
    );

    const result = await callLLM(systemPrompt, userMessage);
    return cleanLLMOutput(result);
  }

  // 情况3: 没有 existing code 标记 - 使用智能合并（根据 instructions 理解意图）
  const systemPrompt = buildSmartMergePrompt();
  const userMessage = `## 文件路径
${filePath}

## 编辑说明
${instructions}

## 原始文件内容
\`\`\`
${originalContent}
\`\`\`

## 要合并的代码片段
\`\`\`
${codeEdit}
\`\`\`

请根据编辑说明，将代码片段智能合并到原始文件中，输出完整的修改后文件内容：`;

  const result = await callLLM(systemPrompt, userMessage);
  return cleanLLMOutput(result);
}

// ============ 主函数 ============

/**
 * 编辑文件内容（新版 - LLM 辅助）
 * @param {Object} payload - 函数参数对象
 * @param {string} payload.target_file - 文件路径
 * @param {string} payload.instructions - 编辑说明
 * @param {string} payload.code_edit - 编辑内容
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function editFile(payload = {}, infoObject = {}) {
  const logAndReturn = (response) => {
    if (response.status !== 0) {
      console.error(
        "[editFile] Failure Reason:",
        response.data?.file_path || response.message
      );
    }
    return response;
  };

  try {
    // 解析参数（支持新旧两种格式）
    const targetFile = payload?.target_file || payload?.file_path;
    const instructions = payload?.instructions || "Apply the edit";
    const codeEdit = payload?.code_edit;

    // 参数验证
    if (!targetFile || typeof targetFile !== "string") {
      return logAndReturn(
        buildEditResponse({
          status: 1,
          message: "editfile fail",
          filePathResult:
            "编辑结果：edit fail【target_file 参数不能为空，必须是字符串】",
        })
      );
    }

    if (!codeEdit || typeof codeEdit !== "string") {
      return logAndReturn(
        buildEditResponse({
          status: 1,
          message: "editfile fail",
          filePathResult:
            "编辑结果：edit fail【code_edit 参数不能为空，必须是字符串】",
        })
      );
    }

    // 解码路径
    const decodedPath = decodeHtmlEntities(targetFile);
    const projectPath = combyFilePath(infoObject.projectId, decodedPath);
    const normalizedPath = path.normalize(projectPath);

    // 通知前端
    chatToFrontend("编辑文件" + decodedPath, "edit_file", infoObject);

    // 读取原始文件（如果存在，异步）
    let originalContent = "";
    let isNewFile = false;

    try {
      originalContent = await fs.readFile(normalizedPath, "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") {
        isNewFile = true;
        // 确保目录存在（异步）
        const dir = path.dirname(normalizedPath);
        try {
          await fs.access(dir);
        } catch (e) {
          await fs.mkdir(dir, { recursive: true });
        }
      } else {
        throw err;
      }
    }

    // 使用 LLM 应用编辑
    const newContent = await applyEditWithLLM(
      originalContent,
      codeEdit,
      normalizedPath,
      instructions
    );

    // 写入文件（异步）
    await fs.writeFile(normalizedPath, newContent, "utf-8");

    return logAndReturn(
      buildEditResponse({
        status: 0,
        message: "editfile success",
        filePathResult: isNewFile
          ? "编辑结果：create success"
          : "编辑结果：edit success",
        originalLength: originalContent.length,
        newLength: newContent.length,
        originalContent: originalContent,
        newContent: newContent,
        isNewFile: isNewFile,
        targetFile: decodedPath,
      })
    );
  } catch (error) {
    recordErrorLog(error, "AgentFunction in edit file");
    return logAndReturn(
      buildEditResponse({
        status: 1,
        message: "editfile fail",
        filePathResult: `编辑结果：edit fail【${error.message}】`,
        originalContent: "",
        newContent: "",
        isNewFile: false,
        targetFile: payload?.target_file || payload?.file_path || "",
      })
    );
  }
}

module.exports = editFile;
