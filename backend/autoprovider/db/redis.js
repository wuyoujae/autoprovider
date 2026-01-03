const Redis = require("ioredis");
const recordErrorLog = require("../utils/recordErrorLog");

// 数字与布尔读取工具，保证环境变量安全降级
const num = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (val, fallback) => {
  if (val === "true") return true;
  if (val === "false") return false;
  return fallback;
};

// Redis 连接配置（全部支持环境变量并提供默认值）
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: num(process.env.REDIS_PORT, 6379),
  password: process.env.REDIS_PASSWORD || "chumeng2004",
  db: num(process.env.REDIS_DB, 0),
  family: num(process.env.REDIS_FAMILY, 4),
  keepAlive: bool(process.env.REDIS_KEEP_ALIVE, true),
  enableReadyCheck: bool(process.env.REDIS_ENABLE_READY_CHECK, false),
  lazyConnect: bool(process.env.REDIS_LAZY_CONNECT, true),
  retryDelayOnFailover: num(process.env.REDIS_RETRY_DELAY_ON_FAILOVER, 100),
  retryDelayOnClusterDown: num(
    process.env.REDIS_RETRY_DELAY_ON_CLUSTER_DOWN,
    300
  ),
  maxRetriesPerRequest: num(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 3),
  connectTimeout: num(process.env.REDIS_CONNECT_TIMEOUT, 10000),
  // ioredis 其余配置可继续按需透传
};

// 创建Redis客户端实例
const redis = new Redis(redisConfig);

// 连接事件监听
redis.on("connect", () => {
  console.log("Redis连接成功");
});

redis.on("ready", () => {
  console.log("Redis准备就绪");
});

redis.on("error", (err) => {
  console.error("Redis连接错误:", err);
  recordErrorLog(err);
});

redis.on("close", () => {
  console.log("Redis连接关闭");
});

redis.on("reconnecting", () => {
  console.log("Redis重新连接中...");
});

// 标记项目删除状态，避免缓存脏数据
const setProjectDeletedFlag = async (projectId, ttlSeconds = 86400) => {
  if (!projectId) {
    return { success: false, detail: "projectId 不能为空" };
  }

  const key = `project_status:${projectId}`;
  try {
    await redis.set(key, "deleted", "EX", ttlSeconds);
    return { success: true, key };
  } catch (error) {
    recordErrorLog(error, "redis.setProjectDeletedFlag");
    return { success: false, detail: error.message || "写入 Redis 失败" };
  }
};

// 连接状态检查函数
const checkRedisConnection = async () => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis连接检查失败:", error);
    recordErrorLog(error);
    return false;
  }
};

// 优雅关闭Redis连接
const closeRedisConnection = async () => {
  try {
    await redis.quit();
    console.log("Redis连接已优雅关闭");
  } catch (error) {
    console.error("关闭Redis连接时出错:", error);
    recordErrorLog(error);
  }
};

// 导出Redis实例和工具函数
module.exports = {
  redis,
  checkRedisConnection,
  closeRedisConnection,
  redisConfig,
  setProjectDeletedFlag,
};
