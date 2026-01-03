const pool = require("../../../../../db");
const recordErrorLog = require("../../../../recordErrorLog");
const level3 = require("./level3");
const level4 = require("./level4");
const { assembleChatMessages } = require("../..//combyChatHistory");
const {
  getRecentlyEditedFiles,
  filterContextFilePaths,
} = require("./utils/getRecentlyEditedFiles");

// 获取最新的需求分析结果（requirement_result）
const fetchLatestDemandAnalysisResults = async (connection, workId) => {
  if (!workId) return null;
  const [rows] = await connection.query(
    `SELECT product_content 
     FROM requirement_result 
     WHERE work_id = ? AND product_status = 0 
     ORDER BY create_time DESC 
     LIMIT 1`,
    [workId]
  );
  const content = rows?.[0]?.product_content || null;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (e) {
    // 如果不是 JSON，直接返回原文
    return content;
  }
};

const level5 = async (promptContent, infoObject) => {
  //首先我们需要数据库中的demand analysis results
  let connection = infoObject.connection;
  let shouldRelease = false;
  try {
    if (!connection) {
      connection = await pool.getConnection();
      shouldRelease = true;
    }
    await connection.query("use autoprovider_open");
    const demandAnalysisResults = await fetchLatestDemandAnalysisResults(
      connection,
      infoObject.workId
    );

    // ====== 上下文去重优化 ======
    // 获取最近 3 轮对话中已处理的文件列表
    const recentlyEditedInfo = await getRecentlyEditedFiles({
      connection,
      workId: infoObject.workId,
      sessionId: infoObject.sessionId,
      turnsBack: 3,
    });

    // 从 contextFilePaths 中过滤掉已编辑/创建的文件
    // 这些文件的内容 AI 已经知道（通过 tool 返回或自己编写）
    const originalContextFilePaths =
      demandAnalysisResults?.contextFilePaths || [];
    const { filtered: filteredContextFilePaths, skipped: skippedFiles } =
      filterContextFilePaths(originalContextFilePaths, recentlyEditedInfo, {
        skipEdited: true, // 跳过已编辑的文件（AI 刚刚编辑过，知道内容）
        skipCreated: true, // 跳过已创建的文件（AI 刚刚创建的，知道内容）
        skipRead: false, // 不跳过已读取的文件（可能需要再次参考）
      });

    // 构建过滤后的 demandAnalysisResults
    const filteredDemandAnalysisResults = {
      ...demandAnalysisResults,
      contextFilePaths: filteredContextFilePaths,
      // 记录被跳过的文件（可用于调试或提示）
      _skippedFiles: skippedFiles,
      _recentlyEditedInfo: recentlyEditedInfo,
    };

    console.log(
      `[level5] 上下文去重: 原始 ${originalContextFilePaths.length} 个文件, 过滤后 ${filteredContextFilePaths.length} 个文件, 跳过 ${skippedFiles.length} 个文件`
    );

    //把demandAnalysisResults传递进入level3，获取contextHistory
    const contextHistory = await level3(
      filteredDemandAnalysisResults,
      infoObject,
      true // isLevel5 = true
    );

    // 在 contextHistory 中添加被跳过文件的摘要信息
    // 这样 AI 知道这些文件存在但内容未重新加载
    if (skippedFiles.length > 0) {
      contextHistory._skippedFilesNote = `以下 ${
        skippedFiles.length
      } 个文件在最近对话中已被编辑/创建，内容未重新加载（你已知道最新内容）: ${skippedFiles.join(
        ", "
      )}`;
    }

    //将contextHistory传递进入level4，获取presetMessages
    const presetMessages = await level4(contextHistory, infoObject, true);

    //获取当前work的dialogue历史上下文
    //这里我们需要复用以前的逻辑，传入 presetMessages 获取聊天消息
    const messages = await assembleChatMessages(presetMessages, infoObject);
    return messages;
  } catch (error) {
    recordErrorLog(error, "level5");
    return [];
  } finally {
    if (shouldRelease && connection) {
      connection.release();
    }
  }
};

module.exports = level5;
