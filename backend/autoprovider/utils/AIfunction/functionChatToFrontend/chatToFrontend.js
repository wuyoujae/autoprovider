const { sendMessage } = require("../../systemAgentLoop/sseCommunication");
const { getContext } = require("../../systemAgentLoop/context");
const recordErrorLog = require("../../recordErrorLog");
const updateOperationRecord = require("../../systemAgentLoop/utils/updateOperationRecord");
const uuidv4 = require("uuid").v4;
const mappingFunctionName = {
  create_file: "create",
  delete_file: "delete",
  edit_file: "edit",
  read_file: "read",
  web_search: "websearch",
  web_read: "webread",
  sql_operation: "sql",
  bash_operation: "ran",
  create_todolist: "createtodolist",
  done_todo: "createtodolist",
  linter: "linter",
  deploy: "deploy",
  generate_project_name: "generateprojectname",
  generate_conversation_name: "generateconversationname",
  grep_file: "grep_file",
};
const chatToFrontend = async (content, functionName, infoObject) => {
  try {
    // 在非 SSE/非对话上下文（例如 createproject 初始化）时，允许调用方显式关闭前端推送与操作记录
    if (infoObject?.skipSendMessage) {
      return {};
    }

    const context = getContext();
    const clientId =
      infoObject?.clientId ||
      infoObject?.sessionId ||
      context?.clientId ||
      "default";

    // 没有有效 clientId 时不发送 SSE，避免把消息打到 default 通道
    const tag = mappingFunctionName[functionName];
    if (!tag) {
      recordErrorLog(`unknown functionName mapping: ${functionName}`, "chatToFrontend");
      return {};
    }

    const operationCode = `<${tag}>${content}</${tag}>`;

    // 仅当存在明确 clientId（非 default）才发送 SSE
    if (clientId && clientId !== "default") {
      sendMessage(operationCode, {
        clientId,
        event: "message",
      });
    }
    // 构造operationId
    // 仅当有 dialogueId 时才写入 operation_record（避免 dialogue_id 不能为空报错）
    if (infoObject?.dialogueId) {
      const newOperationId = uuidv4();
      await updateOperationRecord({
        operationId: newOperationId,
        dialogueId: infoObject.dialogueId,
        operationCode: operationCode,
        operationMethod: functionName,
        operationIndex: infoObject.operationIndex ? infoObject.operationIndex : 2,
      });
      infoObject.operationIndex = infoObject.operationIndex
        ? infoObject.operationIndex + 1
        : 3;
    }
    return {};
  } catch (error) {
    recordErrorLog(error, "chatToFrontend");
    return {
      status: 1,
      message: "chatToFrontend run fail",
      data: {
        error: "平台系统问题出错，请暂停工作",
      },
    };
  }
};

module.exports = chatToFrontend;
