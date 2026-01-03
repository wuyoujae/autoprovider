const { sendMessage } = require("../../../../sseCommunication");

/**
 * 发送 loading 提示给前端
 * @param {string} content - loading 文本（会被包裹在 <loading></loading> 中）
 * @param {Object} infoObject - 对话信息对象
 */
const sendLoadingContent = (content, infoObject = {}) => {
  const clientId = infoObject.clientId || infoObject.sessionId || "default";
  sendMessage(`<loading>${content}</loading>`, {
    clientId,
    event: "agent-words",
  });
};

module.exports = sendLoadingContent;
