const fs = require("fs");
const path = require("path");
const getFilesTree = require("../utils/AIfunction/getFilesTree");
const combyFilePath = require("../utils/systemAgentLoop/utils/combyFilePath");
const recordErrorLog = require("../utils/recordErrorLog");
const {
  loadChatHistory,
  message2token,
} = require("../utils/systemAgentLoop/utils/combyChatHistory");
const {
  calcPreToken,
} = require("../utils/systemAgentLoop/utils/combyChatHistory/getPreToken");
const AgentWork = require("../utils/systemAgentLoop/Agent");
const db = require("../db/index");
const { redis } = require("../db/redis");

// SSH 远程数据库操作（用于 Dokploy 环境）
const {
  getDbContainerId: getRemoteDbContainerId,
} = require("../utils/systemWorkLoop/ssh2/getDbContainerId");
const {
  executeDbCommand: executeRemoteDbCommand,
} = require("../utils/systemWorkLoop/ssh2/executeDbCommand");

// 本地 Docker 数据库操作
const {
  executeLocalDbCommand,
  findLocalDbContainer,
  isDockerAvailable,
} = require("../utils/systemWorkLoop/database/localDbCommand");

// 判断是否使用远程 Dokploy 模式
const isRemoteMode = () => {
  return !!(process.env.DOKPLOY_BASE_URL && process.env.DOKPLOY_API_KEY);
};

/**
 * 获取项目根目录树（Next.js 模板为单体项目）
 * @param {string} projectId
 * @returns {string}
 */
const resolveProjectTree = (projectId) => {
  const absolutePath = combyFilePath(projectId, "/");

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`项目目录不存在: ${absolutePath}`);
  }

  return getFilesTree(absolutePath);
};

// 根据 project_id 解析 db 名称
const resolveDbName = (projectId) =>
  `myapp_${String(projectId || "").replace(/-/g, "_")}`;

// 解析 docker exec 输出的表格（-B -N 制表符分隔）
const parseTableOutput = (text) =>
  text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("\t"));

// 简单日志包装
const logInfo = (scope, ...args) => console.log(`[workinfo:${scope}]`, ...args);

// 简单重试封装，针对 MySQL 未就绪的错误进行有限重试
const retryExecute = async (fn, retries = 3, delayMs = 1500) => {
  let lastError;
  let lastResult;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fn();
      lastResult = res;
      const output = res?.data?.output || "";
      const isConnErr = /Can't connect to local MySQL server/i.test(output);
      if (res?.status === 0 || !isConnErr) {
        return res;
      }
      lastError = new Error(output || "MySQL 未就绪");
    } catch (err) {
      lastError = err;
    }
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  if (lastResult) {
    const output = lastResult?.data?.output || "";
    throw new Error(
      `${lastError?.message || "执行失败"} | output: ${output}`.trim()
    );
  }
  throw lastError || new Error("执行失败");
};

