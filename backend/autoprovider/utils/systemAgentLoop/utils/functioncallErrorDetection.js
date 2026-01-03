/**
 * 校验 AI 生成的 tool_call 是否有效
 * - 函数名必须在允许列表中
 * - arguments 必须是合法 JSON
 */
const validateToolCall = (toolCall, agentFunctions = []) => {
  // 校验函数名
  const allowedNames = new Set(
    agentFunctions.map((fn) => fn?.function?.name).filter(Boolean)
  );
  const toolName = toolCall?.function?.name;
  if (!toolName || !allowedNames.has(toolName)) {
    return {
      ok: false,
      message: `无效的函数名: ${toolName || "undefined"}`,
    };
  }

  // 校验参数 JSON
  let parsedArgs;
  try {
    parsedArgs = JSON.parse(toolCall.function.arguments);
  } catch (err) {
    return {
      ok: false,
      message: `函数 ${toolName} 的 arguments 不是合法 JSON：${err.message}`,
    };
  }

  // arguments 必须是对象或数组（按工具定义，通常是对象）
  const isObjectLike =
    parsedArgs !== null &&
    (typeof parsedArgs === "object" || Array.isArray(parsedArgs));
  if (!isObjectLike) {
    return {
      ok: false,
      message: `函数 ${toolName} 的 arguments 必须是对象/数组`,
    };
  }

  return { ok: true, parsedArgs };
};

module.exports = { validateToolCall };
