const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const iconv = require("iconv-lite");
const OpenAI = require("openai");

const recordErrorLog = require("../../recordErrorLog");
const chatToFrontend = require("../functionChatToFrontend/chatToFrontend");
const combyFilePath = require("../../systemAgentLoop/utils/combyFilePath");
const lintCompatibilityTable = require("./lintCompatibilityTable");

const execAsync = promisify(exec);

// 使用 qwen-long 模型进行 lint 错误总结（支持超长上下文）
const QWENLONG_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWENLONG_API_KEY =
  process.env.QWENLONG_API_KEY || "sk-20dc2f0f2f6d45a58c0f531c80c05893";
const summaryClient = new OpenAI({
  baseURL: QWENLONG_BASE_URL,
  apiKey: QWENLONG_API_KEY,
  timeout: 60000,
});

// Lint 错误总结的 System Prompt
const LINT_SUMMARY_SYSTEM_PROMPT = `你是一个专业的代码检查错误分析助手。你的任务是将 ESLint/TypeScript/Linter 的原始输出精简为简洁、结构化的错误摘要。

## 输出格式

你必须输出一个 JSON 对象，格式如下：
\`\`\`json
{
  "totalErrors": 数字,
  "totalWarnings": 数字,
  "errorsByFile": [
    {
      "file": "文件相对路径",
      "errors": [
        {
          "line": 行号,
          "column": 列号,
          "rule": "规则名称",
          "message": "简洁的错误描述",
          "severity": "error" 或 "warning"
        }
      ]
    }
  ],
  "summary": "一句话总结主要问题类型和建议"
}
\`\`\`

## 提取规则

1. **文件路径**：只保留项目内的相对路径（去掉绝对路径前缀如 /app/、C:\\Users\\ 等）
2. **行列信息**：保留 line 和 column，便于定位
3. **规则名称**：保留 ESLint 规则名（如 @typescript-eslint/no-unused-vars）
4. **错误描述**：用简洁中文描述错误本质，不超过 30 字
5. **去重合并**：同一文件同一行的相同错误只保留一条
6. **优先级排序**：error 优先于 warning，按文件名字母序排列

## 常见错误类型翻译

- "is defined but never used" → "变量已定义但未使用"
- "Missing return type" → "缺少返回类型声明"
- "Unexpected any" → "不应使用 any 类型"
- "Cannot find module" → "找不到模块"
- "is not assignable to" → "类型不兼容"
- "Parsing error" → "语法解析错误"

## 注意事项

- 输出必须是合法 JSON
- 如果无法解析输入，返回 {"totalErrors": 0, "totalWarnings": 0, "errorsByFile": [], "summary": "无法解析 lint 输出"}
- 最多保留每个文件的前 10 个错误，超出部分在 summary 中说明
- 忽略 info 级别的提示`;

// 触发 AI 总结的最小字符数阈值（低于此值直接返回原始信息）
const LINT_SUMMARY_THRESHOLD = 500;

/**
 * 优先使用项目自带 lint 脚本，否则按技术栈回退到预置命令
 * @param {Object} payload - { type?: string }
 * @param {Object} infoObject - { projectId?: string }
 */
