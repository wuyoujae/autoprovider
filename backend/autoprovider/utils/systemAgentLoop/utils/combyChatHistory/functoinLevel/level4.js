const contentStandardization = require("../../contentStandardization");
const getTodolist = require("../../getTodolist");
const getFilesTree = require("../../../../AIfunction/getFilesTree");
const getProjectsBasePath = require("../../../../getProjectsBasePath");
const recordErrorLog = require("../../../../recordErrorLog");

const level4 = async (contextHistory, infoObject = {}, isLevel5 = false) => {
  try {
    // 1) 标准化 system prompt（与主流程一致）
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
      recordErrorLog(e, "level4-getFilesTree");
    }
    let presetMessages = [];

    // 3 )加载当前session未完成的最新一条todolist
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
      recordErrorLog(e, "level4-getTodolist");
    }

    if (!isLevel5) {
      // 3) 提取 userPrompt（小模型总结后的用户需求）
      const { userPrompt = "请完成任务!", ...contextHistoryRest } =
        contextHistory;

      // 4) 组装 presetMessages（contextHistory 转成 JSON 文本，避免 [object Object]）
      if (todoListMessage) {
        presetMessages = [
          {
            role: "system",
            content: standardizedSystemPrompt,
          },
          {
            role: "system",
            content: `这是当前项目的文件目录：\n${currentProjectFileDirectory}`,
          },
          {
            role: "system",
            content: `这是系统检测出对于你当前任务有用的上下文信息。这些信息都是实时获取的，保证是最新的，所以这些文件你不需要再调用read_file方法去阅读一遍：\n${JSON.stringify(
              contextHistoryRest
            )}`,
          },
          todoListMessage,
          {
            role: "user",
            content: userPrompt,
          },
        ];
      } else {
        presetMessages = [
          {
            role: "system",
            content: standardizedSystemPrompt,
          },
          {
            role: "system",
            content: `这是当前项目的文件目录：\n${currentProjectFileDirectory}`,
          },
          {
            role: "system",
            content: `这是系统检测出对于你当前任务有用的上下文信息。这些信息都是实时获取的，保证是最新的，所以这些文件你不需要再调用read_file方法去阅读一遍：\n${JSON.stringify(
              contextHistoryRest
            )}`,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ];
      }
    } else {
      if (todoListMessage) {
        presetMessages = [
          {
            role: "system",
            content: standardizedSystemPrompt,
          },
          {
            role: "system",
            content: `这是当前项目的文件目录：\n${currentProjectFileDirectory}`,
          },
          {
            role: "system",
            content: `这是系统检测出对于你当前任务有用的上下文信息。这些信息都是实时获取的，保证是最新的，所以这些文件你不需要再调用read_file方法去阅读一遍：\n${JSON.stringify(
              contextHistory
            )}`,
          },
          todoListMessage,
        ];
      } else {
        presetMessages = [
          {
            role: "system",
            content: standardizedSystemPrompt,
          },
          {
            role: "system",
            content: `这是当前项目的文件目录：\n${currentProjectFileDirectory}`,
          },
          {
            role: "system",
            content: `这是系统检测出对于你当前任务有用的上下文信息。这些信息都是实时获取的，保证是最新的，所以这些文件你不需要再调用read_file方法去阅读一遍：\n${JSON.stringify(
              contextHistory
            )}`,
          },
        ];
      }
    }
    return presetMessages;
  } catch (error) {
    recordErrorLog(error, "level4");
    return [];
  }
};

module.exports = level4;