// 获取容器 ID：优先从 project_info.db_id 读取缓存；否则动态查找并更新缓存
// 支持本地 Docker 和远程 Dokploy 两种模式
const resolveContainerId = async (projectId, dbName) => {
  const useRemote = isRemoteMode();
  logInfo(
    "resolveContainerId",
    `模式: ${useRemote ? "远程 Dokploy" : "本地 Docker"}`
  );

  // 1. 先从 project_info 表读取已缓存的 db_id
  let cachedDbId = null;
  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.query("use autoprovider_open");
    const [rows] = await connection.query(
      "SELECT db_id FROM project_info WHERE project_id = ?",
      [projectId]
    );
    if (rows.length > 0 && rows[0].db_id) {
      cachedDbId = rows[0].db_id;
      logInfo("resolveContainerId", "使用缓存的 db_id", {
        cachedDbId: cachedDbId.substring(0, 12),
      });
    }
  } catch (dbErr) {
    logInfo("resolveContainerId", "读取 db_id 缓存失败", {
      error: dbErr.message,
    });
  }

  // 如果有缓存且看起来是有效的容器 ID（非空字符串），直接返回
  if (cachedDbId && typeof cachedDbId === "string" && cachedDbId.length >= 8) {
    if (connection) connection.release();
    return cachedDbId;
  }

  // 2. 没有缓存，动态查找容器 ID
  logInfo("resolveContainerId", "缓存不存在，开始动态查找容器");

  let res;
  if (useRemote) {
    // 远程 Dokploy 模式：通过 SSH 查找容器
    res = await getRemoteDbContainerId({
      projectId,
      dbName,
      serviceName: `${projectId}-db`,
    });
  } else {
    // 本地 Docker 模式：使用 Dockerode 查找容器
    res = await findLocalDbContainer({
      projectId,
    });
  }

  if (res.status === 0 && res.data?.containerId) {
    const newContainerId = res.data.containerId;
    logInfo("resolveContainerId", "动态查找成功", {
      newContainerId: newContainerId.substring(0, 12),
    });

    // 3. 将新获取的容器 ID 更新到数据库缓存
    try {
      if (!connection) {
        connection = await db.getConnection();
        await connection.query("use autoprovider_open");
      }
      await connection.query(
        "UPDATE project_info SET db_id = ? WHERE project_id = ?",
        [newContainerId, projectId]
      );
      logInfo("resolveContainerId", "已更新 db_id 缓存");
    } catch (updateErr) {
      logInfo("resolveContainerId", "更新 db_id 缓存失败", {
        error: updateErr.message,
      });
    } finally {
      if (connection) connection.release();
    }

    return newContainerId;
  }

  // 清理连接
  if (connection) connection.release();
  throw new Error(res.message || "未找到数据库容器");
};

// 执行数据库命令：根据模式选择本地或远程执行
const executeDbCommand = async ({ containerId, dbName, sql }) => {
  if (isRemoteMode()) {
    // 远程 Dokploy 模式：通过 SSH 执行
    return executeRemoteDbCommand({ containerId, dbName, sql });
  } else {
    // 本地 Docker 模式：使用 Dockerode 执行
    return executeLocalDbCommand({ containerId, dbName, sql });
  }
};

const getprojectfiletree = async (req, res) => {
  try {
    const { project_id } = req.body || {};

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();

    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    try {
      const projectTree = resolveProjectTree(normalizedProjectId);

      return res.send({
        status: 0,
        message: "获取项目目录树成功",
        data: {
          project_tree: projectTree,
        },
      });
    } catch (error) {
      return res.send({
        status: 1,
        message: error.message || "获取项目目录树失败",
        data: "fail",
      });
    }
  } catch (error) {
    recordErrorLog(error, "getprojectfiletree");
    return res.send({
      status: 1,
      message: "获取项目目录树失败，服务器内部错误",
      data: "fail",
    });
  }
};