async function linter(payload = {}, infoObject = {}) {
  try {
    // 支持直接传入 projectRoot（用于测试/外部调用），否则通过 projectId 计算
    let projectRoot = infoObject.projectRoot;
    if (!projectRoot) {
      if (!infoObject.projectId) {
        return {
          status: 1,
          message: "linter fail",
          data: { error: "项目ID不能为空" },
        };
      }
      projectRoot = combyFilePath(infoObject.projectId, "/");
    }
    const pkgPath = path.join(projectRoot, "package.json");
    const hasPackageJson = await fileExists(pkgPath);

    const result = {
      status: 0,
      message: "linter success",
      data: {},
    };

    // 1. 尝试项目自带脚本
    if (hasPackageJson) {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
      const scripts = pkg.scripts || {};
      const lintScriptKey =
        Object.keys(scripts).find((k) => k.toLowerCase() === "lint") ||
        Object.keys(scripts).find((k) => k.toLowerCase().includes("lint"));

      if (lintScriptKey) {
        const baseCmd = buildPackageManagerCommand(
          projectRoot,
          `run ${lintScriptKey}`
        );
        const cmd = ensureJsonFormat(baseCmd);
        return await runLintCommand({
          cmd,
          cwd: projectRoot,
          source: "project_script",
          infoObject,
        });
      }
    }

    // 2. 回退到适配表
    const type = (payload.type || "").toLowerCase();
    const adapter = lintCompatibilityTable[type];
    if (!adapter) {
      return {
        status: 1,
        message: "linter fail",
        data: {
          error: `未找到技术栈适配器: ${type || "未知"}`,
          suggestion:
            "请在 payload.type 指定已支持的技术栈，或在项目内添加 lint 脚本",
        },
      };
    }

    return await runLintCommand({
      cmd: adapter.defaultCommand,
      cwd: projectRoot,
      source: "fallback_adapter",
      infoObject,
      adapter,
    });
  } catch (error) {
    recordErrorLog(error, "AIfunction/linter");
    return {
      status: 1,
      message: "linter fail",
      data: { error: error.message || "执行 linter 发生未知错误" },
    };
  }
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

function buildPackageManagerCommand(_cwd, suffix) {
  // 平台统一使用 npm
  return `npm ${suffix}`;
}

async function runLintCommand({ cmd, cwd, source, infoObject, adapter }) {
  const finalCmd = typeof cmd === "string" ? cmd : await cmd; // 兼容 Promise
  try {
    // 检查 cwd 目录是否存在（与 bashOperation 保持一致）
    let stat = null;
    try {
      stat = await fs.stat(cwd);
    } catch (statError) {
      return {
        status: 1,
        message: "linter fail",
        data: {
          error_count: 0,
          error_details: `工作目录不存在: ${cwd}`,
        },
      };
    }

    if (!stat.isDirectory()) {
      return {
        status: 1,
        message: "linter fail",
        data: {
          error_count: 0,
          error_details: `路径不是目录: ${cwd}`,
        },
      };
    }

    await chatToFrontend("开始进行linter检测", "linter", infoObject);

    // 与 bashOperation 保持一致：不指定 shell，使用 buffer 编码，iconv 解码
    const { stdout, stderr } = await execAsync(finalCmd, {
      encoding: "buffer",
      cwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

    // Windows 下用 cp936 解码
    const stdoutStr = iconv.decode(stdout || Buffer.from(""), "cp936");
    const stderrStr = iconv.decode(stderr || Buffer.from(""), "cp936");

    const output = formatOutput(stdoutStr, stderrStr);
    // 优先用原始输出解析错误数，确保 JSON 未被截断
    const errors = countErrors(output.raw || output.stdout || output.stderr);
    await chatToFrontend(`找到错误 ${errors} 个`, "linter", infoObject);

    return {
      status: 0,
      message: "linter success",
      data: {
        error_count: 0,
        error_details: "",
      },
    };
  } catch (error) {
    // 与 bashOperation 保持一致：从 error.stdout / error.stderr 取 buffer 并解码
    const stdoutBuf = error.stdout;
    const stderrBuf = error.stderr;

    let stdoutStr = "";
    let stderrStr = "";

    if (stderrBuf && stderrBuf.length > 0) {
      stderrStr = iconv.decode(stderrBuf, "cp936");
    }
    if (stdoutBuf && stdoutBuf.length > 0) {
      stdoutStr = iconv.decode(stdoutBuf, "cp936");
    }

    const output = formatOutput(stdoutStr, stderrStr, error.message);
    const errors = countErrors(output.raw || output.stdout || output.stderr);
    await chatToFrontend(`找到错误 ${errors} 个`, "linter", infoObject);

    // 使用 AI 总结 lint 错误，减少上下文占用
    const rawErrorDetails =
      output.raw || output.stdout || output.stderr || error.message || "";
    const summarizedDetails = await summarizeLintErrors(rawErrorDetails);

    return {
      status: 1,
      message: "linter fail",
      data: {
        error_count: errors,
        error_details: summarizedDetails,
      },
    };
  }
}

function formatOutput(stdout = "", stderr = "", fallback = "") {
  const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");

  const std = clean(stdout);
  const err = clean(stderr);
  const summary =
    err || std
      ? `lint 完成，stdout: ${std.slice(0, 200)}${
          std.length > 200 ? "..." : ""
        }${
          err
            ? ` | stderr: ${err.slice(0, 200)}${err.length > 200 ? "..." : ""}`
            : ""
        }`
      : fallback || "lint 完成";

  return {
    stdout: std,
    stderr: err,
    raw: `${stdout || ""}${stderr || ""}`,
    summary,
  };
}

function countErrors(stdout = "") {
  // 尝试解析 ESLint JSON 输出：数组，每项 messages 中 severity=2 视为 error
  try {
    const start = stdout.indexOf("[");
    const end = stdout.lastIndexOf("]");
    const tryParse = (jsonStr) => {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) {
        let cnt = 0;
        for (const file of arr) {
          const msgs = file.messages || file.issues || [];
          for (const msg of msgs) {
            if (msg.severity === 2 || msg.severity === "error") cnt += 1;
          }
        }
        return cnt;
      }
      return 0;
    };

    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = stdout.substring(start, end + 1);
      return tryParse(jsonStr);
    }

    // 如果截取失败，直接尝试整体解析
    return tryParse(stdout);
  } catch (e) {
    // ignore parse error
  }

  // 兜底：文本模式下用正则粗略统计 severity=2 的出现次数
  const matches = stdout.match(/"severity"\s*:\s*2/g);
  if (matches) return matches.length;

  return 0;
}

/**
 * 使用 AI 模型总结 lint 错误信息
 * @param {string} rawLintOutput - 原始 lint 输出
 * @returns {Promise<string>} - 精简后的错误摘要
 */
async function summarizeLintErrors(rawLintOutput) {
  // 如果输出较短，直接返回原始内容
  if (!rawLintOutput || rawLintOutput.length < LINT_SUMMARY_THRESHOLD) {
    return rawLintOutput;
  }

  try {
    console.log(
      `[linter] 开始 AI 总结，原始输出长度: ${rawLintOutput.length} 字符`
    );

    const response = await summaryClient.chat.completions.create({
      model: "qwen-long",
      messages: [
        {
          role: "system",
          content: LINT_SUMMARY_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `请分析并总结以下 lint 输出：\n\n${rawLintOutput}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const resultContent = response.choices?.[0]?.message?.content || "";
    console.log(
      `[linter] AI 总结完成，结果长度: ${resultContent.length} 字符`
    );

    // 尝试解析 JSON 并格式化为可读文本
    try {
      const parsed = JSON.parse(resultContent);
      return formatLintSummary(parsed);
    } catch (parseErr) {
      // 如果解析失败，返回原始 AI 输出
      return resultContent;
    }
  } catch (error) {
    console.log(`[linter] AI 总结失败: ${error.message}，返回原始输出`);
    recordErrorLog(error, "linter-summarizeLintErrors");
    // AI 调用失败时返回原始输出（截断到合理长度）
    return rawLintOutput.length > 5000
      ? rawLintOutput.slice(0, 5000) + "\n\n... (输出过长已截断)"
      : rawLintOutput;
  }
}

/**
 * 将 AI 返回的 JSON 格式化为可读的错误摘要文本
 */
function formatLintSummary(parsed) {
  const lines = [];

  // 总览
  lines.push(
    `📊 Lint 检测结果: ${parsed.totalErrors || 0} 个错误, ${
      parsed.totalWarnings || 0
    } 个警告`
  );
  lines.push("");

  // 按文件列出错误
  const errorsByFile = parsed.errorsByFile || [];
  for (const fileInfo of errorsByFile) {
    lines.push(`📁 ${fileInfo.file}`);
    const errors = fileInfo.errors || [];
    for (const err of errors) {
      const icon = err.severity === "error" ? "❌" : "⚠️";
      const location = err.column
        ? `第 ${err.line} 行, 第 ${err.column} 列`
        : `第 ${err.line} 行`;
      const rule = err.rule ? ` [${err.rule}]` : "";
      lines.push(`  ${icon} ${location}${rule}: ${err.message}`);
    }
    lines.push("");
  }

  // 总结建议
  if (parsed.summary) {
    lines.push(`💡 建议: ${parsed.summary}`);
  }

  return lines.join("\n");
}

/**
 * 如果是 npm run lint，附加 -- --format json，确保 JSON 输出便于计数
 */
function ensureJsonFormat(cmd) {
  if (typeof cmd !== "string") return cmd;
  const needsFormat =
    /^npm\s+run\s+lint\b/i.test(cmd) && !/--format\s+json/i.test(cmd);
  if (needsFormat) {
    // npm run lint -- --format json
    return `${cmd} -- --format json`;
  }
  return cmd;
}

module.exports = linter;
