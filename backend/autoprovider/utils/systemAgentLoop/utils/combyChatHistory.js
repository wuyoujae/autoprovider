// 聊天历史记录数量常量
const pool = require("../../../db");
const recordErrorLog = require("../../recordErrorLog");
const {
  getUploadFile,
  formatUploadFilesContent,
  bindFilesToDialogue,
} = require("./combyChatHistory/getUploadFile");
const OpenAI = require("openai");
const { redis } = require("../../../db/redis");
// 使用准确的 token 计数器（基于 gpt-tokenizer）
const { countTokens, countMessagesTokens } = require("../../tokenCounter");
// 使用 qwen-long 模型进行上下文压缩
const QWENLONG_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWENLONG_API_KEY =
  process.env.QWENLONG_API_KEY || "sk-20dc2f0f2f6d45a58c0f531c80c05893";
const compressClient = new OpenAI({
  baseURL: QWENLONG_BASE_URL,
  apiKey: QWENLONG_API_KEY,
  timeout: 300000,
});

// 压缩上下文的 System Prompt
const COMPRESS_SYSTEM_PROMPT = `你是一个专业的对话上下文压缩助手。你的任务是将一段冗长的对话历史压缩成简洁但完整的摘要，保留所有关键信息。

## 压缩规则

1. **输出格式**：你必须输出一个 JSON 对象，包含两个字段：
   - \`userSummary\`: 压缩后的用户消息摘要（以用户视角描述请求了什么）
   - \`assistantSummary\`: 压缩后的助手消息摘要（以助手视角描述做了什么）

2. **时间顺序**：严格按照对话发生的时间顺序描述，使用"首先"、"然后"、"接着"、"最后"等连接词

3. **工具调用**：将所有 tool/function 调用压缩到 assistantSummary 中，用文字简洁描述：
   - 调用了什么方法
   - 操作了什么文件/资源
   - 得到了什么关键结果（如有报错，提炼出错误类型和位置）

4. **关键信息保留**：
   - 用户的核心需求和意图
   - 助手执行的关键操作和创建/修改的文件
   - 重要的错误信息（简化但保留错误类型、位置、原因）
   - 任务的完成状态

5. **压缩原则**：
   - 删除寒暄、确认性回复（如"好的"、"明白了"）
   - 合并重复或相似的操作
   - 用概括性语言代替冗长描述
   - 代码内容只保留文件名和关键修改点，不保留具体代码

## 示例

### 输入对话：
user: 帮我写一个login页面
assistant: 好的，我开始写了
tool: edit_file -> /src/pages/login.vue (创建登录表单组件)
user: 继续
assistant: 好的
tool: edit_file -> /src/api/auth.js (创建认证API)
user: 再帮我写一个register页面
assistant: 好的
tool: edit_file -> /src/pages/register.vue (创建注册页面)
user: 有报错
assistant: 我来检查一下错误
tool: linter -> Error: Cannot find module '@/utils/validate' at /src/pages/login.vue:15:8

### 输出：
\`\`\`json
{
  "userSummary": "我首先请求创建一个login登录页面，在你完成后我请求继续完善，然后请求创建一个register注册页面，最后发现代码有报错并请求检查。",
  "assistantSummary": "我首先调用edit_file创建了/src/pages/login.vue登录页面组件，然后调用edit_file创建了/src/api/auth.js认证API文件，接着调用edit_file创建了/src/pages/register.vue注册页面。当用户报告错误后，我调用linter检查发现错误：模块引用错误 - 在/src/pages/login.vue第15行找不到@/utils/validate模块。"
}
\`\`\`

## 注意事项
- 输出必须是合法的 JSON 格式
- 不要添加任何 JSON 之外的内容
- 摘要语言简洁，避免啰嗦
- 确保压缩后仍能理解完整的对话脉络和任务进展`;

function isValidJSON(str) {
  try {
    // 尝试将字符串解析为 JavaScript 对象
    JSON.parse(str);
    return true; // 如果解析成功，说明是有效的 JSON
  } catch (error) {
    // 如果解析失败，JSON.parse() 会抛出一个 SyntaxError
    // console.error("Invalid JSON:", error); // 可选：记录错误用于调试
    return false; // 不是有效的 JSON
  }
}

