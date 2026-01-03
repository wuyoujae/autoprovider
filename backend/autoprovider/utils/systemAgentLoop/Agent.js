const OpenAI = require("openai");
const fs = require("fs");
const contentStandardization = require("./utils/contentStandardization");
const getFilesTree = require("../AIfunction/getFilesTree");
const {
  assembleChatMessages,
  message2token,
  bindFilesToDialogue,
} = require("./utils/combyChatHistory");
const epoche = require("./epoche");
const updateChatHistory = require("./utils/updateChatHistory");
const {
  initDialogueRecord,
  updateAiDialogue,
} = require("./utils/updateChatHistory");
const { validateToolCall } = require("./utils/functioncallErrorDetection");
const pool = require("../../db");
const { setContext, clearContext, runWithContext } = require("./context");
const sendReasoningContent = require("../AIfunction/sendReasoningContent");
const sendWordsContent = require("../AIfunction/sendWordsContent");
const { callFunction } = require("../AIfunction/index");
const recordOperation = require("./utils/recordOperation");
const recordErrorLog = require("../recordErrorLog");
const getTodolist = require("./utils/getTodolist");
const uuidv4 = require("uuid").v4;
const updateWorkRecord = require("./utils/updateWorkRecord");
const updateDialogueRecord = require("./utils/updateDialogueRecord");
const { updateTokenUsage } = require("./utils/updateTokenUsage");
const { info } = require("console");
const env = process.env;
const { getLLMConfigSync, getLLMConfig } = require("../llmConfig");
const {
  addWork,
  removeWork,
  getWork,
} = require("../systemWorkLoop/session/workQueue/workQueue");
const getNewWorkId = require("./utils/getNewWorkId");
const level1 = require("./utils/combyChatHistory/functoinLevel/level1");
const level5 = require("./utils/combyChatHistory/functoinLevel/level5");

// 工具函数
const str = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};
const num = (value, fallback) => {
  // 处理 null/undefined，直接返回 fallback
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
// tokenLimit 专用：确保有合理的最小值（至少 10000，避免负数问题）
const tokenLimitNum = (value, fallback = 130000) => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  const MIN_TOKEN_LIMIT = 10000;
  return Number.isFinite(n) && n >= MIN_TOKEN_LIMIT ? n : fallback;
};
const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

// ==================== 从数据库读取用户配置的模型 ====================
const buildModelConfig = () => {
  try {
    const cfg = getLLMConfigSync();
    const list = Array.isArray(cfg?.agentModels) ? cfg.agentModels : [];
    const api = {};
    const priority = [];

    list.forEach((item, index) => {
      const baseUrl = str(item?.baseUrl);
      const modelName = str(item?.model);
      const apiKey = str(item?.apiKey);
      if (!baseUrl || !modelName || !apiKey) {
        return;
      }
      const tokenLimit = tokenLimitNum(item?.tokenLimit, 130000);
      const provider = `agent_${index + 1}`;
      api[provider] = {
        baseUrl,
        apiKey,
        model: modelName,
        tokenLimit,
      };
      priority.push({ provider });
    });

    if (priority.length > 0) {
      console.log(
        `[ModelManager] 加载 Agent 模型配置，共 ${priority.length} 个`
      );
    } else {
      console.log(
        "[ModelManager] ⚠️ 未配置任何 Agent 模型，请在设置页面添加模型"
      );
    }

    return { api, priority };
  } catch (error) {
    console.log("[ModelManager] 读取模型配置失败:", error.message);
    return { api: {}, priority: [] };
  }
};

let API = {};
let MODEL_PRIORITY = [];

const setModelConfig = (list, source = "cache") => {
  const api = {};
  const priority = [];

  list.forEach((item, index) => {
    const baseUrl = str(item?.baseUrl);
    const modelName = str(item?.model);
    const apiKey = str(item?.apiKey);
    if (!baseUrl || !modelName || !apiKey) {
      return;
    }
    const tokenLimit = num(item?.tokenLimit, 130000);
    const provider = `agent_${index + 1}`;
    api[provider] = {
      baseUrl,
      apiKey,
      model: modelName,
      tokenLimit,
    };
    priority.push({ provider });
  });

  API = api;
  MODEL_PRIORITY = priority;

  if (priority.length > 0) {
    console.log(
      `[ModelManager] 加载 Agent 模型配置（${source}），共 ${priority.length} 个`
    );
  } else {
    console.log(
      "[ModelManager] ⚠️ 未配置任何 Agent 模型，请在设置页面添加模型"
    );
  }
};

// 同步读取缓存（文件）作为启动初始值
const initialCfg = getLLMConfigSync();
setModelConfig(initialCfg?.agentModels || [], "cache");

// 异步刷新：直接从数据库加载最新模型，完成后重置索引
const loadModelConfigAsync = async () => {
  try {
    const cfg = await getLLMConfig();
    setModelConfig(cfg?.agentModels || [], "db");
    resetModelIndex();
  } catch (error) {
    console.log("[ModelManager] 从数据库读取模型失败:", error.message);
  }
};

// 当前使用的模型索引
let currentModelIndex = 0;

// 获取模型配置
const getModelConfig = (index) => {
  if (index >= MODEL_PRIORITY.length) {
    return null; // 所有模型都已尝试
  }

  const priority = MODEL_PRIORITY[index];
  const config = API[priority.provider];

  if (
    !config ||
    !hasValue(config.baseUrl) ||
    !hasValue(config.apiKey) ||
    !hasValue(config.model)
  ) {
    return null;
  }

  return {
    provider: priority.provider,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    tokenLimit: tokenLimitNum(config.tokenLimit, 130000),
    displayName: priority.provider,
  };
};

