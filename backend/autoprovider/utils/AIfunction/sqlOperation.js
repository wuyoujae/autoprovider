const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const decodeHtmlEntities = require("../systemAgentLoop/utils/decodeHtmlEntities");
const pool = require("../../db");
const SQL_ARCHIVE_RELATIVE_PATH = "/documents/db.sql";
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");
const recordErrorLog = require("../recordErrorLog");
const { getDbContainerId } = require("../systemWorkLoop/ssh2/getDbContainerId");
const { executeDbCommand } = require("../systemWorkLoop/ssh2/executeDbCommand");

/**
 * 确保目录存在（异步版本）
 */
const ensureDirectory = async (targetPath) => {
  const dir = path.dirname(targetPath);
  try {
    await fs.access(dir);
  } catch (e) {
    await fs.mkdir(dir, { recursive: true });
  }
};

const normalizeSqlPayload = (payload) => {
  const sqlList = [];
  if (payload.sql) {
    if (Array.isArray(payload.sql)) {
      payload.sql.forEach((item) => {
        if (typeof item === "string" && item.trim()) {
          sqlList.push(decodeHtmlEntities(item));
        } else if (item && typeof item.sql === "string" && item.sql.trim()) {
          sqlList.push(decodeHtmlEntities(item.sql));
        }
      });
    } else if (typeof payload.sql === "string" && payload.sql.trim()) {
      sqlList.push(decodeHtmlEntities(payload.sql));
    }
  }
  return sqlList;
};

/**
 * 移除 SQL 行注释（只在字符串外部）
 * @param {string} line - SQL 行
 * @returns {string} 移除注释后的行
 */
const removeLineComments = (line) => {
  let result = "";
  let inString = false;
  let stringChar = null;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    // 处理转义字符
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    // 检查转义符
    if (char === "\\" && inString) {
      result += char;
      escaped = true;
      continue;
    }

    // 处理字符串
    if ((char === "'" || char === '"' || char === "`") && !inString) {
      inString = true;
      stringChar = char;
      result += char;
      continue;
    }

    if (char === stringChar && inString) {
      inString = false;
      stringChar = null;
      result += char;
      continue;
    }

    // 在字符串内部，直接添加
    if (inString) {
      result += char;
      continue;
    }

    // 在字符串外部，检查注释
    if (char === "-" && nextChar === "-") {
      // -- 注释，跳过本行剩余部分
      break;
    }

    if (char === "#") {
      // # 注释，跳过本行剩余部分
      break;
    }

    result += char;
  }

  return result.trim();
};

/**
 * 分割并清理 SQL 语句
 * 过滤注释、空行和非 SQL 内容
 */
const splitStatements = (sqlText) => {
  // 按行分割，移除注释
  const lines = sqlText.split("\n");
  const cleanedLines = lines
    .map((line) => removeLineComments(line))
    .filter((line) => line.length > 0);

  // 重新组合成一个字符串
  const cleanedSql = cleanedLines.join("\n");

  // 按分号分割
  const statements = cleanedSql.split(";").map((stmt) => stmt.trim());

  // 过滤空语句和非 SQL 语句
  return statements.filter((stmt) => {
    // 过滤空语句
    if (!stmt || stmt.trim().length === 0) {
      return false;
    }

    // 只保留以 SQL 关键字开头的语句（忽略大小写）
    const sqlKeywords = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "CREATE",
      "ALTER",
      "DROP",
      "TRUNCATE",
      "GRANT",
      "REVOKE",
      "USE",
      "SHOW",
      "DESCRIBE",
      "DESC",
      "EXPLAIN",
      "SET",
      "BEGIN",
      "COMMIT",
      "ROLLBACK",
    ];

    const firstWord = stmt.trim().split(/\s+/)[0].toUpperCase();
    return sqlKeywords.includes(firstWord);
  });
};

