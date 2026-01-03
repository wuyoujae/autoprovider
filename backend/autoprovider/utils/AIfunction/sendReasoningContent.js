const { sendMessage } = require("../systemAgentLoop/sseCommunication");

// 深度思考结束标志
const OVERFLAG = "OVERFLAG";

const sendReasoningContent = (content, infoObject) => {
  if (content === "overFlag" || content === "overFullContent") {
    sendMessage(`<through>${OVERFLAG}</through>`, {
      clientId: infoObject.clientId || infoObject.sessionId || "default",
      event: "agent-thinking",
    });
    return;
  }
  sendMessage(`<through>${content}</through>`, {
    clientId: infoObject.clientId || infoObject.sessionId || "default",
    event: "agent-thinking",
  });
};

module.exports = sendReasoningContent;
