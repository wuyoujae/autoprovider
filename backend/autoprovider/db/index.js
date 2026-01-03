const mysql2 = require("mysql2");

// 读取环境变量工具，保证数字配置安全降级到默认值
const num = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
};

// MySQL 连接池配置（全部支持环境变量并提供默认值）
// 重要：连接池大小需要足够处理并发请求，每个 AgentWork 需要 1 个连接
const pool = mysql2
  .createPool({
    host: process.env.DB_HOST || "localhost",
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "123456",
    database: process.env.DB_NAME || "autoprovider_open",
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS
      ? process.env.DB_WAIT_FOR_CONNECTIONS === "true"
      : true,
    connectionLimit: num(process.env.DB_CONNECTION_LIMIT, 50),
    queueLimit: num(process.env.DB_QUEUE_LIMIT, 100),
    acquireTimeout: num(process.env.DB_ACQUIRE_TIMEOUT, 30000), // 获取连接超时
    connectTimeout: num(process.env.DB_CONNECT_TIMEOUT, 10000), // 建连超时
    idleTimeout: num(process.env.DB_IDLE_TIMEOUT, 60000), // 空闲超时
    enableKeepAlive: process.env.DB_KEEP_ALIVE
      ? process.env.DB_KEEP_ALIVE === "true"
      : true,
    keepAliveInitialDelay: num(process.env.DB_KEEP_ALIVE_DELAY, 30000),
  })
  .promise();

// 连接池错误处理
pool.on &&
  pool.on("error", (err) => {
    console.error("[DB Pool Error]", err.message);
});

// 定期检查连接池状态（每5分钟）
setInterval(() => {
  const poolStatus = pool.pool
    ? {
    acquiredConnections: pool.pool._allConnections?.length || 0,
    freeConnections: pool.pool._freeConnections?.length || 0,
    connectionQueue: pool.pool._connectionQueue?.length || 0,
      }
    : "pool stats unavailable";
  console.log("[DB Pool Status]", poolStatus);
}, 300000);

module.exports = pool;