const formatDuration = (start) => {
  const diff = process.hrtime.bigint() - start;
  const seconds = Number(diff) / 1_000_000_000;
  return `${seconds.toFixed(3)}s`;
};

const extractOperationType = (statement = "") => {
  if (!statement || typeof statement !== "string") {
    return null;
  }
  const firstToken = statement.trim().split(/\s+/)[0];
  return firstToken ? firstToken.toUpperCase() : null;
};

const extractTableName = (statement, operationType) => {
  const upperStmt = statement.toUpperCase();
  const tableRegexMap = {
    SELECT: /\bFROM\s+[`"'[]?([A-Z0-9_.-]+)/,
    INSERT: /\bINTO\s+[`"'[]?([A-Z0-9_.-]+)/,
    UPDATE: /\bUPDATE\s+[`"'[]?([A-Z0-9_.-]+)/,
    DELETE: /\bFROM\s+[`"'[]?([A-Z0-9_.-]+)/,
    ALTER: /\bTABLE\s+[`"'[]?([A-Z0-9_.-]+)/,
    DROP: /\bTABLE\s+[`"'[]?([A-Z0-9_.-]+)/,
    CREATE: /\bTABLE\s+[`"'[]?([A-Z0-9_.-]+)/,
  };
  const regex = tableRegexMap[operationType];
  if (!regex) return null;
  const match = upperStmt.match(regex);
  return match ? match[1]?.toLowerCase() : null;
};

const buildExecutionDetail = ({
  statement,
  operationType,
  executionTime,
  outputText = "",
  success = true,
}) => {
  return {
    sql: statement,
    result: `执行结果：${success ? "execute success" : "execute fail"}`,
    execution_time: executionTime,
    output: outputText.trim(),
    schema_info: {
      table: extractTableName(statement, operationType),
      columns: [],
      operation_type: operationType,
    },
    query_summary: {
      rows_returned: 0,
      columns_count: 0,
    },
  };
};

const resolveContainerId = async ({
  projectId,
  userDbName,
  infoObject,
  sshOptions,
}) => {
  // 优先使用 infoObject 中的 db_id / dbId
  if (infoObject?.db_id) return infoObject.db_id;
  if (infoObject?.dbId) return infoObject.dbId;

  // 尝试从 project_info 查询 db_id
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        "SELECT db_id FROM project_info WHERE project_id = ? LIMIT 1",
        [projectId]
      );
      if (rows.length && rows[0].db_id) {
        return rows[0].db_id;
      }
    } finally {
      connection.release();
    }
  } catch (metaErr) {
    recordErrorLog(metaErr, "sqlOperation - fetch db_id");
  }

  // 回退：通过名称匹配容器
  const containerResult = await getDbContainerId({
    projectId,
    dbName: userDbName,
    ...sshOptions,
  });
  if (containerResult.status === 0 && containerResult.data?.containerId) {
    return containerResult.data.containerId;
  }
  return null;
};

/**
 * 执行 SQL 操作
 * @param {Object} payload - 函数参数对象
 * @param {Array<string>|string} [payload.fileName] SQL 文件路径
 * @param {Array<string|string>|string} [payload.sql] 直接提供的 SQL 代码
 * @param {Object} infoObject - 包含项目信息的对象
 * @param {Object} infoObject.databasePool MySQL 连接池
 * @param {PromisePoolConnection} [infoObject.connection] 复用的连接
 * @param {string} infoObject.projectId 项目 ID
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function sqlOperation(payload = {}, infoObject = {}) {
  // {
  //   "type": "function",
  //   "function": {
  //     "name": "sql_operation",
  //     "description": "Execute a SQL command on the managed database environment. All SQL operations must be compatible with the existing schema and state tracked in the system's sql-operationed log. Only one SQL statement per call is supported (e.g., CREATE, ALTER, INSERT, UPDATE, DELETE, SELECT).",
  //     "parameters": {
  //       "type": "object",
  //       "properties": {
  //         "sql": {
  //           "type": "string",
  //           "description": "A valid SQL statement to execute (e.g., CREATE TABLE, INSERT INTO, SELECT, etc.). Must conform to the current database schema and constraints."
  //         }
  //       },
  //       "required": ["sql"]
  //     }
  //   }
  // }
  try {
    const directSqlList = normalizeSqlPayload(payload);
    const { projectId, sshOptions = {} } = infoObject;

    if (!projectId) {
      return {
        status: 1,
        message: "sqloperation fail",
        data: { error: "projectId 不能为空" },
      };
    }

    const sqlChunks = [];
    directSqlList.forEach((sqlText) => {
      chatToFrontend("正在进行sql操作", "sql_operation", infoObject);
      sqlChunks.push(sqlText);
    });

    if (sqlChunks.length === 0) {
      return {
        status: 1,
        message: "sqloperation fail",
        data: { error: "未提供任何 SQL 代码或 SQL 文件" },
      };
    }

    const combinedSql = sqlChunks.join("\n\n");

    // 保存 SQL 到项目内档案文件（异步）
    const archivePath = combyFilePath(projectId, SQL_ARCHIVE_RELATIVE_PATH);
    await ensureDirectory(archivePath);
    const archiveHeader = `\n-- SQL Operation @ ${new Date().toISOString()}\n`;
    await fs.appendFile(archivePath, archiveHeader + combinedSql + "\n");

    // 拆分语句
    const statements = splitStatements(combinedSql);
    if (statements.length === 0) {
      return {
        status: 1,
        message: "sqloperation fail",
        data: { error: "SQL 内容为空，无法执行" },
      };
    }

    // 计算远程数据库名与容器
    const userDbName = `myapp_${projectId.replace(/-/g, "_").toLowerCase()}`;
    const containerId = await resolveContainerId({
      projectId,
      userDbName,
      infoObject,
      sshOptions,
    });
    if (!containerId) {
      return {
        status: 1,
        message: "sqloperation fail",
        data: {
          error: "未找到对应数据库容器，请确认部署状态",
        },
      };
    }

    const executions = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const operationType = extractOperationType(statement);
      const startTime = process.hrtime.bigint();

      try {
        const execResult = await executeDbCommand({
          containerId,
          dbName: userDbName,
          sql: statement,
          ...sshOptions,
        });

        const executionTime = formatDuration(startTime);
        const success = execResult.status === 0;
        const outputText = execResult.data?.output || "";
        executions.push(
          buildExecutionDetail({
            statement,
            operationType,
            executionTime,
            outputText,
            success,
          })
        );

        if (!success) {
          return {
            status: 1,
            message: "sqloperation fail",
            data: {
              sql: statement,
              result: `执行结果：execute fail【${
                execResult.message || "远程执行失败"
              }】`,
              output: outputText,
            },
          };
        }
      } catch (stmtError) {
        recordErrorLog(stmtError, "AgentFunction in sql operation");
        const executionTime = formatDuration(startTime);
        return {
          status: 1,
          message: "sqloperation fail",
          data: {
            sql: statement,
            result: `执行结果：execute fail【${stmtError.message}】`,
            execution_time: executionTime,
            output: "",
          },
        };
      }
    }

    const singleExecution = executions.length === 1 ? executions[0] : null;
    if (singleExecution) {
      return {
        status: 0,
        message: "sqloperation success",
        data: singleExecution,
      };
    }

    return {
      status: 0,
      message: "sqloperation success",
      data: {
        executions,
        summary: {
          total_statements: statements.length,
          successful_statements: executions.length,
          failed_statements: 0,
        },
      },
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in sql operation");
    return {
      status: 1,
      message: "sqloperation fail",
      data: {
        sql: payload?.sql || "",
        result: `执行结果：execute fail【${
          error.message || "SQL 操作时发生未知错误"
        }】`,
        execution_time: "0.000s",
        output: "",
      },
    };
  }
}

module.exports = sqlOperation;
