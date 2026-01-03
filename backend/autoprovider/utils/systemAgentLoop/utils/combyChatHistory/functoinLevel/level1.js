const level2 = require("./level2");
const level5 = require("./level5");
const level3 = require("./level3");
const level4 = require("./level4");
const sendLoadingContent = require("./utils/sendLoadingContent");

const level1 = async (promptContent, infoObject) => {
  if (infoObject.dialogueSender === "client") {
    // 通知前端正在加载任务上下文
    sendLoadingContent("正在加载任务上下文", infoObject);

    // 如果此时是用户发送的消息，则需要调用 level2.js 进行需求分析
    const level2Result = await level2(promptContent, infoObject);

    // 检查 level2 返回的是否为需要停止 AgentWork 的标识
    if (level2Result && level2Result.shouldStopAgentWork === true) {
      // 需求分析未完成，直接返回停止标识给 AgentWork
      return {
        shouldStopAgentWork: true,
        isAnalysisDone: false,
        replyToUser: level2Result.replyToUser,
      };
    }

    // 需求分析完成，继续调用后续 level（level3/level4）组装 messages
    const level3Result = await level3(
      level2Result.demandAnalysisResults,
      infoObject
    );
    const level4Result = await level4(level3Result, infoObject);
    return level4Result;
  } else if (infoObject.dialogueSender === "system") {
    // 如果此时是系统为了驱动任务而发送的消息，则需要调用 level5.js
    const messages = await level5(promptContent, infoObject);
    return messages;
  }
};

module.exports = level1;
