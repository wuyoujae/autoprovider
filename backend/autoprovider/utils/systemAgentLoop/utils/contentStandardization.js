// 该方法用于处理system prompt
const fs = require("fs").promises;
const path = require("path");
const getFilesTree = require("../../AIfunction/getFilesTree");
const getTodolist = require("./getTodolist");
const { getProjectRules } = require("./rulesFunction/rulesOperation");
const os = require("os");
let SHADCNCOMPONENTS = null;

async function loadShadcn() {
  if (!SHADCNCOMPONENTS) {
    const raw = await fs.readFile(
      path.join("agent/components/shadcn.json"),
      "utf-8"
    );
    SHADCNCOMPONENTS = JSON.parse(raw);
  }
  return SHADCNCOMPONENTS;
}
// 替换常量
const contentStandardization = async (systemPrompt, infoObject = {}) => {
  //获取常量
  const currentTime = new Date().toISOString();
  const projectId = infoObject.projectId || 1234567890;
  const currentTimestamp = new Date().getTime();

  // Next.js 全栈项目：使用统一的项目文件树
  const filesTree = getFilesTree(infoObject.filePath.root);
  const sqlOperationedRecord = infoObject.filePath.sqlRecordList;
  const todoList = await getTodolist(infoObject.sessionId);
  const projectRules = await getProjectRules(projectId);
  const shadcn = await loadShadcn();
  const todoListString = Array.isArray(todoList)
    ? JSON.stringify(todoList)
    : JSON.stringify([]);

  //替换常量

  //获取当前服务器的系统版本，windows,linux,macos
  const systemVersion = os.platform();

  const standardizedSystemPrompt = systemPrompt
    .replace("${CURRENTTIME}", currentTime)
    .replace("${PROJECTID}", projectId)
    .replace("${CURRENTTIMESTAMP}", currentTimestamp)
    .replace("${FILESTREE}", filesTree)
    .replace("${SQLOPERATIONEDRECORD}", sqlOperationedRecord)
    .replace("${TODOLIST}", todoListString)
    .replace("${SHADCNCOMPONENTS}", shadcn)
    .replace("${PROJECTRULES}", projectRules)
    .replace("${OPERATINGSYSTEM}", systemVersion);
  return standardizedSystemPrompt;
};

module.exports = contentStandardization;