/**
 * 验证并修复 tool_calls 和 tool 消息的配对完整性
 * 确保每个带 tool_calls 的 assistant 消息后面紧跟对应的 tool 结果消息
 * @param {Array<Object>} messages - 消息数组
 * @returns {Array<Object>} 修复后的消息数组
 */
function validateAndFixToolCallPairs(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }

  const result = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    // 检查是否是带 tool_calls 的 assistant 消息
    if (
      msg.role === "assistant" &&
      Array.isArray(msg.tool_calls) &&
      msg.tool_calls.length > 0
    ) {
      // 收集这个 assistant 消息中所有 tool_call 的 id
      const expectedToolCallIds = new Set(
        msg.tool_calls.map((tc) => tc.id).filter(Boolean)
      );

      // 查找后续的 tool 消息
      const followingTools = [];
      let j = i + 1;
      while (j < messages.length && messages[j].role === "tool") {
        followingTools.push(messages[j]);
        j++;
      }

      // 检查 tool 消息是否与 tool_calls 匹配
      const foundToolCallIds = new Set(
        followingTools.map((t) => t.tool_call_id).filter(Boolean)
      );

      // 检查是否所有 tool_call 都有对应的 tool 结果
      const allMatched =
        expectedToolCallIds.size > 0 &&
        [...expectedToolCallIds].every((id) => foundToolCallIds.has(id));

      if (allMatched) {
        // 配对完整，正常添加
        result.push(msg);
        for (const tool of followingTools) {
          result.push(tool);
        }
        i = j;
      } else {
        // 配对不完整，将 assistant 消息转换为普通消息（移除 tool_calls）
        console.log(
          `[validateAndFixToolCallPairs] 发现不完整的 tool_calls 配对，移除 tool_calls。` +
            ` 期望: [${[...expectedToolCallIds].join(", ")}], 实际: [${[
              ...foundToolCallIds,
            ].join(", ")}]`
        );

        // 保留 assistant 消息的 content，但移除 tool_calls
        const fixedMsg = {
          role: "assistant",
          content:
            msg.content ||
            `[历史记录] 调用了 ${msg.tool_calls
              .map((tc) => tc.function?.name)
              .filter(Boolean)
              .join(", ")} 方法`,
        };
        result.push(fixedMsg);

        // 跳过这个 assistant 消息，但不跳过后面的 tool 消息（它们可能属于其他配对）
        i++;
      }
    } else if (msg.role === "tool") {
      // 检查这个 tool 消息前面是否有对应的 assistant tool_call
      // 向前查找最近的 assistant 消息
      let hasMatchingAssistant = false;
      for (let k = result.length - 1; k >= 0; k--) {
        const prevMsg = result[k];
        if (prevMsg.role === "assistant" && Array.isArray(prevMsg.tool_calls)) {
          // 检查是否包含匹配的 tool_call_id
          const hasMatch = prevMsg.tool_calls.some(
            (tc) => tc.id === msg.tool_call_id
          );
          if (hasMatch) {
            hasMatchingAssistant = true;
          }
          break; // 只检查最近的带 tool_calls 的 assistant
        } else if (prevMsg.role === "assistant" || prevMsg.role === "user") {
          // 遇到普通的 assistant 或 user 消息，停止查找
          break;
        }
      }

      if (hasMatchingAssistant) {
        result.push(msg);
      } else {
        // 没有匹配的 assistant，将 tool 消息转换为普通 assistant 消息
        console.log(
          `[validateAndFixToolCallPairs] 发现孤立的 tool 消息 (tool_call_id: ${msg.tool_call_id})，转换为 assistant 消息`
        );
        result.push({
          role: "assistant",
          content: `[历史工具调用结果] ${msg.content || ""}`,
        });
      }
      i++;
    } else {
      // 普通消息，直接添加
      result.push(msg);
      i++;
    }
  }

  return result;
}

/**
 * 计算字符串的 token 数量
 * 使用 gpt-tokenizer 进行准确计算（基于 cl100k_base）
 * @param {string} str - 要计算的字符串
 * @returns {number} token 数量
 */
function message2token(str) {
  return countTokens(str);
}

/**
 * 将 message 裁剪为 token 计数所需的最小字段，避免把 dialogue_id 等额外字段也算进 token
 * @param {any} msg
 * @returns {{role?: string, content?: any, tool_calls?: any, tool_call_id?: any}}
 */