const getfilecontent = async (req, res) => {
  try {
    const { project_id, file_path } = req.body || {};

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    if (!file_path || typeof file_path !== "string") {
      return res.send({
        status: 1,
        message: "文件路径不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    const normalizedFilePath = file_path.trim();

    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    if (!normalizedFilePath) {
      return res.send({
        status: 1,
        message: "文件路径不能为空",
        data: "fail",
      });
    }

    let fullPath;
    try {
      fullPath = combyFilePath(normalizedProjectId, normalizedFilePath);
    } catch (error) {
      return res.send({
        status: 1,
        message: error.message || "文件路径解析失败",
        data: "fail",
      });
    }

    if (!fs.existsSync(fullPath)) {
      return res.send({
        status: 1,
        message: "文件不存在",
        data: "fail",
      });
    }

    // 检查是否是文件
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return res.send({
        status: 1,
        message: "路径指向的不是一个文件",
        data: "fail",
      });
    }

    try {
      const content = await fs.promises.readFile(fullPath, "utf8");
      return res.send({
        status: 0,
        message: "获取文件内容成功",
        data: {
          content,
        },
      });
    } catch (error) {
      return res.send({
        status: 1,
        message: "读取文件失败",
        data: "fail",
      });
    }
  } catch (error) {
    recordErrorLog(error, "getfilecontent");
    return res.send({
      status: 1,
      message: "获取文件内容失败，服务器内部错误",
      data: "fail",
    });
  }
};

const getprojectdbstructure = async (req, res) => {
  try {
    const { project_id } = req.body || {};

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const dbName = resolveDbName(normalizedProjectId);
    logInfo("getprojectdbstructure", "start", { project_id, dbName });
    const containerId = await resolveContainerId(normalizedProjectId, dbName);
    logInfo("getprojectdbstructure", "container resolved", { containerId });

    // 获取所有表名
    const showTables = await retryExecute(
      () =>
        executeDbCommand({
          containerId,
          dbName,
          sql: "SHOW TABLES;",
        }),
      3,
      1500
    );
    if (showTables.status !== 0) {
      throw new Error(
        `SHOW TABLES 失败 | output: ${showTables.data?.output || ""}`
      );
    }
    logInfo("getprojectdbstructure", "showTables output", {
      output: showTables.data?.output?.slice(0, 500),
    });
    const tableRows = parseTableOutput(showTables.data?.output || "");
    const tableNames = tableRows.map((r) => r[0]).filter(Boolean);
    logInfo("getprojectdbstructure", "tables parsed", tableNames);

    const structure = {};
    // 逐表获取字段
    for (const tableName of tableNames) {
      const showCols = await retryExecute(
        () =>
          executeDbCommand({
            containerId,
            dbName,
            sql: `SHOW FULL COLUMNS FROM \`${tableName}\`;`,
          }),
        2,
        1000
      );
      if (showCols.status !== 0) {
        throw new Error(
          `读取表 ${tableName} 结构失败 | output: ${
            showCols.data?.output || ""
          }`
        );
      }
      logInfo("getprojectdbstructure", `columns ${tableName}`, {
        output: showCols.data?.output?.slice(0, 500),
      });
      const colRows = parseTableOutput(showCols.data?.output || "");
      // SHOW FULL COLUMNS 默认列顺序：
      // Field Type Collation Null Key Default Extra Privileges Comment
      structure[tableName] = colRows.map((cols) => ({
        名字: cols[0] || "",
        类型: cols[1] || "",
        排序规则: cols[2] || "",
        属性: null,
        可为空: cols[3] || "",
        默认值: cols[5] || "",
        注释: cols[8] || "",
        额外: cols[6] || "",
        键: cols[4] || "",
      }));
    }

    return res.send({
      status: 0,
      message: "获取数据库结构成功",
      data: {
        [dbName]: structure,
      },
    });
  } catch (error) {
    logInfo("getprojectdbstructure", "error", {
      error: error?.message,
      stack: error?.stack,
    });
    recordErrorLog(error, "getprojectdbstructure");
    return res.send({
      status: 1,
      message: error.message || "获取数据库结构失败",
      data: "fail",
    });
  }
};

const gettabledata = async (req, res) => {
  try {
    const { project_id, table_name, page = 1, page_size = 15 } = req.body || {};

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    if (!table_name || typeof table_name !== "string") {
      return res.send({
        status: 1,
        message: "表名不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    const normalizedTableName = table_name.trim();
    const currentPage = Math.max(1, parseInt(page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(page_size) || 15)); // Limit max page size to 100 for safety
    const offset = (currentPage - 1) * limit;

    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const dbName = resolveDbName(normalizedProjectId);
    logInfo("gettabledata", "start", {
      project_id,
      table_name,
      dbName,
      page: currentPage,
      page_size: limit,
    });
    const containerId = await resolveContainerId(normalizedProjectId, dbName);
    logInfo("gettabledata", "container resolved", { containerId });

    // 获取列定义（保持顺序）
    const showCols = await retryExecute(
      () =>
        executeDbCommand({
          containerId,
          dbName,
          sql: `SHOW COLUMNS FROM \`${normalizedTableName}\`;`,
        }),
      2,
      1000
    );
    if (showCols.status !== 0) {
      throw new Error(
        `SHOW COLUMNS 失败 | output: ${showCols.data?.output || ""}`
      );
    }
    logInfo("gettabledata", "showCols output", {
      output: showCols.data?.output?.slice(0, 500),
    });
    const colRows = parseTableOutput(showCols.data?.output || "");
    const columnNames = colRows.map((r) => r[0]).filter(Boolean);

    // 获取数据
    const selectRes = await retryExecute(
      () =>
        executeDbCommand({
          containerId,
          dbName,
          sql: `SELECT * FROM \`${normalizedTableName}\` LIMIT ${limit} OFFSET ${offset};`,
        }),
      2,
      1000
    );
    if (selectRes.status !== 0) {
      throw new Error(
        `查询表数据失败 | output: ${selectRes.data?.output || ""}`
      );
    }
    logInfo("gettabledata", "select output", {
      output: selectRes.data?.output?.slice(0, 500),
    });
    const dataRows = parseTableOutput(selectRes.data?.output || "");

    // 获取总数
    const countRes = await retryExecute(
      () =>
        executeDbCommand({
          containerId,
          dbName,
          sql: `SELECT COUNT(*) as total FROM \`${normalizedTableName}\`;`,
        }),
      2,
      1000
    );
    if (countRes.status !== 0) {
      throw new Error(`查询总数失败 | output: ${countRes.data?.output || ""}`);
    }
    logInfo("gettabledata", "count output", {
      output: countRes.data?.output?.slice(0, 500),
    });
    const countRows = parseTableOutput(countRes.data?.output || "");
    const total = Number(countRows?.[0]?.[0] || 0);

    // 格式化数据为数组数组，按 columnNames 顺序
    const formattedData = dataRows.map((row) =>
      columnNames.map((col, idx) => row[idx] ?? null)
    );

    return res.send({
      status: 0,
      message: "获取表数据成功",
      data: {
        [normalizedTableName]: formattedData,
        pagination: {
          page: currentPage,
          page_size: limit,
          total,
        },
      },
    });
  } catch (error) {
    logInfo("gettabledata", "error", {
      error: error?.message,
      stack: error?.stack,
    });
    recordErrorLog(error, "gettabledata");
    return res.send({
      status: 1,
      message: error.message || "获取表数据失败",
      data: "fail",
    });
  }
};

/**
 * 获取会话的 token 使用情况
 * 通过加载历史对话记录来计算已使用的 token 数量
 */
const gettokenusage = async (req, res) => {
  let connection;
  try {
    const { session_id } = req.body || {};

    if (!session_id || typeof session_id !== "string") {
      return res.send({
        status: 1,
        message: "会话ID不能为空",
        data: "fail",
      });
    }

    const normalizedSessionId = session_id.trim();
    if (!normalizedSessionId) {
      return res.send({
        status: 1,
        message: "会话ID不能为空",
        data: "fail",
      });
    }

    // 当前模型的 token 限制（与 Agent.js 中的 model.tokenLimit 保持一致）
    const MODEL_TOKEN_LIMIT = (AgentWork && AgentWork.tokenLimit) || 262144;

    connection = await db.getConnection();
    await connection.query("use autoprovider_open");

    // 1. 获取该 session 下最新的 work_id
    const [workRows] = await connection.query(
      `SELECT work_id FROM work_record 
       WHERE session_id = ? AND work_status = 0 
       ORDER BY work_index DESC LIMIT 1`,
      [normalizedSessionId]
    );

    if (workRows.length === 0) {
      // 没有工作记录，返回初始状态
      return res.send({
        status: 0,
        message: "获取 token 使用情况成功",
        data: {
          model_token_limit: MODEL_TOKEN_LIMIT,
          total_used_tokens: 0,
        },
      });
    }

    const workId = workRows[0].work_id;

    // 2. 从 Redis 获取真实的 presetMessages token 消耗
    let presetTokens = 0;
    try {
      const redisKey = `preset_token:${normalizedSessionId}`;
      const cachedPresetToken = await redis.get(redisKey);
      if (cachedPresetToken) {
        presetTokens = parseInt(cachedPresetToken, 10) || 0;
      } else {
        // 如果 Redis 中没有缓存，使用静态估算值作为 fallback
        presetTokens = await calcPreToken();
      }
    } catch (redisErr) {
      logInfo("gettokenusage", "读取 Redis preset token 失败", {
        error: redisErr.message,
      });
      // fallback 到静态估算
      presetTokens = await calcPreToken();
    }

    // 3. 加载历史对话记录
    const chatHistory = await loadChatHistory({
      connection,
      workId,
      historyLimit: 100,
      tokenLimit: MODEL_TOKEN_LIMIT,
    });

    // 4. 计算对话记录的 token 数量
    let contextTokens = 0;
    for (const message of chatHistory) {
      contextTokens += message2token(JSON.stringify(message));
    }

    // 5. 计算总使用量（preset + 历史对话）
    const totalUsedTokens = Math.min(
      MODEL_TOKEN_LIMIT,
      contextTokens + presetTokens
    );

    return res.send({
      status: 0,
      message: "获取 token 使用情况成功",
      data: {
        model_token_limit: MODEL_TOKEN_LIMIT,
        total_used_tokens: Math.round(totalUsedTokens),
      },
    });
  } catch (error) {
    recordErrorLog(error, "gettokenusage");
    return res.send({
      status: 1,
      message: "获取 token 使用情况失败，服务器内部错误",
      data: "fail",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// 读取 .envignore，返回要忽略的键集合（大写比较）
// 优先加载项目下的 .envignore，再加载全局 backend/autoprovider/.envignore
const loadEnvIgnoreSet = async (projectId) => {
  const ignoreSet = new Set();

  const readIgnoreFile = async (ignorePath) => {
    try {
      await fs.promises.access(ignorePath, fs.constants.F_OK);
      const raw = await fs.promises.readFile(ignorePath, "utf8");
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .forEach((line) => {
          // 允许写成 KEY 或 KEY=...，仅取等号左侧
          const eq = line.indexOf("=");
          const key = eq === -1 ? line : line.slice(0, eq);
          if (key) {
            ignoreSet.add(key.trim().toUpperCase());
          }
        });
    } catch (e) {
      // 文件不存在或读取失败时忽略
    }
  };

  // 项目级 .envignore
  if (projectId) {
    try {
      const projectIgnorePath = combyFilePath(projectId, "/.envignore");
      await readIgnoreFile(projectIgnorePath);
    } catch (e) {
      // 路径解析失败忽略
    }
  }

  // 全局 .envignore（位于 backend/autoprovider/.envignore）
  const globalIgnorePath = path.resolve(__dirname, "../.envignore");
  await readIgnoreFile(globalIgnorePath);

  return ignoreSet;
};

// 读取项目根目录下的 .env 文件并解析为键值对
const getenv = async (req, res) => {
  try {
    const project_id =
      (req.query && req.query.project_id) ||
      (req.body && req.body.project_id) ||
      (req.params && req.params.project_id);

    if (!project_id || typeof project_id !== "string" || !project_id.trim()) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();

    // 解析 .env 路径
    let envPath;
    try {
      envPath = combyFilePath(normalizedProjectId, "/.env");
    } catch (error) {
      return res.send({
        status: 1,
        message: error.message || "文件路径解析失败",
        data: "fail",
      });
    }

    // 检查文件是否存在
    try {
      await fs.promises.access(envPath, fs.constants.F_OK);
    } catch {
      return res.send({
        status: 0,
        message: "未找到 .env 文件，返回空列表",
        data: { env_items: [] },
      });
    }

    // 异步读取并解析
    const rawContent = await fs.promises.readFile(envPath, "utf8");
    const env_items = rawContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line) // 保留注释行用于解析是否注释
      .map((line) => {
        const isCommented = line.startsWith("#");
        const withoutComment = isCommented ? line.replace(/^#\s*/, "") : line;
        if (!withoutComment) return null;
        const cleaned = withoutComment.replace(/^export\s+/, "");
        const eqIndex = cleaned.indexOf("=");
        if (eqIndex === -1) return null;
        const key = cleaned.slice(0, eqIndex).trim();
        let value = cleaned.slice(eqIndex + 1).trim();
        // 去除包裹引号
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return key ? { key, value, commented: isCommented } : null;
      })
      .filter(Boolean);

    // 过滤 .envignore 中定义的键
    const ignoreSet = await loadEnvIgnoreSet(normalizedProjectId);
    const filtered_items = env_items.filter(
      (item) => !ignoreSet.has(item.key.toUpperCase())
    );

    return res.send({
      status: 0,
      message: "获取环境配置成功",
      data: { env_items: filtered_items },
    });
  } catch (error) {
    recordErrorLog(error, "getenv");
    return res.send({
      status: 1,
      message: error.message || "获取环境配置失败",
      data: "fail",
    });
  }
};

// 保存 .env 配置
const saveenv = async (req, res) => {
  try {
    const project_id =
      (req.body && req.body.project_id) ||
      (req.query && req.query.project_id) ||
      (req.params && req.params.project_id);
    const { env_items } = req.body || {};

    if (!project_id || typeof project_id !== "string" || !project_id.trim()) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    if (!Array.isArray(env_items)) {
      return res.send({
        status: 1,
        message: "env_items 必须是数组",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();

    // 解析 .env 路径
    let envPath;
    try {
      envPath = combyFilePath(normalizedProjectId, "/.env");
    } catch (error) {
      return res.send({
        status: 1,
        message: error.message || "文件路径解析失败",
        data: "fail",
      });
    }

    // 过滤并规范化键值
    const normalizedItems = env_items
      .map((item) => ({
        key: typeof item?.key === "string" ? item.key.trim() : "",
        value: typeof item?.value === "string" ? item.value.trim() : "",
        commented: Boolean(item?.commented),
      }))
      .filter((item) => item.key);

    // 过滤 .envignore 中定义的键，用户不能配置这些键
    const ignoreSet = await loadEnvIgnoreSet(normalizedProjectId);
    const filteredItems = normalizedItems.filter(
      (item) => !ignoreSet.has(item.key.toUpperCase())
    );

    // 按照输入顺序写入 .env；对包含空格或特殊字符的值加双引号并转义
    const formatValue = (val) => {
      const str = val ?? "";
      const needsQuote = /[\s#"'`]/.test(str);
      if (!needsQuote) return str;
      return `"${str.replace(/"/g, '\\"')}"`;
    };

    const content =
      filteredItems
        .map((item) => {
          const line = `${item.key}=${formatValue(item.value)}`;
          return item.commented ? `# ${line}` : line;
        })
        .join("\n") + "\n";

    await fs.promises.writeFile(envPath, content, "utf8");

    return res.send({
      status: 0,
      message: "保存环境配置成功",
      data: {
        env_items: filteredItems,
      },
    });
  } catch (error) {
    recordErrorLog(error, "saveenv");
    return res.send({
      status: 1,
      message: error.message || "保存环境配置失败",
      data: "fail",
    });
  }
};
module.exports = {
  getprojectfiletree,
  getfilecontent,
  getprojectdbstructure,
  gettabledata,
  gettokenusage,
  getenv,
  saveenv,
};
