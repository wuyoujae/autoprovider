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
    const context = getContext();
    const clientId =
      infoObject?.clientId ||
      infoObject?.sessionId ||
      context?.clientId ||
      "default";
    const operationCode = `<${mappingFunctionName[functionName]}>${content}</${mappingFunctionName[functionName]}>`;
    sendMessage(operationCode, {
      clientId,
      event: "message",
    });
    // 构造operationId
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