function normalizeMessageForToken(msg) {
  if (!msg || typeof msg !== "object") return {};
  const normalized = {
    role: msg.role,
    content: msg.content,
  };
  // OpenAI tools 相关字段
  if (msg.tool_calls) normalized.tool_calls = msg.tool_calls;
  if (msg.tool_call_id) normalized.tool_call_id = msg.tool_call_id;
  return normalized;
}

/**
 * 计算一组 messages 的 token 数（尽量贴近 chat API 口径）
 * @param {Array} messages
 * @returns {number}
 */
function countGroupTokens(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  const normalized = messages.map(normalizeMessageForToken);
  return countMessagesTokens(normalized);
}
/**
 * 从数据库连接中获取指定会话的聊天历史记录，并转换为消息格式。
 * @param {Object} params
 * @param {Object} params.connection - 数据库连接（已开启事务）
 * @param {string} params.workId - 当前工作ID
 * @param {number} params.historyLimit - 需要获取的历史记录组数 (默认100)
 * @param {number} params.tokenLimit - token 限制 (可选)
 * @param {number} params.presetMessagesToken - 预设消息消耗的 token（用于日志）
 * @param {number} params.maxModelToken - 模型最大可用 token（用于日志）
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
const loadChatHistory = async ({
  connection,
  workId,
  tokenLimit,
  infoObject,
  presetMessagesToken = 0,
  maxModelToken = tokenLimit,
}) => {
  let shouldReleaseConnection = false;
  try {
    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }

    if (!workId) {
      recordErrorLog(
        "loadChatHistory 缺少工作ID",
        "Agent wook loog in loadChatHistory"
      );
      return [];
    }

    await connection.query("use autoprovider_open");

    // 1. 获取 session_id
    const [workRows] = await connection.query(
      "SELECT session_id FROM work_record WHERE work_id = ?",
      [workId]
    );
    if (workRows.length === 0) {
      return []; // Work not found
    }
    const sessionId = workRows[0].session_id;

    // 2. 获取 session 下的所有 works，按 work_index 倒序
    const [works] = await connection.query(
      "SELECT work_id FROM work_record WHERE session_id = ? ORDER BY work_index DESC",
      [sessionId]
    );

    let messageGroups = []; // 存放最终的消息组 (每个组是一个消息数组)
    const tempStack = []; // 辅助栈，用于组装消息 (Assistant/Tool)
    let totalTokens = 0; // 累计全部历史消息的 token 估算值
    // 3. 遍历 works (倒序)
    for (let i = 0; i < works.length; i++) {
      const work = works[i];
      const currentWorkId = work.work_id;

      // 获取该 work 下的所有 dialogues，按 dialogue_index 倒序
      const [dialogues] = await connection.query(
        `SELECT 
          dialogue_id,
          role_type,
          content,
          tool_call_id,
          tool_call
        FROM dialogue_record
        WHERE work_id = ?
          AND dialogue_status = 0
          AND (is_mini_model IS NULL OR is_mini_model = 0)
          AND (isCompress IS NULL OR isCompress = 0)
        ORDER BY dialogue_index DESC`,
        [currentWorkId]
      );

      // 4. 遍历 dialogues (倒序) 并分组
      for (const row of dialogues) {
        // 构建消息对象，保留 dialogue_id 用于后续压缩标记
        let message;
        if (row.role_type === "tool") {
          message = {
            dialogue_id: row.dialogue_id,
            role: "tool",
            tool_call_id: row.tool_call_id,
            content: isValidJSON(row.content)
              ? row.content
              : JSON.stringify(row.content),
          };
        } else if (row.role_type === "assistant" && row.tool_call) {
          let toolCalls = [];
          try {
            toolCalls =
              typeof row.tool_call === "string"
                ? JSON.parse(row.tool_call)
                : row.tool_call;
            if (!Array.isArray(toolCalls)) {
              toolCalls = [toolCalls];
            }
          } catch (e) {
            console.error("解析 tool_call 失败:", e);
            toolCalls = [];
          }
          message = {
            dialogue_id: row.dialogue_id,
            role: row.role_type,
            content: row.content || "",
            tool_calls: toolCalls,
          };
        } else {
          message = {
            dialogue_id: row.dialogue_id,
            role: row.role_type,
            content: row.content,
          };
        }

        // 如果是 user 消息，追加该 dialogue 的附件内容
        if (row.role_type === "user" && row.dialogue_id) {
          try {
            const attachContent = await getSourceList({
              connection,
              dialogueId: row.dialogue_id,
            });
            if (attachContent) {
              const baseContent = message.content || "";
              message.content = `${baseContent}\n\n${attachContent}`;
            }
          } catch (e) {
            recordErrorLog(e, "loadChatHistory-getSourceList");
          }
        }

        // 分组逻辑
        if (row.role_type === "user") {
          // 遇到 user，形成一组
          const currentGroup = [message];
          while (tempStack.length > 0) {
            currentGroup.push(tempStack.pop());
          }

          // 1. 输出消息组

          // 计算该组 token，并累计 totalTokens（不再截断）
          // 使用 countMessagesTokens（encodeChat）口径，避免 JSON.stringify 造成 token 偏大
          totalTokens += countGroupTokens(currentGroup);

          // 直接追加该组，不再受 tokenLimit 截断
          messageGroups.push(currentGroup);
        } else {
          // assistant 或 tool，入栈
          tempStack.push(message);
        }
      }
    }

    // Representing adding to messageGroups (logical stack)
    // Representing reversing messageGroups
    // Representing flattening

    // 如果循环结束 tempStack 还有剩余 (orphaned assistants)，通常忽略，因为不完整

    // 5. 组装最终 messages
    // messageGroups 目前是 [LatestGroup, OlderGroup, ...] (因为我们是倒序遍历 works/dialogues)
    // 但每个 Group 内部是 [User, Tool, Asst] (时间正序)
    // 我们需要返回的 messages 应该是时间正序: [OldestGroup, ..., LatestGroup]
    // 所以需要 reverse messageGroups

    // 如果 totalTokens 超过 tokenLimit 的 95%，需要压缩历史消息
    // messageGroups 当前是 [LatestGroup, OlderGroup, ...] 倒序排列
    let didCompress = false;
    let compressIterations = 0;
    const MAX_COMPRESS_ITERATIONS = 5; // 最大压缩次数，防止无限循环
    let lastTotalTokens = totalTokens;
    const COMPRESS_THRESHOLD = 0.95; // 压缩触发阈值：token 使用超过 95% 时触发压缩
    const compressThresholdTokens = Math.floor(tokenLimit * COMPRESS_THRESHOLD);

    while (totalTokens > compressThresholdTokens && messageGroups.length > 0) {
      if (!didCompress) {
        // 首次压缩前输出一次压缩参数日志
        console.log("----开始处理压缩-----");
        console.log("压缩触发时参数：");
        console.log(`最大可用token数：${maxModelToken}`);
        console.log(`presetMessages消耗了的token：${presetMessagesToken}`);
        console.log(`剩余给dialogue历史可用token：${tokenLimit}`);
        console.log(`压缩触发阈值(95%)：${compressThresholdTokens}`);
        console.log(`当前历史token使用量：${totalTokens}`);
      }
      didCompress = true;
      compressIterations++;

      // 防止无限循环：超过最大压缩次数
      if (compressIterations > MAX_COMPRESS_ITERATIONS) {
        console.log(
          `[loadChatHistory] 达到最大压缩次数 ${MAX_COMPRESS_ITERATIONS}，强制跳出循环`
        );
        break;
      }

      const groupCount = messageGroups.length;
      let keepGroups = []; // 保留不压缩的组
      let compressGroups = []; // 需要压缩的组

      if (groupCount > 2) {
        // 保留最新的 2 组（索引 0, 1），压缩其余的（索引 2 到最后）
        keepGroups = messageGroups.slice(0, 2);
        compressGroups = messageGroups.slice(2);
      } else if (groupCount === 2) {
        // 保留最新的 1 组（索引 0），压缩另一组（索引 1）
        keepGroups = messageGroups.slice(0, 1);
        compressGroups = messageGroups.slice(1);
      } else {
        // 只有 1 组，直接压缩这一组
        keepGroups = [];
        compressGroups = messageGroups;
      }

      // 调用压缩方法，传入需要压缩的组（确保 infoObject 包含必要信息）
      const compressInfoObject = {
        ...infoObject,
        connection, // 确保 connection 可用
        workId, // 确保 workId 可用
        sessionId, // 确保 sessionId 可用
      };
      const compressedGroups = await compressChatHistory(
        compressGroups,
        compressInfoObject
      );

      // 合并保留的组和压缩后的组（保留的在前，压缩后的在后）
      messageGroups = [...keepGroups, ...compressedGroups];

      // 重新计算 totalTokens（使用一致口径）
      totalTokens = 0;
      for (const group of messageGroups) {
        totalTokens += countGroupTokens(group);
      }

      // 如果压缩后只剩一组且仍超过 95% 阈值，说明无法再压缩，直接跳出避免死循环
      if (messageGroups.length <= 1 && totalTokens > compressThresholdTokens) {
        console.log("[loadChatHistory] 压缩后仍超过95%阈值但无法继续压缩，跳出循环");
        break;
      }

      // 防止无效压缩：如果 token 数量没有明显减少（减少不到 10%），说明压缩无效
      const tokenReduction = lastTotalTokens - totalTokens;
      const reductionRate = tokenReduction / lastTotalTokens;
      if (reductionRate < 0.1 && compressIterations > 1) {
        console.log(
          `[loadChatHistory] 压缩效果不明显（减少 ${(
            reductionRate * 100
          ).toFixed(1)}%），跳出循环避免无限压缩`
        );
        break;
      }
      lastTotalTokens = totalTokens;
    }

    const finalMessages = [];
    for (let i = messageGroups.length - 1; i >= 0; i--) {
      finalMessages.push(...messageGroups[i]);
    }

    if (didCompress) {
      console.log("----开始压缩------");
      console.log("压缩后参数");
      console.log(`最大可用token数：${maxModelToken}`);
      console.log(`presetMessages消耗了的token：${presetMessagesToken}`);
      console.log(`剩余给dialogue历史可用token：${totalTokens}`);
      console.log("-----压缩完成------");
    }

    // 删除 dialogue_id 字段，避免发送给 API 时出错（MiniMax 等 API 不接受额外字段）
    const cleanedMessages = finalMessages.map((msg) => {
      const { dialogue_id, ...rest } = msg;
      return rest;
    });

    // 验证并修复 tool_calls 和 tool 消息的配对完整性
    // 确保每个带 tool_calls 的 assistant 消息后面紧跟对应的 tool 结果消息
    return validateAndFixToolCallPairs(cleanedMessages);
  } catch (error) {
    recordErrorLog(error, "loadChatHistory");
    return [];
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

/**
 * 压缩历史消息组，使用 qwen-long 模型生成摘要
 * @param {Array<Array<{role: string, content: string, dialogue_id?: string}>>} messageGroups - 需要压缩的消息组
 * @param {Object} infoObject - 上下文信息
 * @returns {Array<Array<{role: string, content: string}>>} 压缩后的消息组（单组）
 */
