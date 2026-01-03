const miniReadFile = require("./utils/miniReadFile");
const recordErrorLog = require("../../../../recordErrorLog");

/**
 * Level3: 将 demandAnalysisResults 中的 contextFilePaths 读取成实际代码内容
 *
 * @param {Object} demandAnalysisResults - 需求分析结果
 * @param {Object} infoObject - 上下文信息
 * @param {boolean} [isLevel5=false] - 是否来自 level5 调用
 * @returns {Object} contextHistory 对象
 */
const level3 = async (demandAnalysisResults, infoObject, isLevel5 = false) => {
  // 获取到 demandAnalysisResults 之后，将上下文信息读取成代码
  // demandAnalysisResults 已经是对象，无需再 parse

  const contextFilePaths = demandAnalysisResults?.contextFilePaths || [];
  const contextFileContents = [];

  // 统计信息
  let loadedCount = 0;
  let failedCount = 0;
  let totalChars = 0;

  // 遍历 contextFilePaths，逐个读取文件内容
  for (const filePath of contextFilePaths) {
    try {
      const fileContent = await miniReadFile(filePath, infoObject);
      contextFileContents.push({
        file_path: filePath,
        file_content: fileContent,
      });
      loadedCount++;
      totalChars += fileContent?.length || 0;
    } catch (error) {
      // 读取失败记录日志，继续处理下一个文件
      recordErrorLog(error, `level3-miniReadFile: ${filePath}`);
      contextFileContents.push({
        file_path: filePath,
        file_content: null, // 读取失败标记为 null
        error: error.message,
      });
      failedCount++;
    }
  }

  // 获取被跳过的文件信息（来自 level5 的去重处理）
  const skippedFiles = demandAnalysisResults?._skippedFiles || [];
  const skippedFilesNote = demandAnalysisResults?._skippedFilesNote || "";

  console.log(
    `[level3] 文件加载统计: 成功 ${loadedCount}, 失败 ${failedCount}, 跳过(去重) ${skippedFiles.length}, 总字符数 ${totalChars}`
  );

  // 构建新的 contextHistory 对象，包含 userPrompt
  let contextHistory = {};

  const baseContextHistory = {
    taskSummary: demandAnalysisResults?.taskSummary || "",
    contextFilePaths: contextFileContents,
    updatedRequirements: demandAnalysisResults?.updatedRequirements || "",
    // 添加统计信息，帮助 AI 了解上下文状态
    _contextStats: {
      loadedFiles: loadedCount,
      failedFiles: failedCount,
      skippedFiles: skippedFiles.length,
      totalChars: totalChars,
    },
  };

  // 如果有被跳过的文件，添加提示信息
  if (skippedFiles.length > 0) {
    baseContextHistory._skippedFilesInfo = {
      note: "以下文件在最近对话中已被你编辑/创建，内容未重新加载（你已知道最新内容）",
      files: skippedFiles,
    };
  }

  if (!isLevel5) {
    // 确保 userPrompt 有值，如果为空则使用 taskSummary 作为 fallback
    const userPrompt = demandAnalysisResults?.userPrompt || 
                       demandAnalysisResults?.taskSummary || 
                       "请完成任务";
    contextHistory = {
      ...baseContextHistory,
      userPrompt,
    };
    console.log("[level3] userPrompt:", userPrompt);
  } else {
    contextHistory = baseContextHistory;
  }

  // 将 contextHistory 传递到下一层中
  return contextHistory;
};

module.exports = level3;
