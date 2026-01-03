const { sendMessage } = require("../systemAgentLoop/sseCommunication");

// 对话内容结束标志
const OVERFLAG = "OVERFLAG";

/**
 * 流式发送AI对话内容给前端
 * @param {string} content - AI生成的内容片段
 * @param {Object} infoObject - 对话信息对象
 */
const sendWordsContent = (content, infoObject) => {
  // 如果是结束标志，发送结束信号
  if (content === "overFlag" || content === "overFullContent") {
    sendMessage(`<words>${OVERFLAG}</words>`, {
      clientId: infoObject.clientId || infoObject.sessionId || "default",
      event: "agent-words",
    });
    return;
  }

  // 发送实际内容
  sendMessage(`<words>${content}</words>`, {
    clientId: infoObject.clientId || infoObject.sessionId || "default",
    event: "agent-words",
  });
};

module.exports = sendWordsContent;
