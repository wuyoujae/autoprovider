const pool = require("../../../../../../db");
const recordErrorLog = require("../../../../../recordErrorLog");

/**
 * 获取最近 N 轮对话中已编辑的文件列表
 * 通过解析 dialogue_record 中 tool 消息的 tool_call 字段来获取
 *
 * @param {Object} options
 * @param {Object} options.connection - 数据库连接
 * @param {string} options.workId - 当前工作 ID
 * @param {string} options.sessionId - 会话 ID
 * @param {number} [options.turnsBack=3] - 往前追溯几轮对话
 * @returns {Promise<{editedFiles: string[], createdFiles: string[], allModifiedFiles: string[]}>}
 */
const getRecentlyEditedFiles = async ({
  connection,
  workId,
  sessionId,
  turnsBack = 3,
}) => {
  let shouldReleaseConnection = false;
  const result = {
    editedFiles: [], // edit_file 操作的文件
    createdFiles: [], // create_file 操作的文件
    readFiles: [], // read_file 操作的文件（这些内容已在上下文中）
    allModifiedFiles: [], // 所有被修改的文件（editedFiles + createdFiles 去重）
    allKnownFiles: [], // 所有已知文件（包括 read）
  };

  try {
    if (!connection) {
      connection = await pool.getConnection();
      shouldReleaseConnection = true;
    }

    await connection.query("use autoprovider_open");

    // 获取当前 session 下所有 work 的 ID（按 work_index 倒序，取最近的）
    const [works] = await connection.query(
      `SELECT work_id FROM work_record 
       WHERE session_id = ? 
       ORDER BY work_index DESC 
       LIMIT ?`,
      [sessionId, turnsBack]
    );

    if (!works || works.length === 0) {
      return result;
    }

    const workIds = works.map((w) => w.work_id);
    const placeholders = workIds.map(() => "?").join(", ");

    // 查询这些 work 下的 assistant 消息（包含 tool_call）
    const [dialogues] = await connection.query(
      `SELECT dialogue_id, role_type, tool_call, content
       FROM dialogue_record
       WHERE work_id IN (${placeholders})
         AND dialogue_status = 0
         AND (
           (role_type = 'assistant' AND tool_call IS NOT NULL AND tool_call != '')
           OR role_type = 'tool'
         )
       ORDER BY create_time DESC`,
      workIds
    );

    // 解析每条 assistant 消息的 tool_call
    const editedFilesSet = new Set();
    const createdFilesSet = new Set();
    const readFilesSet = new Set();

    for (const row of dialogues) {
      if (row.role_type === "assistant" && row.tool_call) {
        try {
          let toolCalls =
            typeof row.tool_call === "string"
              ? JSON.parse(row.tool_call)
              : row.tool_call;

          if (!Array.isArray(toolCalls)) {
            toolCalls = [toolCalls];
          }

          for (const tc of toolCalls) {
            const funcName = tc?.function?.name;
            let args = tc?.function?.arguments;

            // 解析 arguments（可能是字符串或对象）
            if (typeof args === "string") {
              try {
                args = JSON.parse(args);
              } catch (e) {
                continue;
              }
            }

            if (!args) continue;

            // 根据函数名提取文件路径
            if (funcName === "edit_file") {
              const filePath = args.target_file || args.file_path;
              if (filePath && typeof filePath === "string") {
                editedFilesSet.add(filePath.trim());
              }
            } else if (funcName === "create_file") {
              // create_file 可能有 files 数组或 file_names 数组
              if (Array.isArray(args.files)) {
                for (const f of args.files) {
                  const fp = f?.file_path;
                  if (fp && typeof fp === "string") {
                    createdFilesSet.add(fp.trim());
                  }
                }
              }
              if (Array.isArray(args.file_names)) {
                for (const fn of args.file_names) {
                  if (fn && typeof fn === "string" && !fn.endsWith(".floder")) {
                    createdFilesSet.add(fn.trim());
                  }
                }
              }
            } else if (funcName === "read_file") {
              const filePath = args.target_file || args.file_path;
              if (filePath && typeof filePath === "string") {
                readFilesSet.add(filePath.trim());
              }
            }
          }
        } catch (parseErr) {
          recordErrorLog(parseErr, "getRecentlyEditedFiles-parseToolCall");
        }
      }
    }

    result.editedFiles = Array.from(editedFilesSet);
    result.createdFiles = Array.from(createdFilesSet);
    result.readFiles = Array.from(readFilesSet);

    // 合并所有被修改的文件（去重）
    const allModifiedSet = new Set([...editedFilesSet, ...createdFilesSet]);
    result.allModifiedFiles = Array.from(allModifiedSet);

    // 合并所有已知文件（包括 read）
    const allKnownSet = new Set([
      ...editedFilesSet,
      ...createdFilesSet,
      ...readFilesSet,
    ]);
    result.allKnownFiles = Array.from(allKnownSet);

    console.log(
      `[getRecentlyEditedFiles] 最近 ${turnsBack} 轮已编辑: ${result.editedFiles.length}, 已创建: ${result.createdFiles.length}, 已读取: ${result.readFiles.length}`
    );

    return result;
  } catch (error) {
    recordErrorLog(error, "getRecentlyEditedFiles");
    return result;
  } finally {
    if (shouldReleaseConnection && connection) {
      connection.release();
    }
  }
};

