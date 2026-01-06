const { assembleChatMessages, message2token } = require("../../combyChatHistory");
const contentStandardization = require("../../contentStandardization");
const getTodolist = require("../../getTodolist");
const getFilesTree = require("../../../../AIfunction/getFilesTree");
const getProjectsBasePath = require("../../../../getProjectsBasePath");
const recordErrorLog = require("../../../../recordErrorLog");
const sendLoadingContent = require("./utils/sendLoadingContent");

/**
 * Level5: 简化版 - 系统驱动时直接组装 presetMessages + 从数据库加载对话历史
 * 不再读取额外的文件内容
 *
 * @param {string} promptContent - 系统驱动的 prompt 内容
 * @param {Object} infoObject - 上下文信息
 * @returns {Promise<Array>} messages 数组
 */
const level5 = async (promptContent, infoObject) => {
  try {
    // 1) 标准化 system prompt
    const standardizedSystemPrompt = await contentStandardization(
      infoObject.systemPrompt,
      infoObject
    );

    // 2) 当前项目文件目录（文件树）
    let currentProjectFileDirectory = "";
    try {
      const projectRoot =
        (infoObject.filePath && infoObject.filePath.root) ||
        `${getProjectsBasePath()}/${infoObject.projectId || ""}`;
      currentProjectFileDirectory = getFilesTree(projectRoot);
    } catch (e) {
      recordErrorLog(e, "level5-getFilesTree");
    }

    // 3) 加载当前 session 未完成的最新一条 todolist
    let todoListMessage = null;
    try {
      const todoList = await getTodolist(infoObject.sessionId);
      if (Array.isArray(todoList) && todoList.length > 0) {
        todoListMessage = {
          role: "system",
          content: `这是当前会话的todolist完成情况：\n${JSON.stringify(
            todoList
          )}`,
        };
      }
    } catch (e) {
      recordErrorLog(e, "level5-getTodolist");
    }

    // ====== Token 分项统计（system prompt / 文件树 / todolist）======
    try {
      const systemPromptTokens = message2token(standardizedSystemPrompt || "");
      const fileTreeTokens = message2token(currentProjectFileDirectory || "");
      const todolistTokens = message2token(todoListMessage?.content || "");
      const totalPresetPartsTokens =
        systemPromptTokens + fileTreeTokens + todolistTokens;

      const debugLine =
        `[TokenBreakdown] systemPrompt=${systemPromptTokens} ` +
        `fileTree=${fileTreeTokens} todolist=${todolistTokens} ` +
        `total=${totalPresetPartsTokens}`;

      console.log(debugLine);
      sendLoadingContent(debugLine, infoObject);
    } catch (e) {
      // ignore
    }

    // 4) 组装 presetMessages（简化版：只包含 system prompt、文件目录、todolist）
    const presetMessages = [
      {
        role: "system",
        content: standardizedSystemPrompt,
      },
      {
        role: "system",
        content: `这是当前项目的文件目录：\n${currentProjectFileDirectory}`,
      },
    ];

    if (todoListMessage) {
      presetMessages.push(todoListMessage);
    }

    // 5) 调用 assembleChatMessages 加载历史消息
    // assembleChatMessages 会从数据库读取对话历史，并在 token 超限时触发压缩
    const messages = await assembleChatMessages(presetMessages, infoObject);

    return messages;
  } catch (error) {
    recordErrorLog(error, "level5");
    return [];
  }
};

module.exports = level5;