const compressChatHistory = async (messageGroups, infoObject) => {
  if (!compressClient) {
    recordErrorLog(
      "compressClient 未初始化，无法压缩上下文",
      "compressChatHistory"
    );
    return messageGroups;
  }

  if (!messageGroups || messageGroups.length === 0) {
    return messageGroups;
  }

  try {
    // 1. 收集所有被压缩消息的 dialogue_id
    const compressedDialogueIds = [];
    for (const group of messageGroups) {
      for (const msg of group) {
        if (msg.dialogue_id) {
          compressedDialogueIds.push(msg.dialogue_id);
        }
      }
    }
    console.log(
      `[compressChatHistory] 待压缩消息数: ${compressedDialogueIds.length}`
    );

    // 2. 直接将 messageGroups 转为 JSON 文本（qwen-long 支持超长上下文）
    // messageGroups 是倒序的，反转为时间正序后传给模型
    const reversedGroups = [...messageGroups].reverse();
    const dialogueText = JSON.stringify(reversedGroups, null, 2);
    console.log(
      `[compressChatHistory] 开始压缩，原始对话长度: ${dialogueText.length} 字符，组数: ${messageGroups.length}`
    );

    // 3. 调用 qwen-long 模型进行压缩
    const response = await compressClient.chat.completions.create({
      model: "qwen-long",
      messages: [
        {
          role: "system",
          content: COMPRESS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `请压缩以下对话历史：\n\n${dialogueText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    // 4. 解析返回结果
    const resultContent = response.choices?.[0]?.message?.content || "";
    console.log(
      `[compressChatHistory] 模型返回: ${resultContent.slice(0, 200)}...`
    );

    let compressed;
    try {
      compressed = JSON.parse(resultContent);
    } catch (parseErr) {
      recordErrorLog(parseErr, "compressChatHistory-parseJSON");
      console.log("[compressChatHistory] JSON 解析失败，返回原始消息组");
      return messageGroups;
    }

    const userSummary = compressed.userSummary || "（用户请求摘要缺失）";
    const assistantSummary =
      compressed.assistantSummary || "（助手回复摘要缺失）";

    // 5. 将被压缩的原始消息标记为已压缩（isCompress = 1）
    if (compressedDialogueIds.length > 0 && infoObject.connection) {
      try {
        const placeholders = compressedDialogueIds.map(() => "?").join(",");
        await infoObject.connection.query(
          `UPDATE dialogue_record SET isCompress = 1 WHERE dialogue_id IN (${placeholders})`,
          compressedDialogueIds
        );
        console.log(
          `[compressChatHistory] 已标记 ${compressedDialogueIds.length} 条消息为已压缩`
        );
      } catch (updateErr) {
        recordErrorLog(updateErr, "compressChatHistory-markCompressed");
        console.log(
          "[compressChatHistory] 标记压缩消息失败:",
          updateErr.message
        );
      }
    }

    // 6. 将压缩后的摘要消息插入到 dialogue_record 表
    const { v4: uuidv4 } = require("uuid");
    const userDialogueId = uuidv4();
    const assistantDialogueId = uuidv4();

    if (infoObject.connection && infoObject.workId) {
      try {
        // 插入压缩后的 user 摘要消息
        await infoObject.connection.query(
          `INSERT INTO dialogue_record 
            (dialogue_id, role_type, content, dialogue_index, dialogue_sender, work_id, session_id, is_agent_generate) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userDialogueId,
            "user",
            `[历史摘要] ${userSummary}`,
            -2, // 使用负数索引标识摘要消息，排在正常消息之前
            "system",
            infoObject.workId,
            infoObject.sessionId || null,
            1, // 标记为系统生成
          ]
        );

        // 插入压缩后的 assistant 摘要消息
        await infoObject.connection.query(
          `INSERT INTO dialogue_record 
            (dialogue_id, role_type, content, dialogue_index, dialogue_sender, work_id, session_id, is_agent_generate) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            assistantDialogueId,
            "assistant",
            `[历史摘要] ${assistantSummary}`,
            -1, // 使用负数索引标识摘要消息
            "system",
            infoObject.workId,
            infoObject.sessionId || null,
            1, // 标记为系统生成
          ]
        );

        console.log(
          `[compressChatHistory] 已插入压缩摘要消息: user=${userDialogueId}, assistant=${assistantDialogueId}`
        );
      } catch (insertErr) {
        recordErrorLog(insertErr, "compressChatHistory-insertSummary");
        console.log(
          "[compressChatHistory] 插入摘要消息失败:",
          insertErr.message
        );
      }
    }

    // 7. 构建压缩后的消息组（单组，包含 user + assistant）
    const compressedGroup = [
      {
        dialogue_id: userDialogueId,
        role: "user",
        content: `[历史摘要] ${userSummary}`,
      },
      {
        dialogue_id: assistantDialogueId,
        role: "assistant",
        content: `[历史摘要] ${assistantSummary}`,
      },
    ];

    console.log(
      `[compressChatHistory] 压缩完成，原始 ${messageGroups.length} 组 -> 1 组`
    );

    // 返回压缩后的单组（保持 messageGroups 的结构，即数组的数组）
    return [compressedGroup];
  } catch (error) {
    recordErrorLog(error, "compressChatHistory");
    console.log(
      `[compressChatHistory] 压缩失败: ${error.message}，返回原始消息组`
    );
    return messageGroups;
  }
};

/**
 * 将 presetMessages 和聊天历史消息组合。
 * @param {Array<{role: string, content: string}>} presetMessages - 预设消息（包含 system prompt 和 user prompt）
 * @param {Object} infoObject - 包含连接、workId、tokenLimit 等信息
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
const assembleChatMessages = async (presetMessages, infoObject) => {
  const messages = [];

  // 检查 presetMessages 是否有效
  if (!Array.isArray(presetMessages) || presetMessages.length === 0) {
    recordErrorLog(
      "presetMessages 为空或无效",
      "Agent work loop in assembleChatMessages"
    );
    return [];
  }

  // ==================== 计算可用 token ====================
  let availableTokenLimit = infoObject.tokenLimit;

  // 1. 计算 presetMessages 的 token 消耗
  // 使用 countMessagesTokens（encodeChat）口径，避免 JSON.stringify 导致 token 偏大
  const presetMessagesToken = countGroupTokens(presetMessages);
  console.log(
    `[assembleChatMessages] presetMessages token: ${presetMessagesToken}`
  );

  // 将 presetMessagesToken 存入 Redis，供接口查询使用
  if (infoObject.sessionId) {
    try {
      const redisKey = `preset_token:${infoObject.sessionId}`;
      await redis.set(redisKey, Math.round(presetMessagesToken), "EX", 86400); // 24小时过期
    } catch (redisErr) {
      console.log(
        "[assembleChatMessages] 存储 preset token 到 Redis 失败:",
        redisErr.message
      );
    }
  }

  // 2. 从可用 token 中扣除 presetMessages 的 token，20 token 是一些占位符或者消息盈余预留
  const reservedToken = presetMessagesToken + 20;
  availableTokenLimit = Math.max(0, availableTokenLimit - reservedToken);
  console.log(
    `[assembleChatMessages] 预留 token: ${reservedToken}, 历史可用 token: ${availableTokenLimit}`
  );

  // 3. 计算新prompt的token量
  const newPromptToken = message2token(infoObject.newPrompt);
  console.log(`[assembleChatMessages] newPrompt token: ${newPromptToken}`);
  availableTokenLimit = Math.max(0, availableTokenLimit - newPromptToken);

  //presetMessages其实就是相当于system prompt了，只是带了很多上下文的信息在其中
  // ==================== 添加 presetMessages ====================
  messages.push(...presetMessages);

  // ==================== 获取聊天历史 ====================
  const chatHistory = await loadChatHistory({
    connection: infoObject.connection,
    workId: infoObject.workId,
    tokenLimit: availableTokenLimit,
    infoObject: infoObject,
    presetMessagesToken,
    maxModelToken: infoObject.tokenLimit,
  });

  if (Array.isArray(chatHistory) && chatHistory.length > 0) {
    // 直接推送历史消息，不再转换 tool 消息
    messages.push(...chatHistory);
  }

  // 将“当前上下文总 token（preset + history）”存入 Redis，供前端轮询展示使用
  // 避免 gettokenusage 每次轮询都全量加载/计算导致卡死或失败，从而前端显示长期不更新
  if (infoObject.sessionId) {
    try {
      const historyTokens = Array.isArray(chatHistory)
        ? countMessagesTokens(chatHistory)
        : 0;
      const totalContextTokens = Math.round(presetMessagesToken + historyTokens);
      const contextRedisKey = `context_token:${infoObject.sessionId}`;
      const historyRedisKey = `context_history_token:${infoObject.sessionId}`;
      await redis.set(contextRedisKey, totalContextTokens, "EX", 86400);
      await redis.set(historyRedisKey, Math.round(historyTokens), "EX", 86400);
    } catch (redisErr) {
      console.log(
        "[assembleChatMessages] 存储 context token 到 Redis 失败:",
        redisErr.message
      );
    }
  }

  // 【重要】user 消息已在 AgentWork 中写入 dialogue_record，
  // loadChatHistory 会从数据库读取，这里不再重复追加，避免消息重复
  return messages;
};

/**
 * 获取指定 dialogue 的附件内容，格式化后返回文本
 */
const getSourceList = async ({ connection, dialogueId }) => {
  if (!dialogueId) return "";
  let shouldReleaseConnection = false;
  try {
    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }

    await connection.query("use autoprovider_open");
    const [rows] = await connection.query(
      `SELECT source_name, source_type, source_content 
       FROM source_list 
       WHERE dialogue_id = ? AND source_status = 0 
       ORDER BY create_time ASC`,
      [dialogueId]
    );

    if (!rows || rows.length === 0) return "";

    const files = rows.map((row) => ({
      source_name: row.source_name,
      source_type: row.source_type,
      source_content: row.source_content || "",
    }));

    return formatUploadFilesContent(files);
  } catch (error) {
    recordErrorLog(error, "getSourceList");
    return "";
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

module.exports = {
  loadChatHistory,
  assembleChatMessages,
  message2token,
  getUploadFile,
  formatUploadFilesContent,
  bindFilesToDialogue,
  getSourceList,
};