const findNextAvailableConfig = (startIndex = 0) => {
  let idx = startIndex;
  while (idx < MODEL_PRIORITY.length) {
    const config = getModelConfig(idx);
    if (config) {
      return { config, index: idx };
    }
    idx++;
  }
  return { config: null, index: MODEL_PRIORITY.length };
};

// 创建 OpenAI 客户端
const createClient = (config) => {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    timeout: 300000,
    maxRetries: 1, // 单个模型只重试1次，失败后切换下一个
  });
};

// 切换到下一个模型
const switchToNextModel = () => {
  const { config, index } = findNextAvailableConfig(currentModelIndex + 1);
  if (!config) {
    console.log("[ModelManager] ❌ 所有模型都已尝试，无可用模型");
    return null;
  }
  currentModelIndex = index;
  if (config) {
    console.log(`[ModelManager] 🔄 切换到模型: ${config.displayName}`);
    // 更新全局 client 和 model
    client = createClient(config);
    model = {
      name: config.model,
      tokenLimit: config.tokenLimit,
    };
  }
  return config;
};

// 重置模型索引（每次新的 AgentWork 会话开始时可选调用）
const resetModelIndex = () => {
  const { config, index } = findNextAvailableConfig(0);
  currentModelIndex = config ? index : 0;
  if (!config) {
    client = null;
    model = { name: "unknown", tokenLimit: 0 };
    console.log("[ModelManager] ❌ 未找到可用模型配置，请在设置页面添加模型");
    return;
  }

  client = createClient(config);
  model = {
    name: config.model,
    tokenLimit: config.tokenLimit,
  };
  console.log(`[ModelManager] 🔄 模型索引已重置，当前: ${config.displayName}`);
};

// 后台刷新数据库模型配置
setImmediate(() => {
  loadModelConfigAsync();
});

// 获取当前模型配置
const getCurrentModelConfig = () => {
  return getModelConfig(currentModelIndex);
};

// 初始化当前模型
const { config: initialConfig, index: initialIndex } =
  findNextAvailableConfig(0);
currentModelIndex = initialConfig ? initialIndex : 0;
let client = initialConfig ? createClient(initialConfig) : null;
let model = initialConfig
  ? { name: initialConfig.model, tokenLimit: initialConfig.tokenLimit }
  : { name: "unknown", tokenLimit: 130000 };
if (!initialConfig) {
  console.log("[ModelManager] ⚠️ 启动时未找到可用模型，请配置 LLM_* 环境变量");
}

let cachedSystemPrompt = null;
let cachedAgentFunctions = null;

// 异步加载并缓存 system prompt 和 agent functions
const loadAgentConfig = async () => {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = await fs.promises.readFile(
      "agent/prompt0.5.md",
      "utf-8"
    );
  }
  if (!cachedAgentFunctions) {
    const raw = await fs.promises.readFile("agent/Agentfunction.json", "utf-8");
    cachedAgentFunctions = JSON.parse(raw);
  }
  return {
    systemPrompt: cachedSystemPrompt,
    agentFunctions: cachedAgentFunctions,
  };
};

// AI API 调用的超时时间（毫秒）
const AI_API_TIMEOUT = 300000; // 5分钟
// 单次工作的最大超时时间（毫秒）
const AGENT_WORK_TIMEOUT = 1800000; // 30分钟

const functionCalling = async (toolCallObjectArray, infoObject) => {
  try {
    // 收集所有函数调用结果
    const results = [];

    for (const toolCall of toolCallObjectArray) {
      // 将属性解析出来
      const toolName = toolCall.function.name;
      const toolCallId = toolCall.id;

      // 校验函数调用是否合法
      const validation = validateToolCall(toolCall, infoObject.agentFunctions);
      if (!validation.ok) {
        recordErrorLog(validation.message, "functionCalling-validation");
        return {
          success: false,
          message: validation.message,
          results: [],
          formattedResults: "",
        };
      }

      const toolArgs = validation.parsedArgs;

      // 调用函数
      // 更新operation record和dialogue record都在callFunction中完成
      const functionResult = await callFunction(
        toolName,
        toolArgs,
        infoObject,
        toolCallId
      );

      //调用函数之后进行一个判断，判断是否为文件操作函数，如果是将他的filepath记录下来

      // 收集结果
      const resultContent =
        typeof functionResult?.data === "object"
          ? JSON.stringify(functionResult.data)
          : String(functionResult?.data || "");

      results.push({
        functionName: toolName,
        content: resultContent,
        status: functionResult?.status,
        message: functionResult?.message,
      });
    }

    // 格式化所有结果为指定格式
    const formattedResults = results
      .map((r) => `\`\`\` ${r.functionName}\n\n${r.content}\n\n\`\`\``)
      .join("\n\n");

    return { success: true, results, formattedResults };
  } catch (error) {
    recordErrorLog(error, "functionCalling");
    return {
      success: false,
      message: error.message || "functionCalling error",
      results: [],
      formattedResults: "",
    };
  }
};
/**
 * 带超时的 Promise 包装器
 * @param {Promise} promise - 要执行的 Promise
 * @param {number} timeout - 超时时间（毫秒）
 * @param {string} errorMessage - 超时错误信息
 */
