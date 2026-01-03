const fs = require("fs");
const path = require("path");
const mysql2 = require("mysql2/promise");

const bool = (v, fallback = false) => {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
};

const num = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * 将 SQL 文件内容拆分成语句列表（尽量避免把字符串/反引号里的 ; 当作分隔符）
 * 说明：本项目的 db.sql 主要为 DDL/索引创建语句，本拆分器足够使用。
 * @param {string} sql
 * @returns {string[]}
 */
function splitSqlStatements(sql) {
  const statements = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    // 处理注释状态
    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        cur += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    // 进入注释（仅在不在字符串/反引号内时）
    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        i++;
        continue;
      }
      if (ch === "#") {
        inLineComment = true;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
    }

    // 字符串/反引号切换（注意转义）
    if (!inDouble && !inBacktick && ch === "'" && sql[i - 1] !== "\\") {
      inSingle = !inSingle;
      cur += ch;
      continue;
    }
    if (!inSingle && !inBacktick && ch === '"' && sql[i - 1] !== "\\") {
      inDouble = !inDouble;
      cur += ch;
      continue;
    }
    if (!inSingle && !inDouble && ch === "`") {
      inBacktick = !inBacktick;
      cur += ch;
      continue;
    }

    // 语句结束
    if (!inSingle && !inDouble && !inBacktick && ch === ";") {
      const s = cur.trim();
      if (s) statements.push(s);
      cur = "";
      continue;
    }

    cur += ch;
  }

  const tail = cur.trim();
  if (tail) statements.push(tail);
  return statements;
}

function shouldIgnoreSqlError(err) {
  const msg = (err && err.message) || "";
  const errno = err && (err.errno || err.code);

  // 常见的“可重复执行”错误：表/索引已存在、重复键名等
  if (errno === 1050 || msg.includes("Table") && msg.includes("already exists"))
    return true; // ER_TABLE_EXISTS_ERROR
  if (errno === 1061 || msg.includes("Duplicate key name")) return true; // ER_DUP_KEYNAME
  if (errno === 1826 || msg.includes("Duplicate index")) return true; // ER_DUP_INDEX
  if (errno === 1007 || msg.includes("Can't create database") && msg.includes("exists"))
    return true; // ER_DB_CREATE_EXISTS

  return false;
}

/**
 * 启动后初始化 MySQL：
 * - 创建数据库（如不存在）
 * - 执行 db/db.sql（尽量容错：遇到“已存在”类错误会跳过）
 */
async function bootstrapMySQL() {
  const host = process.env.DB_HOST || "localhost";
  const port = num(process.env.DB_PORT, 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "123456";
  const database = process.env.DB_NAME || "autoprovider_open";

  const sqlFilePath = path.resolve(__dirname, "../db/db.sql");
  const rawSql = fs.readFileSync(sqlFilePath, "utf-8");
  const statements = splitSqlStatements(rawSql);

  // 1) 先连接到 server 级别创建数据库（不指定 database）
  const serverConn = await mysql2.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
  });

  try {
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await serverConn.end();
  }

  // 2) 再连接到目标库执行建表语句
  const dbConn = await mysql2.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: false,
  });

  let executed = 0;
  let skipped = 0;

  try {
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      try {
        await dbConn.query(trimmed);
        executed++;
      } catch (err) {
        if (shouldIgnoreSqlError(err)) {
          skipped++;
          continue;
        }
        throw err;
      }
    }
  } finally {
    await dbConn.end();
  }

  return { executed, skipped, statements: statements.length, database };
}

/**
 * 是否应自动初始化数据库
 * - AUTO_INIT_DB=true 明确开启
 * - 生产环境默认关闭（除非显式开启）
 */
function shouldAutoInitDb() {
  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  return bool(process.env.AUTO_INIT_DB, !isProd);
}

module.exports = {
  bootstrapMySQL,
  shouldAutoInitDb,
};


