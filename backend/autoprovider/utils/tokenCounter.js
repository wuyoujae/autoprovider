/**
 * Token 计数器工具
 * 使用 gpt-tokenizer 库进行准确的 token 计算
 * 
 * 基于 OpenAI 的 cl100k_base tokenizer（GPT-4 使用的）
 * 对大多数现代 LLM（包括 Qwen、MiniMax、Kimi 等）都有较好的近似效果
 */

const { encode, decode, encodeChat } = require("gpt-tokenizer");

/**
 * 计算字符串的 token 数量
 * @param {string} str - 要计算的字符串
 * @returns {number} token 数量
 */
function countTokens(str) {
  if (!str || typeof str !== "string") return 0;
  try {
    const tokens = encode(str);
    return tokens.length;
  } catch (error) {
    console.error("[tokenCounter] encode error:", error.message);
    // 降级到估算方法
    return estimateTokens(str);
  }
}

/**
 * 计算消息数组的 token 数量（适用于 chat completion 格式）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @returns {number} token 数量
 */
function countMessagesTokens(messages) {
  if (!messages || !Array.isArray(messages)) return 0;
  try {
    // 使用 encodeChat 更准确地计算 chat 格式的 token
    // 它会考虑消息格式的额外 token（如 <|im_start|> 等）
    const tokens = encodeChat(messages);
    return tokens.length;
  } catch (error) {
    console.error("[tokenCounter] encodeChat error:", error.message);
    // 降级：逐条消息计算并加上格式开销
    let total = 0;
    for (const msg of messages) {
      // 每条消息大约有 4 个额外 token（role 标记、分隔符等）
      total += 4;
      if (msg.content) {
        total += countTokens(msg.content);
      }
      if (msg.role) {
        total += countTokens(msg.role);
      }
      // tool_calls 也需要计算
      if (msg.tool_calls) {
        total += countTokens(JSON.stringify(msg.tool_calls));
      }
    }
    // 每个 chat 请求还有 2 个额外 token
    total += 2;
    return total;
  }
}

/**
 * 估算 token 数量（降级方法，当 encode 失败时使用）
 * 中文字符约 1.5 token，英文单词约 1 token
 * @param {string} str - 要估算的字符串
 * @returns {number} 估算的 token 数量
 */
function estimateTokens(str) {
  if (!str) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
      (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
      (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
      (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
      (code >= 0x2b820 && code <= 0x2ceaf) || // CJK Extension E
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
      (code >= 0x2f800 && code <= 0x2fa1f) // CJK Compatibility Ideographs Supplement
    ) {
      count += 1.5;
    } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      // A-Z, a-z - 英文字母
      count += 0.25; // 平均 4 个字母约 1 token
    } else if (code >= 48 && code <= 57) {
      // 0-9 数字
      count += 0.5;
    } else if (code === 32) {
      // 空格
      count += 0.25;
    } else {
      count += 0.5;
    }
  }
  return Math.ceil(count);
}

/**
 * 将 token 数组解码为字符串
 * @param {number[]} tokens - token 数组
 * @returns {string} 解码后的字符串
 */
function decodeTokens(tokens) {
  if (!tokens || !Array.isArray(tokens)) return "";
  try {
    return decode(tokens);
  } catch (error) {
    console.error("[tokenCounter] decode error:", error.message);
    return "";
  }
}

/**
 * 截断字符串到指定的 token 数量
 * @param {string} str - 要截断的字符串
 * @param {number} maxTokens - 最大 token 数量
 * @param {string} [suffix="..."] - 截断后添加的后缀
 * @returns {string} 截断后的字符串
 */
function truncateToTokenLimit(str, maxTokens, suffix = "...") {
  if (!str || typeof str !== "string") return "";
  if (maxTokens <= 0) return "";

  try {
    const tokens = encode(str);
    if (tokens.length <= maxTokens) {
      return str;
    }

    // 为后缀预留 token
    const suffixTokens = encode(suffix);
    const availableTokens = maxTokens - suffixTokens.length;

    if (availableTokens <= 0) {
      return suffix;
    }

    // 截断 token 并解码
    const truncatedTokens = tokens.slice(0, availableTokens);
    const truncatedStr = decode(truncatedTokens);

    return truncatedStr + suffix;
  } catch (error) {
    console.error("[tokenCounter] truncate error:", error.message);
    // 降级：按字符估算截断
    const estimatedCharsPerToken = 3;
    const maxChars = maxTokens * estimatedCharsPerToken;
    if (str.length <= maxChars) return str;
    return str.slice(0, maxChars - suffix.length) + suffix;
  }
}

/**
 * 检查字符串是否超过 token 限制
 * @param {string} str - 要检查的字符串
 * @param {number} limit - token 限制
 * @returns {boolean} 是否超过限制
 */
function exceedsTokenLimit(str, limit) {
  return countTokens(str) > limit;
}

/**
 * 兼容旧接口：message2token
 * @deprecated 请使用 countTokens 代替
 */
const message2token = countTokens;

module.exports = {
  countTokens,
  countMessagesTokens,
  estimateTokens,
  decodeTokens,
  truncateToTokenLimit,
  exceedsTokenLimit,
  message2token, // 兼容旧接口
  // 直接导出原始函数供高级用途
  encode,
  decode,
};