const withTimeout = (promise, timeout, errorMessage = "操作超时") => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const AgentChat = async (params, infoObject) => {
  try {
    // 用户消息记录和附件绑定已在 level2 中处理，此处无需重复
    let operationIndex = 0;
    infoObject.operationIndex = operationIndex;
    //关键数据记录
    const keyData = {
      dealChunk: null,
    };

    // call AI - 添加超时保护与中断控制，支持模型自动切换
    const workControl = getWork(infoObject.sessionId);
    let response;
    let lastError = null;
    let modelSwitchAttempts = 0;
    const MAX_MODEL_SWITCH_ATTEMPTS = MODEL_PRIORITY.length;

    // 循环尝试不同模型，直到成功或所有模型都尝试过
    while (modelSwitchAttempts < MAX_MODEL_SWITCH_ATTEMPTS) {
      const abortController = new AbortController();
      // 将 abortController 挂到 workControl，终止时可即时中断上游流式请求
      if (workControl) {
        workControl.abortController = abortController;
      }

      try {
        const currentConfig = getCurrentModelConfig();
        console.log(
          `[AgentChat] 🤖 尝试调用模型: ${
            currentConfig?.displayName || "未知"
          } (尝试次数: ${modelSwitchAttempts + 1})`
        );

        // 使用当前模型名称更新 params
        const requestParams = {
          ...params,
          model: model.name,
          signal: abortController.signal,
        };

        response = await withTimeout(
          client.chat.completions.create(requestParams),
          AI_API_TIMEOUT,
          "AI API 响应超时，请重试"
        );

        // 成功获取响应，跳出循环
        console.log(
          `[AgentChat] ✅ 模型 ${currentConfig?.displayName || "未知"} 调用成功`
        );
        break;
      } catch (error) {
        lastError = error;
        console.log(error);

        // 清理 abortController
        if (workControl && workControl.abortController === abortController) {
          delete workControl.abortController;
        }

        // 如果是用户主动中断，直接返回
        if (error.name === "AbortError") {
          console.log(
            `[AgentChat] aborted upstream request for session ${infoObject.sessionId}`
          );
          return {
            success: false,
            message: "会话已终止",
            content: null,
            tokenUsage: null,
          };
        }

        // 记录错误并尝试切换模型
        const currentConfig = getCurrentModelConfig();
        console.log(
          `[AgentChat] ❌ 模型 ${
            currentConfig?.displayName || "未知"
          } 调用失败: ${error.message}`
        );
        recordErrorLog(
          `模型 ${currentConfig?.displayName} 调用失败: ${error.message}`,
          "AgentChat-modelSwitch"
        );

        // 尝试切换到下一个模型
        const nextConfig = switchToNextModel();
        modelSwitchAttempts++;

        if (!nextConfig) {
          // 所有模型都已尝试，抛出最后一个错误
          console.log("[AgentChat] ❌ 所有模型都已尝试，无可用模型");
          throw lastError;
        }

        // 更新 infoObject 中的模型信息，以便后续使用正确的 tokenLimit
        infoObject.model = model;
        infoObject.tokenLimit = model.tokenLimit;

        console.log(
          `[AgentChat] 🔄 切换到下一个模型: ${nextConfig.displayName}`
        );
      } finally {
        // 确保清理 abortController（成功时也需要清理）
        if (workControl && workControl.abortController === abortController) {
          delete workControl.abortController;
        }
      }
    }

    // 如果循环结束还没有 response，说明所有模型都失败了
    if (!response) {
      throw lastError || new Error("所有模型调用失败");
    }

    let fullContent = "";
    let fullReasoningContent = ""; // 每次调用时重置
    let hasReasoningContent = false; // 标记是否接收过 reasoning_content
    let hasNotifiedReasoningComplete = false; // 标记是否已通知深度思考完成
    let assistantToolCalls = []; // 收集 tool_calls（避免变量名冲突）
    let hasContent = false; // 标记是否有普通内容

    // 用于处理 <think></think> 标签的状态变量
    let isInThinkTag = false; // 是否在 <think> 标签内
    let tagBuffer = ""; // 用于缓冲可能被分割的标签

    //对流式输出的内容进行处理
    for await (const chunk of response) {
      // 检查是否已终止
      const workControl = getWork(infoObject.sessionId);
      if (workControl && workControl.isStopped) {
        console.log(
          `[AgentChat] detected isStopped, aborting upstream stream for session ${infoObject.sessionId}`
        );
        // 双保险：终止上游请求
        try {
          abortController.abort();
        } catch (e) {
          // ignore
        }
        try {
          response?.controller?.abort?.();
        } catch (e) {
          // ignore
        }
        return {
          success: false,
          message: "会话已终止",
          content: null,
          tokenUsage: null,
        };
      }

      const delta = chunk.choices[0]?.delta;
      const content = delta?.content;
      const reasoning_content = delta?.reasoning_content;
      const tool_calls = delta?.tool_calls;
      // 处理深度思考内容
      if (reasoning_content) {
        hasReasoningContent = true;
        sendReasoningContent(reasoning_content, infoObject);
        fullReasoningContent += reasoning_content;
        continue;
      }

      // 处理 tool_calls
      if (tool_calls && Array.isArray(tool_calls)) {
        for (const toolCallDelta of tool_calls) {
          const index = toolCallDelta.index;

          if (index !== undefined && index !== null) {
            // 初始化或获取当前索引的 tool call 对象
            if (!assistantToolCalls[index]) {
              assistantToolCalls[index] = {
                index: index,
                id: toolCallDelta.id || "",
                type: toolCallDelta.type || "function",
                function: {
                  name: toolCallDelta.function?.name || "",
                  arguments: toolCallDelta.function?.arguments || "",
                },
              };
            } else {
              // 更新当前 tool call
              const currentTool = assistantToolCalls[index];
              if (toolCallDelta.id) currentTool.id = toolCallDelta.id;
              if (toolCallDelta.type) currentTool.type = toolCallDelta.type;

              if (toolCallDelta.function?.name) {
                currentTool.function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                currentTool.function.arguments +=
                  toolCallDelta.function.arguments;
              }
            }
          }
        }
        continue;
      }

      // 处理普通内容
      if (content) {
        // 将内容添加到缓冲区进行标签检测
        tagBuffer += content;

        // 处理缓冲区中的内容
        while (tagBuffer.length > 0) {
          if (isInThinkTag) {
            // 当前在 <think> 标签内，寻找 </think> 结束标签
            const endTagIndex = tagBuffer.indexOf("</think>");
            if (endTagIndex !== -1) {
              // 找到结束标签，提取思考内容
              const thinkContent = tagBuffer.substring(0, endTagIndex);
              tagBuffer = tagBuffer.substring(endTagIndex + 8); // 8 = "</think>".length
              isInThinkTag = false;

              // 作为深度思考内容处理
              if (thinkContent) {
                hasReasoningContent = true;
                sendReasoningContent(thinkContent, infoObject);
                fullReasoningContent += thinkContent;
              }
            } else {
              // 没找到结束标签，检查是否可能有不完整的结束标签
              // 保留最后 7 个字符（"</think" 的长度减1）以防标签被分割
              const keepLength = Math.min(7, tagBuffer.length);
              const safeContent = tagBuffer.substring(
                0,
                tagBuffer.length - keepLength
              );
              tagBuffer = tagBuffer.substring(tagBuffer.length - keepLength);

              if (safeContent) {
                hasReasoningContent = true;
                sendReasoningContent(safeContent, infoObject);
                fullReasoningContent += safeContent;
              }
              break; // 等待更多内容
            }
          } else {
            // 当前不在 <think> 标签内，寻找 <think> 开始标签
            const startTagIndex = tagBuffer.indexOf("<think>");
            if (startTagIndex !== -1) {
              // 找到开始标签，先处理标签前的普通内容
              const beforeThink = tagBuffer.substring(0, startTagIndex);
              tagBuffer = tagBuffer.substring(startTagIndex + 7); // 7 = "<think>".length
              isInThinkTag = true;

              if (beforeThink) {
                hasContent = true;
                // 检测到从 reasoning_content 切换到 content，说明深度思考阶段结束
                if (hasReasoningContent && !hasNotifiedReasoningComplete) {
                  const recordOperationResult = await recordOperation({
                    dialogueId: infoObject.dialogueId,
                    operationCode: `<through>${fullReasoningContent}</through>`,
                    operationMethod: "reasoning",
                    operationStatus: 0,
                    operationIndex: infoObject.operationIndex,
                  });
                  infoObject.operationIndex++;
                  sendReasoningContent("overFullContent", infoObject);
                  hasNotifiedReasoningComplete = true;
                }
                fullContent += beforeThink;
                sendWordsContent(beforeThink, infoObject);
              }
            } else {
              // 没找到开始标签，检查是否可能有不完整的开始标签
              // 保留最后 6 个字符（"<think" 的长度减1）以防标签被分割
              const keepLength = Math.min(6, tagBuffer.length);
              const potentialTag = tagBuffer.substring(
                tagBuffer.length - keepLength
              );

              // 检查保留的内容是否可能是 <think> 的开头
              const isPartialTag =
                "<think>".startsWith(potentialTag) &&
                potentialTag.startsWith("<");

              let safeContent;
              if (isPartialTag) {
                safeContent = tagBuffer.substring(
                  0,
                  tagBuffer.length - keepLength
                );
                tagBuffer = potentialTag;
              } else {
                safeContent = tagBuffer;
                tagBuffer = "";
              }

              if (safeContent) {
                hasContent = true;
                // 检测到从 reasoning_content 切换到 content，说明深度思考阶段结束
                if (hasReasoningContent && !hasNotifiedReasoningComplete) {
                  const recordOperationResult = await recordOperation({
                    dialogueId: infoObject.dialogueId,
                    operationCode: `<through>${fullReasoningContent}</through>`,
                    operationMethod: "reasoning",
                    operationStatus: 0,
                    operationIndex: infoObject.operationIndex,
                  });
                  infoObject.operationIndex++;
                  sendReasoningContent("overFullContent", infoObject);
                  hasNotifiedReasoningComplete = true;
                }
                fullContent += safeContent;
                sendWordsContent(safeContent, infoObject);
              }
              break; // 等待更多内容
            }
          }
        }
        continue;
      }

      // 处理 usage 信息
      if (chunk.usage) {
        keyData.dealChunk = chunk.usage;
      }
    }
    // 流式结束后，处理缓冲区中剩余的内容
    if (tagBuffer.length > 0) {
      if (isInThinkTag) {
        // 如果还在 think 标签内，剩余内容作为思考内容处理
        hasReasoningContent = true;
        sendReasoningContent(tagBuffer, infoObject);
        fullReasoningContent += tagBuffer;
      } else {
        // 普通内容
        hasContent = true;
        if (hasReasoningContent && !hasNotifiedReasoningComplete) {
          const recordOperationResult = await recordOperation({
            dialogueId: infoObject.dialogueId,
            operationCode: `<through>${fullReasoningContent}</through>`,
            operationMethod: "reasoning",
            operationStatus: 0,
            operationIndex: infoObject.operationIndex,
          });
          infoObject.operationIndex++;
          sendReasoningContent("overFullContent", infoObject);
          hasNotifiedReasoningComplete = true;
        }
        fullContent += tagBuffer;
        sendWordsContent(tagBuffer, infoObject);
      }
      tagBuffer = "";
    }

    // 普通内容结束标志处理
    if (hasContent) {
      // 记录操作
      const recordOperationResult = await recordOperation({
        dialogueId: infoObject.dialogueId,
        operationCode: `<words>${fullContent}</words>`,
        operationMethod: "words",
        operationStatus: 0,
        operationIndex: infoObject.operationIndex,
      });
      infoObject.operationIndex++;
      //记录AI回复的内容
      // 如果有 toolCalls，则不在这里记录，而是在 functionCalling 中记录带 tool_calls 的 assistant 消息
      // 或者如果 fullContent 为空但有 toolCalls，说明是纯工具调用，也需要记录
      if (assistantToolCalls.length === 0) {
        await updateDialogueRecord({
          dialogueId: infoObject.dialogueId,
          role: "assistant",
          content: fullContent,
          dialogue_index: infoObject.nowDialogueIndex,
          dialogue_sender: "system",
          work_id: infoObject.workId,
        });
        infoObject.dialogueId = uuidv4();
        infoObject.nowDialogueIndex++;
      }
      sendWordsContent("overFullContent", infoObject);
    }

    // 过滤并调试 tool_calls
    const filteredToolCalls = assistantToolCalls.filter(
      (tc) => tc && tc.function.name
    );

    // 如果有 reasoning_content 但没有通知结束（例如直接调用工具而没有普通内容），需要在这里发送结束标志
    if (hasReasoningContent && !hasNotifiedReasoningComplete) {
      // 记录操作
      const recordOperationResult = await recordOperation({
        dialogueId: infoObject.dialogueId,
        operationCode: `<through>${fullReasoningContent}</through>`,
        operationMethod: "reasoning",
        operationStatus: 0,
        operationIndex: infoObject.operationIndex,
      });
      infoObject.operationIndex++;
      sendReasoningContent("overFullContent", infoObject);
      hasNotifiedReasoningComplete = true;
    }

    // 在所有 chunk 处理完毕后，调用 functionCalling
    if (filteredToolCalls.length > 0) {
      // 先逐条校验 tool call，避免把错误的调用写入对话历史导致下一轮请求失败
      let invalidCall = null;

      // 维护 newFileOperationRecord：收集本轮 edit_file 的目标文件路径
      let newFileOperationRecord = [];

      for (const tc of filteredToolCalls) {
        const validation = validateToolCall(tc, infoObject.agentFunctions);
        if (!validation.ok) {
          invalidCall = { tc, validation };
          break;
        }
        const toolName = tc?.function?.name;
        const parsedArgs = validation.parsedArgs;
        if (
          toolName === "edit_file" &&
          parsedArgs &&
          typeof parsedArgs.target_file === "string" &&
          parsedArgs.target_file.trim()
        ) {
          newFileOperationRecord.push(parsedArgs.target_file.trim());
        }
      }

      // 构造 assistant 消息内容：如果原本没有 content，则补充“调用了 xxx 方法”
      const toolNames = filteredToolCalls
        .map((tc) => tc?.function?.name)
        .filter(Boolean)
        .join(", ");
      let assistantContent =
        fullContent || (toolNames ? `调用了 ${toolNames} 方法` : "");

      // 如果存在非法调用，记录一条不含 tool_calls 的 assistant 消息，并提示模型重新调用
      if (invalidCall) {
        assistantContent =
          fullContent ||
          `调用了 ${
            invalidCall.tc?.function?.name || "未知"
          } 方法，但调用格式有误：${invalidCall.validation.message}`;

        await updateDialogueRecord({
          dialogueId: infoObject.dialogueId,
          role: "assistant",
          content: assistantContent,
          dialogue_index: infoObject.nowDialogueIndex,
          dialogue_sender: "system",
          work_id: infoObject.workId,
        });
        infoObject.nowDialogueIndex++;

        infoObject.newPrompt = "你刚才调用了一个错误的方法，请你重新调用。";
        isSystemSentForWorkPrompt = true;
        // 返回并告知上层这是一次无效的工具调用，避免继续处理后续逻辑
        return {
          success: true,
          message: "invalid tool call",
          content: assistantContent,
          toolCalls: [],
          invalidToolCall: true,
          tokenUsage: {
            prompt_tokens: keyData.dealChunk?.prompt_tokens || 7000,
            completion_tokens: keyData.dealChunk?.completion_tokens || 4000,
            total_tokens: keyData.dealChunk?.total_tokens || 11000,
            completion_tokens_details:
              keyData.dealChunk?.completion_tokens_details || {},
          },
        };
      }

      // 校验通过：记录 assistant 消息（包含 tool_calls），必要时补充内容
      await updateDialogueRecord({
        dialogueId: infoObject.dialogueId,
        role: "assistant",
        content: assistantContent,
        dialogue_index: infoObject.nowDialogueIndex, // assistant 在 user (0) 之后
        dialogue_sender: "system",
        work_id: infoObject.workId,
        tool_call: JSON.stringify(filteredToolCalls), // 存储完整的 tool_calls 数组
      });

      infoObject.nowDialogueIndex++;
      // 然后调用工具，callIndex 从 2 开始
      // 使用 await 等待所有工具调用完成，确保 deploy 等长时间运行的函数执行完毕后再继续

      const fcResult = await functionCalling(filteredToolCalls, infoObject);

      //如果newFileOperationRecord不为空，我们就要更新requirement_result中的product_content
      if (newFileOperationRecord.length > 0) {
        try {
          const connection = infoObject.connection;
          if (connection && infoObject.workId) {
            // 1. 读取当前 work_id 对应的 requirement_result 记录
            const [rows] = await connection.query(
              `SELECT result_id, product_content
               FROM requirement_result
               WHERE work_id = ? AND product_status = 0
               ORDER BY create_time DESC
               LIMIT 1`,
              [infoObject.workId]
            );

            if (rows && rows.length > 0) {
              const resultId = rows[0].result_id;
              const rawContent = rows[0].product_content || "";

              // 2. 解析 product_content 为 JSON
              let contentObj = {};
              try {
                contentObj = JSON.parse(rawContent);
              } catch (parseErr) {
                // 非 JSON 格式则跳过更新
                console.log(
                  "[AgentChat] product_content 非 JSON 格式，跳过 contextFilePaths 合并"
                );
              }

              // 3. 如果成功解析，合并 contextFilePaths
              if (contentObj && typeof contentObj === "object") {
                const existingPaths = Array.isArray(contentObj.contextFilePaths)
                  ? contentObj.contextFilePaths
                  : [];

                // 使用 Set 去重合并
                const mergedSet = new Set(existingPaths);
                for (const filePath of newFileOperationRecord) {
                  if (filePath && typeof filePath === "string") {
                    const trimmed = filePath.trim();
                    if (trimmed) {
                      mergedSet.add(trimmed);
                    }
                  }
                }

                // 4. 更新 contextFilePaths
                contentObj.contextFilePaths = Array.from(mergedSet);

                // 5. 更新回数据库
                const updatedContent = JSON.stringify(contentObj);
                await connection.query(
                  `UPDATE requirement_result
                   SET product_content = ?
                   WHERE result_id = ?`,
                  [updatedContent, resultId]
                );

                console.log(
                  "[AgentChat] 已更新 requirement_result contextFilePaths，新增文件:",
                  newFileOperationRecord
                );
              }
            }
          }
        } catch (updateErr) {
          recordErrorLog(updateErr, "AgentChat-updateRequirementResult");
          console.log(
            "[AgentChat] 更新 requirement_result 失败:",
            updateErr.message
          );
        }
      }

      // 如果函数调用非法，插入系统提示让 AI 重新调用，并继续循环
      if (fcResult && fcResult.success === false) {
        infoObject.newPrompt = "你刚才调用了一个错误的方法，请你重新调用。";
        isSystemSentForWorkPrompt = true;
        return {
          success: true,
          message: fcResult.message || "function call invalid",
          content: assistantContent,
          toolCalls: filteredToolCalls,
          invalidToolCall: true,
          tokenUsage: {
            prompt_tokens: keyData.dealChunk?.prompt_tokens || 7000,
            completion_tokens: keyData.dealChunk?.completion_tokens || 4000,
            total_tokens: keyData.dealChunk?.total_tokens || 11000,
            completion_tokens_details:
              keyData.dealChunk?.completion_tokens_details || {},
          },
        };
      }
      // 汇总所有工具调用结果，写入一条 tool 消息，避免多条 tool 记录分散
      if (fcResult && fcResult.formattedResults) {
        const mergedToolDialogueId = uuidv4();
        await updateDialogueRecord({
          dialogueId: mergedToolDialogueId,
          role: "tool",
          content: fcResult.formattedResults,
          dialogue_index: infoObject.nowDialogueIndex,
          dialogue_sender: "system",
          tool_call_id:
            filteredToolCalls.length === 1
              ? filteredToolCalls[0]?.id || null
              : "multiple_tool_calls",
          work_id: infoObject.workId,
          tool_call: JSON.stringify(filteredToolCalls),
        });
        infoObject.nowDialogueIndex++;
      }
      //调用之后更新infoObject.dialogueId = uuidv4();
    }

    //将最终的chunk记录下来，为最终消耗token数,如果没有dealChunk，则按照默认token数量扣除
    return {
      success: true,
      message: "对话成功",
      content: fullContent,
      toolCalls: filteredToolCalls,
      tokenUsage: {
        prompt_tokens: keyData.dealChunk?.prompt_tokens || 7000,
        completion_tokens: keyData.dealChunk?.completion_tokens || 4000,
        total_tokens: keyData.dealChunk?.total_tokens || 11000,
        completion_tokens_details:
          keyData.dealChunk?.completion_tokens_details || {},
      },
    };
  } catch (error) {
    console.log(error);
    recordErrorLog(error, "AgentChat system error");
    return {
      success: false,
      message: error.message || "AI对话失败",
      content: null,
      tokenUsage: null,
    };
  }
};