/**
 * 从 contextFilePaths 中过滤掉最近已处理的文件
 *
 * @param {string[]} contextFilePaths - 原始的上下文文件路径列表
 * @param {Object} recentlyEditedInfo - getRecentlyEditedFiles 返回的结果
 * @param {Object} options - 配置选项
 * @param {boolean} [options.skipEdited=true] - 是否跳过已编辑的文件
 * @param {boolean} [options.skipCreated=true] - 是否跳过已创建的文件
 * @param {boolean} [options.skipRead=false] - 是否跳过已读取的文件（默认不跳过，因为 read 不修改内容）
 * @returns {{filtered: string[], skipped: string[], reason: Record<string, string>}}
 */
const filterContextFilePaths = (
  contextFilePaths,
  recentlyEditedInfo,
  options = {}
) => {
  const { skipEdited = true, skipCreated = true, skipRead = false } = options;

  const filtered = [];
  const skipped = [];
  const reason = {};

  // 构建需要跳过的文件集合
  const skipSet = new Set();
  const reasonMap = {};

  if (skipEdited) {
    for (const f of recentlyEditedInfo.editedFiles || []) {
      skipSet.add(f);
      reasonMap[f] = "recently_edited";
    }
  }

  if (skipCreated) {
    for (const f of recentlyEditedInfo.createdFiles || []) {
      skipSet.add(f);
      reasonMap[f] = "recently_created";
    }
  }

  if (skipRead) {
    for (const f of recentlyEditedInfo.readFiles || []) {
      if (!skipSet.has(f)) {
        // 只有当不是因为 edit/create 被跳过时才标记为 read
        skipSet.add(f);
        reasonMap[f] = "recently_read";
      }
    }
  }

  // 过滤
  for (const filePath of contextFilePaths || []) {
    const normalized = filePath.trim();
    if (skipSet.has(normalized)) {
      skipped.push(normalized);
      reason[normalized] = reasonMap[normalized] || "unknown";
    } else {
      filtered.push(normalized);
    }
  }

  console.log(
    `[filterContextFilePaths] 原始: ${contextFilePaths?.length || 0}, 过滤后: ${
      filtered.length
    }, 跳过: ${skipped.length}`
  );
  if (skipped.length > 0) {
    console.log(`[filterContextFilePaths] 跳过的文件: ${skipped.join(", ")}`);
  }

  return { filtered, skipped, reason };
};

module.exports = {
  getRecentlyEditedFiles,
  filterContextFilePaths,
};
