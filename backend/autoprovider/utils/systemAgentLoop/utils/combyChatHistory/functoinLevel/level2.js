const fs = require("fs").promises;
const path = require("path");
const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");
const pool = require("../../../../../db");
const recordErrorLog = require("../../../../recordErrorLog");
const getProjectsBasePath = require("../../../../getProjectsBasePath");
const getFilesTree = require("../../../../AIfunction/getFilesTree");
const sendWordsContent = require("../../../../AIfunction/sendWordsContent");
const updateDialogueRecord = require("../../updateDialogueRecord");
const updateOperationRecord = require("../../updateOperationRecord");
const {
  bindFilesToDialogue,
  formatUploadFilesContent,
  getUploadFile,
} = require("../getUploadFile");

const { getLLMConfigSync, getLLMConfig } = require("../../../../llmConfig");

// ============ Mini 模型配置（从数据库/缓存读取） ============
const str = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};

const buildMiniModelConfig = () => {
  try {
    const cfg = getLLMConfigSync();
    const list = Array.isArray(cfg?.miniModels) ? cfg.miniModels : [];
    const models = list
      .map((item, idx) => {
        const baseUrl = str(item?.baseUrl);
        const apiKey = str(item?.apiKey);
        const model = str(item?.model);
        if (!baseUrl || !apiKey || !model) return null;
        return { baseUrl, apiKey, model, tokenLimit: item?.tokenLimit };
      })
      .filter(Boolean);
    return models;
  } catch (error) {
    recordErrorLog(error, "level2-buildMiniModelConfig");
    return [];
  }
};

let MINI_MODELS = buildMiniModelConfig();

const refreshMiniModelsAsync = async () => {
  try {
    const cfg = await getLLMConfig();
    const list = Array.isArray(cfg?.miniModels) ? cfg.miniModels : [];
    MINI_MODELS = list
      .map((item) => {
        const baseUrl = str(item?.baseUrl);
        const apiKey = str(item?.apiKey);
        const model = str(item?.model);
        if (!baseUrl || !apiKey || !model) return null;
        return { baseUrl, apiKey, model, tokenLimit: item?.tokenLimit };
      })
      .filter(Boolean);
  } catch (error) {
    recordErrorLog(error, "level2-refreshMiniModelsAsync");
  }
};
// 根据 dialogue_id 列表批量获取绑定的附件
const fetchAttachmentsByDialogueIds = async (connection, dialogueIds) => {
  if (!dialogueIds || dialogueIds.length === 0) return {};
  const placeholders = dialogueIds.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT dialogue_id, source_name, source_content
     FROM source_list
     WHERE dialogue_id IN (${placeholders}) AND source_status = 0`,
    dialogueIds
  );
  // 按 dialogue_id 分组
  const attachmentMap = {};
  for (const row of rows || []) {
    if (!row.dialogue_id) continue;
    if (!attachmentMap[row.dialogue_id]) {
      attachmentMap[row.dialogue_id] = [];
    }
    attachmentMap[row.dialogue_id].push({
      source_name: row.source_name || "未命名文件",
      source_content: row.source_content || "",
    });
  }
  return attachmentMap;
};

// 加载当前 session 的小模型历史消息（仅最近20条，按时间正序返回，并附带绑定的附件内容）
const fetchMiniModelHistory = async (connection, sessionId) => {
  if (!sessionId) return [];
  const [rows] = await connection.query(
    `SELECT dialogue_id, role_type, message_content, create_time, message_index
     FROM mini_model_message
     WHERE session_id = ? AND status = 0
     ORDER BY create_time DESC, message_index DESC
     LIMIT 20`,
    [sessionId]
  );

  // 收集所有 dialogue_id，用于批量查询附件
  const dialogueIds = (rows || []).map((r) => r.dialogue_id).filter((id) => id);
  const attachmentMap = await fetchAttachmentsByDialogueIds(
    connection,
    dialogueIds
  );

  // 先按时间倒序取最新20条，再在内存中按时间升序 + index 升序稳定排序，保证 messages 末位是最新
  const history = (rows || [])
    .map((row) => ({
      dialogue_id: row.dialogue_id,
      role: row.role_type,
      content: row.message_content || "",
      create_time: row.create_time ? new Date(row.create_time) : null,
      message_index:
        row.message_index === null || row.message_index === undefined
          ? 0
          : row.message_index,
    }))
    .sort((a, b) => {
      const ta = a.create_time ? a.create_time.getTime() : 0;
      const tb = b.create_time ? b.create_time.getTime() : 0;
      if (ta !== tb) return ta - tb;
      return (a.message_index || 0) - (b.message_index || 0);
    });

  // 组装最终的 messages，将附件内容追加到对应消息中
  return history.map((row) => {
    let finalContent = row.content;
    // 只有 user 角色的消息才可能有附件
    if (row.role === "user" && row.dialogue_id) {
      const attachments = attachmentMap[row.dialogue_id];
      if (attachments && attachments.length > 0) {
        const attachmentBlocks = attachments
          .filter((a) => a.source_content && a.source_content.trim())
          .map((a) => {
            const safeName = (a.source_name || "未命名文件")
              .replace(/\n+/g, " ")
              .trim();
            return `\`\`\` ${safeName}\n${a.source_content}\n\`\`\``;
          });
        if (attachmentBlocks.length > 0) {
          finalContent = `${finalContent}\n\n下面是我上传的附件内容\n\n${attachmentBlocks.join(
            "\n\n"
          )}`;
        }
      }
    }
    return {
      role: row.role,
      content: finalContent,
    };
  });
};