const AgentWork = async (infoObject) => {
  // 设置执行上下文，供 AI 函数使用
  // 使用 sessionId 作为上下文的唯一标识，避免并发冲突
  const contextKey = infoObject.clientId || infoObject.sessionId || "default";

  // 设置整体工作超时计时器
  const workStartTime = Date.now();
  const checkWorkTimeout = () => {
    if (Date.now() - workStartTime > AGENT_WORK_TIMEOUT) {
      throw new Error(
        `工作超时（已运行 ${Math.floor(
          (Date.now() - workStartTime) / 60000
        )} 分钟），自动终止`
      );
    }
  };

  try {
    setContext({
      clientId: contextKey,
    });

    // 添加任务到队列
    const workControl = { isStopped: false };
    addWork(infoObject.sessionId, workControl);

    // 获取数据库连接时添加超时保护
    let connection;
    try {
      connection = await withTimeout(
        pool.getConnection(),
        30000, // 30秒获取连接超时
        "获取数据库连接超时，服务器繁忙请稍后重试"
      );
    } catch (connError) {
      recordErrorLog(connError, "AgentWork - getConnection timeout");
      removeWork(infoObject.sessionId);
      clearContext();
      return {
        success: false,
        message: connError.message,
        content: null,
        tokenUsage: null,
      };
    }
    infoObject.connection = connection;

    // 预加载 prompt 和 functions（异步）
    const { systemPrompt, agentFunctions } = await loadAgentConfig();
    infoObject.systemPrompt = systemPrompt;
    infoObject.agentFunctions = agentFunctions;

    infoObject.model = model;
    infoObject.tokenLimit = model.tokenLimit;
    // 标记退出待办循环的开关（由 exit_todolist 设置，单次有效）
    infoObject.exitTodolist = false;

    let isSystemSentForWorkPrompt = false; //是否为系统为了驱动任务而发送的消息
    let nextPromptReason = null; // tool | todolist | null
    let wookLoopUserSendPrompt = infoObject.newPrompt; // 保存第一次的用户消息
    let finalResponse = null; // 保存最后一次的AI回复
    let shouldContinue = false; // 标记是否需要继续循环（用于 tool calls 后自动继续）

    //首先获取一个新的workID

    // 创建当次工作的id
    const work = await getNewWorkId(infoObject);
    infoObject.workId = work.workId;
    infoObject.workIndex = work.workIndex;
    workControl.workId = work.workId;
    workControl.workIndex = work.workIndex;
    await updateWorkRecord(infoObject);
    let dialogue_index = 0;
    infoObject.nowDialogueIndex = dialogue_index;

    try {
      do {
        // 检查是否终止
        if (workControl.isStopped) {
          console.log(`Session ${infoObject.sessionId} terminated`);
          break;
        }

        // 检查整体工作超时
        try {
          checkWorkTimeout();
        } catch (timeoutError) {
          console.log(
            `Session ${infoObject.sessionId} work timeout: ${timeoutError.message}`
          );
          recordErrorLog(timeoutError, "AgentWork - work timeout");
          break;
        }

        // delay 2s continue loop
        await new Promise((resolve) => setTimeout(resolve, 2000));

        //Agent chat loop
        try {
          // 重置AgentChat 调用工具循环
          shouldContinue = false;

          // 对prompt进行处理
          if (isSystemSentForWorkPrompt) {
            if (nextPromptReason === "tool") {
              infoObject.newPrompt =
                "已经将工具调用结果告诉你，请你继续满足用户的需求 ，如果你需要对出function call工作循环，只需要回复一条正常不调用任何function使用@Agent.js 的消息 ---这条消息来自autoprovider系统";
            } else if (nextPromptReason === "todolist") {
              // 驱动提示保持简单，不再附带 todo 详情
              infoObject.newPrompt =
                "你现在还有未完成的todo，请继续工作。如果需要退出todolist工作循环，请调用对应方法退出，否则我们会一直循环和你对话！---这条消息来自autoprovider系统";
            } else {
              infoObject.newPrompt = "继续进行下一步工作";
            }
            infoObject.isSystemSentForWorkPrompt = true;
          } else {
            infoObject.isSystemSentForWorkPrompt = false;
            nextPromptReason = null;
          }

          //先创建一个dialogueId
          const dialogueId = uuidv4();
          infoObject.dialogueId = dialogueId;

          //标记消息发送者
          infoObject.dialogueSender = isSystemSentForWorkPrompt
            ? "system"
            : "client";

          // 系统驱动的循环提示需要写入对话历史，便于后续 level5 读取历史
          if (infoObject.dialogueSender === "system") {
            await updateDialogueRecord({
              dialogueId: infoObject.dialogueId,
              role: "user",
              content: infoObject.newPrompt,
              dialogue_index: infoObject.nowDialogueIndex,
              dialogue_sender: "system",
              work_id: infoObject.workId,
              is_agent_generate: 1,
            });
            infoObject.nowDialogueIndex++;
            // 记录完 user 消息后，创建新的 dialogueId 供后续 assistant 消息使用
            infoObject.dialogueId = uuidv4();
          }

          //对系统提示词进行标准化，替换其中的变量
          const standardizedSystemPrompt = await contentStandardization(
            infoObject.systemPrompt,
            infoObject
          );

          // 计算 System Prompt 和 Functions 的 Token
          const systemPromptToken = message2token(standardizedSystemPrompt);
          const agentFunctionsToken = message2token(
            JSON.stringify(infoObject.agentFunctions)
          );
          const preToken = systemPromptToken + agentFunctionsToken;
          infoObject.tokenLimit = infoObject.model.tokenLimit - preToken;

          //发送消息之前，comby 之前的聊天消息
          // const chatMessages = await assembleChatMessages(
          //   standardizedSystemPrompt,
          //   infoObject
          // );

          //直接调用level1，level1会递归调用所有level最终返回messages
          const chatMessages = await level1(infoObject.newPrompt, infoObject);
          console.log(
            "[AgentWork] chatMessages isArray:",
            Array.isArray(chatMessages),
            "length:",
            chatMessages?.length
          );

          // 检查 level1 返回的是否为需要停止 AgentWork 的标识（小模型需求分析未完成）
          // 必须在迭代 chatMessages 之前检查，因为此时 chatMessages 可能不是数组
          if (chatMessages && chatMessages.shouldStopAgentWork === true) {
            console.log(
              `[AgentWork] 小模型需求分析未完成，等待用户下一次对话，session: ${infoObject.sessionId}`
            );
            break; // 结束 AgentWork 循环，等待用户下一次发送消息
          }

          // 如果 chatMessages 不是数组，说明出错了
          if (!Array.isArray(chatMessages)) {
            console.log(
              `[AgentWork] chatMessages 不是数组，类型: ${typeof chatMessages}，内容:`,
              chatMessages
            );
            recordErrorLog(
              `chatMessages 不是数组: ${JSON.stringify(chatMessages)}`,
              "AgentWork-invalidChatMessages"
            );
            break;
          }

          // 调试输出：打印每条消息的详细信息
          console.log("[AgentWork] ========== 消息详情 ==========");
          chatMessages.forEach((msg, idx) => {
            const contentPreview =
              typeof msg.content === "string"
                ? msg.content.slice(0, 100)
                : JSON.stringify(msg.content)?.slice(0, 100);
            console.log(
              `[AgentWork] 消息[${idx}] role: ${msg.role}, content长度: ${
                msg.content?.length || 0
              }, 预览: ${contentPreview}...`
            );
            // 检查是否有额外字段
            const extraKeys = Object.keys(msg).filter(
              (k) =>
                !["role", "content", "tool_calls", "tool_call_id"].includes(k)
            );
            if (extraKeys.length > 0) {
              console.log(
                `[AgentWork] 消息[${idx}] 额外字段: ${extraKeys.join(", ")}`
              );
            }
          });
          console.log("[AgentWork] ================================");

          // 合并连续的 system 消息（MiniMax 等 API 可能不支持多个连续的 system 消息）
          const mergedMessages = [];
          let systemContentParts = [];
          for (const msg of chatMessages) {
            if (msg.role === "system") {
              // 收集 system 消息内容
              systemContentParts.push(msg.content);
            } else {
              // 遇到非 system 消息时，先将之前收集的 system 消息合并
              if (systemContentParts.length > 0) {
                mergedMessages.push({
                  role: "system",
                  content: systemContentParts.join("\n\n"),
                });
                systemContentParts = [];
              }
              mergedMessages.push(msg);
            }
          }
          // 如果最后还有未处理的 system 消息
          if (systemContentParts.length > 0) {
            mergedMessages.push({
              role: "system",
              content: systemContentParts.join("\n\n"),
            });
          }

          console.log(
            `[AgentWork] 消息合并: 原始 ${chatMessages.length} 条 -> 合并后 ${mergedMessages.length} 条`
          );

          // 为 Gemini 模型特殊处理：移除历史中的 tool_calls（因为缺少 thought_signature）
          let finalMessages = mergedMessages;
          const modelName = (infoObject.model?.name || "").toLowerCase();
          const isGeminiModel =
            modelName.includes("gemini") || modelName.includes("google");

          if (isGeminiModel) {
            finalMessages = mergedMessages.map((msg) => {
              // 只处理历史消息中带 tool_calls 的 assistant 消息
              // 将其转换为普通文本消息，避免 thought_signature 缺失问题
              if (
                msg.role === "assistant" &&
                Array.isArray(msg.tool_calls) &&
                msg.tool_calls.length > 0
              ) {
                const toolNames = msg.tool_calls
                  .map((tc) => tc?.function?.name)
                  .filter(Boolean)
                  .join(", ");
                return {
                  role: "assistant",
                  content:
                    msg.content ||
                    `[已执行工具调用: ${toolNames || "unknown"}]`,
                };
              }
              // 将 tool 消息转换为 assistant 消息
              if (msg.role === "tool") {
                return {
                  role: "assistant",
                  content: `[工具执行结果] ${msg.content || ""}`,
                };
              }
              return msg;
            });
            console.log(
              `[AgentWork] Gemini 模型检测到，已转换 tool_calls 历史消息`
            );
          }

          // build chat request params
          const params = {
            model: infoObject.model.name,
            messages: finalMessages, // 使用处理后的消息
            stream: true,
            tools: infoObject.agentFunctions,
            // max_tokens: infoObject.model.tokenLimit,
          };

          // call AI
          const response = await AgentChat(params, infoObject);

          // 检查 response 是否因为终止而返回
          if (response.message === "会话已终止") {
            break;
          }

          // 4. 处理 tool_calls，如果有tool_calls产生则继续循环
          if (response && response.invalidToolCall) {
            shouldContinue = true;
          } else if (
            response &&
            response.toolCalls &&
            response.toolCalls.length > 0
          ) {
            shouldContinue = true;
          } else {
            shouldContinue = false;
          }

          //完成一次对话之后，记录 token 使用量
          const inputTokens = response.tokenUsage?.prompt_tokens || 0;
          const outputTokens = response.tokenUsage?.completion_tokens || 0;

          // 保存 token 使用量到数据库
          await updateTokenUsage({
            workId: infoObject.workId,
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            connection: infoObject.connection,
          });

          // 如果 exit_todolist 被调用，跳过本轮工作循环，不再继续下一次 AgentChat
          // 根据循环原因设置下一轮系统提示
          const hasPendingTodo = await epoche(infoObject);
          if (infoObject.exitTodolist) {
            infoObject.exitTodolist = false;
            break;
          }
          if (shouldContinue) {
            isSystemSentForWorkPrompt = true;
            nextPromptReason = "tool";
          } else if (hasPendingTodo) {
            isSystemSentForWorkPrompt = true;
            nextPromptReason = "todolist";
          } else {
            isSystemSentForWorkPrompt = false;
            nextPromptReason = null;
          }
        } catch (error) {
          recordErrorLog(error, "Agent work in AgentWork");
          console.log(error);
          return {
            success: false,
            message: error.message || "AI对话失败",
            content: null,
            tokenUsage: null,
          };
        }
      } while (
        !workControl.isStopped &&
        (shouldContinue || (await epoche(infoObject)))
      );
    } catch (outerError) {
      console.log("[AgentWork] Outer error:", outerError);
      // 捕获外层错误（不在循环内的错误）
      recordErrorLog(outerError, "Agent work in AgentWork");
    } finally {
      // 确保连接被释放
      if (connection) {
        try {
          connection.release();
          console.log(
            `[AgentWork] Database connection released for session ${infoObject.sessionId}`
          );
        } catch (releaseError) {
          console.error(
            "[AgentWork] Failed to release connection:",
            releaseError
          );
        }
      }
      clearContext();
      removeWork(infoObject.sessionId);
    }
  } catch (error) {
    console.log("[AgentWork] System error:", error);
    recordErrorLog(error.message, "AgentWork system error");
    // 确保在异常情况下也清理资源
    clearContext();
    removeWork(infoObject.sessionId);
    return {
      success: false,
      message: error.message || "AI工作失败",
      content: null,
      tokenUsage: null,
    };
  }
};

// 暴露当前模型的 token 上限，供其他模块读取
AgentWork.tokenLimit = model.tokenLimit;

module.exports = AgentWork;
