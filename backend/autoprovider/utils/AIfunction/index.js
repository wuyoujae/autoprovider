const createFile = require("./createFile");
const editFile = require("./editFile");
const readFile = require("./readFile");
const deleteFile = require("./deleteFile");
const bashOperation = require("./bashOperation");
const sqlOperation = require("./sqlOperation");
const getFilesTree = require("./getFilesTree");
const createTodolist = require("./createTodoList");
const doneTodo = require("./doneTodo");
const deploy = require("./deploy");
const generateProjectName = require("./generateProjectName");
const generateConversationName = require("./generateConversationName");
const chatToUser = require("./chatToUser");
const webSearch = require("./webSearch");
const exitTodolist = require("./exitTodolist");
const grepFile = require("./grep_file/grep_file");
const linter = require("./linter/linter");
const recordErrorLog = require("../recordErrorLog");

// 函数名映射表：将 snake_case 转换为对应的函数
const functionMap = {
  create_file: createFile,
  edit_file: editFile,
  read_file: readFile,
  delete_file: deleteFile,
  bash_operation: bashOperation,
  sql_operation: sqlOperation,
  web_search: webSearch,
  web_read: webSearch, // 复用 webSearch，具体行为由 search_type 控制
  create_todolist: createTodolist,
  done_todo: doneTodo,
  deploy: deploy,
  generate_project_name: generateProjectName,
  generate_conversation_name: generateConversationName,
  chat_to_user: chatToUser,
  exit_todolist: exitTodolist,
  grep_file: grepFile,
  linter: linter,
};

/**
 * 统一的函数调用入口
 * @param {string} functionName - 函数名称（snake_case）
 * @param {Object} payload - 函数参数
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
const callFunction = async (functionName, payload, infoObject, toolCallId) => {
  try {
    // 查找对应的函数
    const targetFunction = functionMap[functionName];

    if (!targetFunction) {
      recordErrorLog(`function ${functionName} not found`, "callFunction");
      return {
        status: 1,
        message: `function ${functionName} not found`,
        data: {
          error: `函数 ${functionName} 未实现或不存在,请你检查一下函数名是否符合你能调用的function表中的信息，请重新调用其他存在的方法`,
        },
      };
    }

    const result = await targetFunction(payload, infoObject);

    // 函数返回结果格式：
    // {
    //   status: 0,  // 0是成功，1是失败
    //   message: "调用成功或者失败的消息，只能是字符串",
    //   data: "每个function自己定义data里面的内容，可能是任何形式，比如字符串，对象，数组等",
    // }
    // 注意：dialogue_record 的写入已移至 AgentChat 中统一处理（合并所有工具结果为一条消息）
    return result;
  } catch (error) {
    recordErrorLog(error, "callFunction");
    return {};
  }
};

module.exports = {
  createFile,
  editFile,
  readFile,
  deleteFile,
  bashOperation,
  sqlOperation,
  getFilesTree,
  createTodolist,
  doneTodo,
  deploy,
  generateProjectName,
  generateConversationName,
  chatToUser,
  webSearch,
  exitTodolist,
  grepFile,
  linter,
  // 统一调用入口
  callFunction,
};