// 获取最新的需求文档
const fetchLatestRequirementDoc = async (connection, projectId) => {
  const [rows] = await connection.query(
    `SELECT doc_content 
     FROM requirement_doc 
     WHERE project_id = ? AND status = 0 
     ORDER BY update_time DESC 
     LIMIT 1`,
    [projectId]
  );
  return rows?.[0]?.doc_content || "";
};

// 保存需求分析结果到 requirement_result
const saveRequirementResult = async (connection, workId, productContent) => {
  if (!workId) {
    recordErrorLog(
      "workId 不能为空，无法保存需求分析结果",
      "saveRequirementResult"
    );
    return false;
  }
  const resultId = uuidv4();
  const content =
    typeof productContent === "string"
      ? productContent
      : JSON.stringify(productContent || {});
  await connection.query(
    `INSERT INTO requirement_result (result_id, work_id, product_content, product_status)
     VALUES (?, ?, ?, 0)`,
    [resultId, workId, content]
  );
  return true;
};

// 记录小模型消息
const saveMiniModelMessage = async ({
  connection,
  sessionId,
  workId,
  dialogueId,
  projectId,
  role,
  content,
  messageIndex = null,
}) => {
  if (!sessionId || !role) return false;
  const miniMsgId = uuidv4();
  const safeContent =
    typeof content === "string" ? content : JSON.stringify(content || {});
  await connection.query(
    `INSERT INTO mini_model_message 
     (mini_msg_id, session_id, work_id, dialogue_id, project_id, role_type, message_content, status, message_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      miniMsgId,
      sessionId,
      workId || null,
      dialogueId || null,
      projectId || null,
      role,
      safeContent,
      messageIndex,
    ]
  );
  return true;
};

// 追加更新需求文档（在最新一条 status=0 的记录末尾追加内容）
const appendRequirementDoc = async (connection, projectId, appendContent) => {
  if (!projectId || !appendContent) return false;
  // 确保字符串
  const contentToAppend =
    typeof appendContent === "string"
      ? appendContent
      : JSON.stringify(appendContent);
  const [result] = await connection.query(
    `UPDATE requirement_doc
     SET doc_content = CONCAT(doc_content, '\n\n', ?)
     WHERE project_id = ? AND status = 0
     ORDER BY update_time DESC
     LIMIT 1`,
    [contentToAppend, projectId]
  );
  if (result?.affectedRows > 0) return true;

  // 若不存在可更新记录，则插入新记录
  const newDocId = uuidv4();
  const insertResult = await connection.query(
    `INSERT INTO requirement_doc (requirement_doc_id, project_id, doc_content, status)
     VALUES (?, ?, ?, 0)`,
    [newDocId, projectId, contentToAppend]
  );
  return insertResult?.[0]?.affectedRows > 0;
};

// 获取最新的操作手册
const fetchLatestOperationManual = async (connection, projectId) => {
  const [rows] = await connection.query(
    `SELECT manual_content 
     FROM operation_manual 
     WHERE project_id = ? AND status = 0 
     ORDER BY update_time DESC 
     LIMIT 1`,
    [projectId]
  );
  return rows?.[0]?.manual_content || "";
};

// 获取项目最新目录树（使用 .autoignore 规则）
const fetchLatestDirectoryTree = (projectId) => {
  try {
    const projectRoot = path.join(getProjectsBasePath(), projectId);
    return getFilesTree(projectRoot);
  } catch (error) {
    recordErrorLog(error, "level2-fetchLatestDirectoryTree");
    return "";
  }
};

// 读取小模型的 system prompt
const loadMiniModelPrompt = async () => {
  const promptPath = path.join("agent", "readfilePrompt.md");
  return fs.readFile(promptPath, "utf-8");
};

// 拼装给小模型的用户 prompt
const buildMiniModelUserPrompt = ({
  promptContent,
  requireDoc,
  operationManual,
  directoryTree,
}) => {
  const blocks = [
    `用户输入：\n${promptContent || ""}`,
    requireDoc ? `需求文档：\n${requireDoc}` : "",
    operationManual ? `操作手册：\n${operationManual}` : "",
    directoryTree ? `目录树：\n${directoryTree}` : "",
  ].filter(Boolean);
  return blocks.join("\n\n");
};

// 创建小模型客户端（按顺序尝试多个）
const createMiniModelClient = (index = 0) => {
  if (!MINI_MODELS || MINI_MODELS.length === 0) {
    return null;
  }
  if (index >= MINI_MODELS.length) return null;
  const cfg = MINI_MODELS[index];
  if (!cfg || !cfg.apiKey || !cfg.baseUrl || !cfg.model) return null;
  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
    timeout: 180000, // 3 分钟保护，防止阻塞
  });
};

const level2 = async (promptContent, infoObject = {}) => {
  const projectId = infoObject.projectId;
  if (!projectId) {
    recordErrorLog("缺少 projectId，无法读取需求/操作手册", "level2-params");
    return {
      status: 1,
      message: "projectId 不能为空",
      data: "fail",
    };
  }

  let connection = infoObject.connection;
  let shouldReleaseConnection = false;
  try {
    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }
    await connection.query("use autoprovider_open");

    // 复用 AgentWork 中已创建的 dialogueId
    const userDialogueId = infoObject.dialogueId;
    const userDialogueIndex = infoObject.nowDialogueIndex || 0;
    // 本轮小模型消息索引：user 固定 0，assistant 固定 1
    const miniUserIndex = 0;
    const miniAssistantIndex = 1;

    // ====== 先加载历史消息（在记录当前用户消息之前，避免重复加载）======
    const miniModelHistory = await fetchMiniModelHistory(
      connection,
      infoObject.sessionId
    );

    // 读取需求文档，操作手册和获取目录树
    const requireDoc = await fetchLatestRequirementDoc(connection, projectId);
    const operationManual = await fetchLatestOperationManual(
      connection,
      projectId
    );
    const directoryTree = fetchLatestDirectoryTree(projectId);

    // 读取小模型的 system prompt
    const systemPrompt = await loadMiniModelPrompt();

    // 获取待发送的附件（如果 pendingUploadFiles 还没设置，需要主动获取）
    let pendingUploadFiles = infoObject.pendingUploadFiles;
    if (!pendingUploadFiles || pendingUploadFiles.length === 0) {
      pendingUploadFiles = await getUploadFile({
        connection,
        sessionId: infoObject.sessionId,
        projectId: projectId,
        userId: infoObject.userId,
      });
      infoObject.pendingUploadFiles = pendingUploadFiles;
    }

    // 准备附件内容（格式化后追加到用户 prompt 中）
    let uploadFilesText = "";
    if (pendingUploadFiles && pendingUploadFiles.length > 0) {
      uploadFilesText = formatUploadFilesContent(pendingUploadFiles);
    }

    // ====== 【需求1】记录用户消息（在加载历史之后，避免重复）======
    // 记录用户消息到 dialogue_record（is_mini_model=1）
    await updateDialogueRecord({
      dialogueId: userDialogueId,
      role: "user",
      content: promptContent,
      dialogue_index: userDialogueIndex,
      dialogue_sender: infoObject.dialogueSender || "client",
      work_id: infoObject.workId,
      session_id: infoObject.sessionId,
      is_mini_model: 1,
    });
    // 记录用户消息到 mini_model_message
    await saveMiniModelMessage({
      connection,
      sessionId: infoObject.sessionId,
      workId: infoObject.workId,
      dialogueId: userDialogueId,
      projectId: projectId,
      role: "user",
      content: promptContent,
      messageIndex: miniUserIndex,
    });

    // 绑定待发送的附件到此对话
    if (pendingUploadFiles && pendingUploadFiles.length > 0) {
      const sourceIds = pendingUploadFiles.map((f) => f.source_id);
      await bindFilesToDialogue({
        connection,
        sourceIds,
        dialogueId: userDialogueId,
        sessionId: infoObject.sessionId,
        projectId: projectId,
      });
      // 清空待发送列表，避免重复绑定
      infoObject.pendingUploadFiles = [];
    }

    // 更新 infoObject 索引，为后续 AI 回复做准备
    infoObject.nowDialogueIndex = userDialogueIndex + 1;
    infoObject.dialogueId = uuidv4();

    //配置小模型 & 发送请求
    if (!MINI_MODELS || MINI_MODELS.length === 0) {
      console.log("[level2] ⚠️ 未配置 Mini 模型，使用原始用户输入直接继续");
      // 构造 fallback demandAnalysisResults，让大模型直接处理用户请求
      const fallbackDemandAnalysisResults = {
        taskSummary: promptContent || "",
        contextFilePaths: [],
        updatedRequirements: "",
        userPrompt: promptContent || "请完成任务",
      };
      infoObject.newPrompt = fallbackDemandAnalysisResults.userPrompt;
      return {
        isAnalysisDone: true,
        demandAnalysisResults: fallbackDemandAnalysisResults,
      };
    }

    const miniModelMessages = [
      { role: "system", content: systemPrompt },
      ...miniModelHistory,
      {
        role: "user",
        content: buildMiniModelUserPrompt({
          promptContent:
            uploadFilesText && uploadFilesText.trim().length > 0
              ? `${promptContent || ""}\n\n${uploadFilesText}`
              : promptContent,
          requireDoc,
          operationManual,
          directoryTree,
        }),
      },
    ];
    let miniModelClient = null;
    let miniModelUsed = null;
    let lastError = null;
    let results = {};

    for (let i = 0; i < MINI_MODELS.length; i++) {
      miniModelClient = createMiniModelClient(i);
      if (!miniModelClient) continue;
      miniModelUsed = MINI_MODELS[i];
      try {
        const completion = await miniModelClient.chat.completions.create({
          model: miniModelUsed.model,
          messages: miniModelMessages,
          response_format: { type: "json_object" },
        });
        const content =
          completion?.choices?.[0]?.message?.content?.trim() || "{}";
        results = JSON.parse(content);
        lastError = null;
        break;
      } catch (modelError) {
        lastError = modelError;
        recordErrorLog(modelError, "level2-miniModel");
        continue;
      }
    }

    if (lastError) {
      console.log("[level2] ⚠️ Mini 模型调用失败，使用原始用户输入直接继续");
      console.log("[level2] 错误信息:", lastError.message);
      // 构造 fallback demandAnalysisResults，让大模型直接处理用户请求
      const fallbackDemandAnalysisResults = {
        taskSummary: promptContent || "",
        contextFilePaths: [],
        updatedRequirements: "",
        userPrompt: promptContent || "请完成任务",
      };
      infoObject.newPrompt = fallbackDemandAnalysisResults.userPrompt;
      return {
        isAnalysisDone: true,
        demandAnalysisResults: fallbackDemandAnalysisResults,
      };
    }

    // 【调试】小模型返回的原始结果
    console.log("[level2] ======== 小模型返回结果 ========");
    console.log("[level2] results:", JSON.stringify(results, null, 2));
    console.log("[level2] isAnalysisDone 值:", results.isAnalysisDone);
    console.log("[level2] isAnalysisDone 类型:", typeof results.isAnalysisDone);
    console.log("[level2] analysisResult 存在:", !!results.analysisResult);
    console.log("[level2] ================================");

    //判断是否完成需求分析（兼容字符串 "true" 和布尔 true）
    const isAnalysisDone =
      results.isAnalysisDone === true || results.isAnalysisDone === "true";
    console.log("[level2] isAnalysisDone 最终判断:", isAnalysisDone);

    if (isAnalysisDone) {
      // 需求分析完成，提取 analysisResult 传递给 level3
      const demandAnalysisResults = results.analysisResult || results;

      // 【调试】输出小模型返回结果
      console.log(
        "[level2] 小模型返回结果 isAnalysisDone:",
        results.isAnalysisDone
      );
      console.log(
        "[level2] analysisResult:",
        JSON.stringify(demandAnalysisResults, null, 2)
      );
      console.log(
        "[level2] userPrompt 存在:",
        !!demandAnalysisResults?.userPrompt
      );
      console.log(
        "[level2] userPrompt 内容:",
        demandAnalysisResults?.userPrompt
      );

      // 保存需求分析产物到 requirement_result
      try {
        await saveRequirementResult(
          connection,
          infoObject.workId,
          demandAnalysisResults
        );
      } catch (saveErr) {
        recordErrorLog(saveErr, "level2-saveRequirementResult");
      }

      // 追加更新需求文档（把 updatedRequirements 追加到现有 doc_content 末尾）
      if (demandAnalysisResults && demandAnalysisResults.updatedRequirements) {
        try {
          await appendRequirementDoc(
            connection,
            projectId,
            demandAnalysisResults.updatedRequirements
          );
        } catch (appendErr) {
          recordErrorLog(appendErr, "level2-appendRequirementDoc");
        }
      }

      // ====== 【需求4】需求分析完成时，记录 AI 调研结果到 dialogue_record 和 mini_model_message ======
      const assistantDialogueId = infoObject.dialogueId;
      const assistantDialogueIndex = infoObject.nowDialogueIndex;
      const analysisResultContent =
        typeof demandAnalysisResults === "string"
          ? demandAnalysisResults
          : JSON.stringify(demandAnalysisResults);

      await updateDialogueRecord({
        dialogueId: assistantDialogueId,
        role: "assistant",
        content: analysisResultContent,
        dialogue_index: assistantDialogueIndex,
        dialogue_sender: "system",
        work_id: infoObject.workId,
        session_id: infoObject.sessionId,
        is_mini_model: 1,
      });
      await saveMiniModelMessage({
        connection,
        sessionId: infoObject.sessionId,
        workId: infoObject.workId,
        dialogueId: assistantDialogueId,
        projectId: projectId,
        role: "assistant",
        content: analysisResultContent,
        messageIndex: miniAssistantIndex,
      });

      // 更新 infoObject 索引
      infoObject.nowDialogueIndex = assistantDialogueIndex + 1;
      infoObject.dialogueId = uuidv4();

      // ====== 【需求5】记录 AI 生成的 userPrompt 到 dialogue_record（is_agent_generate=1）======
      if (demandAnalysisResults && demandAnalysisResults.userPrompt) {
        const agentUserPromptDialogueId = infoObject.dialogueId;
        const agentUserPromptDialogueIndex = infoObject.nowDialogueIndex;

        await updateDialogueRecord({
          dialogueId: agentUserPromptDialogueId,
          role: "user",
          content: demandAnalysisResults.userPrompt,
          dialogue_index: agentUserPromptDialogueIndex,
          dialogue_sender: "client",
          work_id: infoObject.workId,
          session_id: infoObject.sessionId,
          is_mini_model: 0, // 这条是给大模型用的，所以不标记为小模型消息
          is_agent_generate: 1, // 标记为 AI 生成的消息
        });

        // 更新 infoObject 索引，为后续大模型调用做准备
        infoObject.nowDialogueIndex = agentUserPromptDialogueIndex + 1;
        infoObject.dialogueId = uuidv4();

        // 【修复】更新 newPrompt 为 AI 生成的 userPrompt，避免 assembleChatMessages 重复追加空消息
        infoObject.newPrompt = demandAnalysisResults.userPrompt;
        console.log(
          "[level2] ✅ 已更新 infoObject.newPrompt 为 AI 生成的 userPrompt"
        );
      } else {
        console.log(
          "[level2] ⚠️ 警告：analysisResult 中没有 userPrompt 字段！"
        );
        console.log("[level2] 使用原始用户输入作为 fallback:", promptContent);
        // 如果小模型没有返回 userPrompt，使用原始用户输入作为 fallback
        const fallbackUserPrompt = promptContent || "请完成任务";

        // 【关键修复】将 fallback userPrompt 写入 demandAnalysisResults，否则 level3/level4 会拿到空值
        demandAnalysisResults.userPrompt = fallbackUserPrompt;

        // 记录 fallback userPrompt
        const agentUserPromptDialogueId = infoObject.dialogueId;
        const agentUserPromptDialogueIndex = infoObject.nowDialogueIndex;

        await updateDialogueRecord({
          dialogueId: agentUserPromptDialogueId,
          role: "user",
          content: fallbackUserPrompt,
          dialogue_index: agentUserPromptDialogueIndex,
          dialogue_sender: "client",
          work_id: infoObject.workId,
          session_id: infoObject.sessionId,
          is_mini_model: 0,
          is_agent_generate: 1,
        });

        infoObject.nowDialogueIndex = agentUserPromptDialogueIndex + 1;
        infoObject.dialogueId = uuidv4();
        infoObject.newPrompt = fallbackUserPrompt;
        console.log(
          "[level2] ✅ 已使用 fallback userPrompt:",
          fallbackUserPrompt
        );
      }

      return {
        isAnalysisDone: true,
        demandAnalysisResults,
      };
    } else {
      // ====== 【需求2 & 3】需求分析未完成，记录 AI 回复并发送 SSE ======
      const replyToUser =
        results.replyToUser || "请提供更多信息以便完成需求分析。";

      const assistantDialogueId = infoObject.dialogueId;
      const assistantDialogueIndex = infoObject.nowDialogueIndex;

      // 发送 SSE 消息给前端（与 Agent 一致使用 sendWordsContent）
      sendWordsContent(replyToUser, infoObject);

      // 记录小模型回复到 dialogue_record（is_mini_model = 1）
      await updateDialogueRecord({
        dialogueId: assistantDialogueId,
        role: "assistant",
        content: replyToUser,
        dialogue_index: assistantDialogueIndex,
        dialogue_sender: "system",
        work_id: infoObject.workId,
        session_id: infoObject.sessionId,
        is_mini_model: 1,
      });
      // 记录到 mini_model_message
      await saveMiniModelMessage({
        connection,
        sessionId: infoObject.sessionId,
        workId: infoObject.workId,
        dialogueId: assistantDialogueId,
        projectId: projectId,
        role: "assistant",
        content: replyToUser,
        messageIndex: miniAssistantIndex,
      });

      // 记录到 operation_record，类型为 words，dialogue_id 与上面一致
      const operationId = uuidv4();
      await updateOperationRecord({
        operationId,
        dialogueId: assistantDialogueId,
        operationCode: `<words>${replyToUser}</words>`,
        operationMethod: "words",
        operationIndex: 0,
      });

      // 更新 infoObject 为下一次对话做准备
      infoObject.nowDialogueIndex = assistantDialogueIndex + 1;
      infoObject.dialogueId = uuidv4();

      // 返回特殊标识，让 AgentWork 知道要结束循环，等待用户下一次对话
      return {
        isAnalysisDone: false,
        shouldStopAgentWork: true,
        replyToUser,
      };
    }
  } catch (error) {
    recordErrorLog(error, "level2");
    return {
      status: 1,
      message: "读取需求/手册/目录树失败",
      data: "fail",
    };
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

module.exports = level2;
