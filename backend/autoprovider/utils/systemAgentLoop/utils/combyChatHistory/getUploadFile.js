/**
 * 获取当前会话待发送的上传文件内容
 * 查询 source_list 中 dialogue_id 为 NULL 的记录（未绑定对话的附件）
 */

const pool = require("../../../../db");
const recordErrorLog = require("../../../recordErrorLog");

/**
 * 根据 session_id 或 user_id 获取待发送的上传文件
 * @param {Object} params
 * @param {Object} params.connection - 数据库连接
 * @param {string} params.sessionId - 会话ID（已有会话时使用）
 * @param {string} params.projectId - 项目ID（可选，用于过滤）
 * @param {string} params.userId - 用户ID（新建项目时使用，session 还没建好）
 * @returns {Promise<Array<{source_id: string, source_name: string, source_type: string, source_content: string, file_size: string}>>}
 */
const getUploadFile = async ({ connection, sessionId, projectId, userId }) => {
  let shouldReleaseConnection = false;
  try {
    if (!userId) {
      console.warn("[getUploadFile] 缺少必要参数: userId");
      return [];
    }

    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }

    await connection.query("use autoprovider_open");

    let query = "";
    let params = [];

    if (sessionId) {
      // 已有会话：查询已绑定该 session 的附件，或者用户未绑定的附件（兼容新建项目后首次发送）
      // 条件：dialogue_id IS NULL（未发送过）且 (session_id 匹配 OR 未绑定任何 session/project 但属于该用户)
      query = `
        SELECT 
          source_id,
          source_name,
          source_type,
          source_content,
          file_size,
          source_url
        FROM source_list
        WHERE own_user_id = ?
          AND dialogue_id IS NULL
          AND source_status = 0
          AND (
            session_id = ?
            OR (session_id IS NULL AND project_id IS NULL)
          )
        ORDER BY create_time ASC
      `;
      params = [userId, sessionId];
    } else if (projectId) {
      // 有项目但没有 session：查询绑定该项目的附件，或者用户未绑定的附件
      query = `
        SELECT 
          source_id,
          source_name,
          source_type,
          source_content,
          file_size,
          source_url
        FROM source_list
        WHERE own_user_id = ?
          AND dialogue_id IS NULL
          AND source_status = 0
          AND (
            project_id = ?
            OR (project_id IS NULL AND session_id IS NULL)
          )
        ORDER BY create_time ASC
      `;
      params = [userId, projectId];
    } else {
      // 新建项目场景：按 user_id 查询未绑定项目/会话的附件
      query = `
        SELECT 
          source_id,
          source_name,
          source_type,
          source_content,
          file_size,
          source_url
        FROM source_list
        WHERE own_user_id = ?
          AND project_id IS NULL
          AND session_id IS NULL
          AND dialogue_id IS NULL
          AND source_status = 0
        ORDER BY create_time ASC
      `;
      params = [userId];
    }

    console.log(
      `[getUploadFile] 查询参数: userId=${userId}, sessionId=${sessionId}, projectId=${projectId}`
    );
    console.log(
      `[getUploadFile] 执行查询: ${query.replace(/\s+/g, " ").trim()}`
    );
    console.log(`[getUploadFile] 参数值: ${JSON.stringify(params)}`);

    const [rows] = await connection.query(query, params);

    // 转换结果
    const files = rows.map((row) => ({
      source_id: row.source_id,
      source_name: row.source_name || "未命名文件",
      source_type: row.source_type,
      source_content: row.source_content || "",
      file_size: row.file_size,
      source_url: row.source_url || "",
    }));

    console.log(`[getUploadFile] 找到 ${files.length} 个待发送的附件`);
    if (files.length > 0) {
      console.log(
        `[getUploadFile] 附件列表: ${files
          .map((f) => f.source_name)
          .join(", ")}`
      );
    }

    return files;
  } catch (error) {
    recordErrorLog(error, "getUploadFile");
    return [];
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

/**
 * 将上传文件内容格式化为可拼接到用户消息的文本
 * @param {Array} files - getUploadFile 返回的文件数组
 * @returns {string} 格式化后的附件内容文本
 */
const formatUploadFilesContent = (files) => {
  if (!files || files.length === 0) return "";

  const blocks = [];
  for (const file of files) {
    if (file.source_content && file.source_content.trim()) {
      const fileName = file.source_name || "未命名文件";
      const safeName = fileName.replace(/\n+/g, " ").trim();
      const content = file.source_content;
      // 使用 Markdown 代码块标记，并注明文件名
      blocks.push(`\`\`\` ${safeName}\n${content}\n\`\`\``);
    }
  }

  if (blocks.length === 0) return "";

  return `下面是我上传的附件内容\n\n${blocks.join("\n\n")}`;
};

/**
 * 绑定附件到对话（发送成功后调用）
 * @param {Object} params
 * @param {Object} params.connection - 数据库连接
 * @param {Array<string>} params.sourceIds - 要绑定的 source_id 列表
 * @param {string} params.dialogueId - 对话ID
 * @param {string} params.sessionId - 会话ID（可选，补充绑定）
 * @param {string} params.projectId - 项目ID（可选，补充绑定）
 * @returns {Promise<boolean>} 是否成功
 */
const bindFilesToDialogue = async ({
  connection,
  sourceIds,
  dialogueId,
  sessionId,
  projectId,
}) => {
  let shouldReleaseConnection = false;
  try {
    if (!sourceIds || sourceIds.length === 0) {
      return true; // 没有需要绑定的
    }

    if (!dialogueId) {
      console.warn("[bindFilesToDialogue] 缺少 dialogueId");
      return false;
    }

    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }

    await connection.query("use autoprovider_open");

    // 构建 SET 子句
    const setClauses = ["dialogue_id = ?"];
    const updateParams = [dialogueId];

    if (sessionId) {
      setClauses.push("session_id = ?");
      updateParams.push(sessionId);
    }

    if (projectId) {
      setClauses.push("project_id = ?");
      updateParams.push(projectId);
    }

    // 构建 IN 子句的占位符
    const placeholders = sourceIds.map(() => "?").join(", ");
    updateParams.push(...sourceIds);

    const query = `
      UPDATE source_list
      SET ${setClauses.join(", ")}
      WHERE source_id IN (${placeholders})
    `;

    const [result] = await connection.query(query, updateParams);

    console.log(
      `[bindFilesToDialogue] 绑定 ${result.affectedRows} 个附件到对话 ${dialogueId}`
    );

    return true;
  } catch (error) {
    recordErrorLog(error, "bindFilesToDialogue");
    return false;
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

module.exports = {
  getUploadFile,
  formatUploadFilesContent,
  bindFilesToDialogue,
};
