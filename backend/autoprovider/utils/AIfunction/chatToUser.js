const { sendMessage } = require("../systemAgentLoop/sseCommunication");
const { getContext } = require("../systemAgentLoop/context");
/**
 * 将消息发送给前端用户
 * @param {{ content?: string }} payload
 * @param {Object} infoObject - 对话信息对象
 * @param {Object} operationInfoObject - 操作记录信息对象
 * @returns {"done"}
 */
const chatToUser = async (payload = {}, infoObject, operationInfoObject) => {
  const content = payload?.content;

  if (!content || typeof content !== "string") {
    console.warn("[chatToUser] ⚠️ 未提供有效的 content，跳过发送:", payload);
    return "done";
  }

  const message = content;

  // 从执行上下文中获取 clientId
  const context = getContext();
  const clientId = context?.clientId || "default";

  const result = sendMessage(`<words>${message}</words>`, {
    clientId: clientId,
    event: "chat-to-user",
  });

  if (result !== "done") {
    console.warn("[chatToUser] ⚠️ SSE 消息发送未成功，返回值:", result);
  }

  // 注意：操作记录已由 AgentWork 统一处理
  // operationInfoObject 已经被添加到 infoObject.pendingOperations 中
  // 在 AgentWork 获取 dialogue_id 后会统一记录所有操作
  console.log("[chatToUser] 操作已添加到待记录队列，将在 AgentWork 中统一记录");

  return "done";
};

module.exports = chatToUser;
