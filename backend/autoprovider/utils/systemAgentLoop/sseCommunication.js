/**
 * SSE 通信模块
 * 提供向前端持续推送消息以及断开连接的能力
 *
 * 使用方式：
 *   const { registerClient, sendMessage, disconnectClient } = require("./sseCommunication");
 *
 *   // 在路由中初始化连接
 *   registerClient(res, clientId);
 *
 *   // 在任意位置发送消息
 *   sendMessage("正在处理...", { clientId, event: "progress" });
 *
 *   // 任务结束 / 需要关闭连接时
 *   disconnectClient(clientId, "任务已完成");
 */

const clients = new Map();

// ========== 心跳配置 ==========
const HEARTBEAT_INTERVAL = 20000; // 心跳间隔：20秒
const CLIENT_TIMEOUT = 120000; // 客户端超时：2分钟无活动则清理
const CLEANUP_INTERVAL = 30000; // 清理检查间隔：30秒

// 全局清理定时器（单例）
let cleanupTimer = null;

/**
 * 启动全局清理定时器
 * 定期检查并清理超时的僵尸连接
 */
const startCleanupTimer = () => {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const expiredClients = [];

    clients.forEach((client, clientId) => {
      // 检查是否超时（最后活动时间超过阈值）
      if (now - client.lastActiveAt > CLIENT_TIMEOUT) {
        expiredClients.push(clientId);
      }
    });

    // 清理超时客户端
    expiredClients.forEach((clientId) => {
      console.log(
        `[sseCommunication] 🧹 清理超时连接: ${clientId}, 已超时 ${Math.round(
          (now - clients.get(clientId)?.lastActiveAt) / 1000
        )}s`
      );
      disconnectClient(clientId, "连接超时，已自动断开");
    });

    // 如果没有客户端了，停止清理定时器
    if (clients.size === 0) {
      stopCleanupTimer();
    }
  }, CLEANUP_INTERVAL);
};

/**
 * 停止全局清理定时器
 */
const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

/**
 * 启动客户端心跳定时器
 * @param {string} clientId - 客户端ID
 */
const startHeartbeat = (clientId) => {
  const client = clients.get(clientId);
  if (!client) return;

  // 清除旧的心跳定时器
  if (client.heartbeatTimer) {
    clearInterval(client.heartbeatTimer);
  }

  // 启动新的心跳定时器
  client.heartbeatTimer = setInterval(() => {
    const currentClient = clients.get(clientId);
    if (!currentClient || currentClient.isClosed) {
      clearInterval(client.heartbeatTimer);
      return;
    }

    try {
      // 发送心跳注释（SSE 注释不会触发前端事件，但能保持连接活跃）
      currentClient.res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      // 更新最后活动时间
      currentClient.lastActiveAt = Date.now();
    } catch (error) {
      console.error(
        `[sseCommunication] ❌ 心跳发送失败: ${clientId}`,
        error.message
      );
      // 心跳失败，清理连接
      clearInterval(client.heartbeatTimer);
      clients.delete(clientId);
    }
  }, HEARTBEAT_INTERVAL);
};

/**
 * 停止客户端心跳定时器
 * @param {string} clientId - 客户端ID
 */
const stopHeartbeat = (clientId) => {
  const client = clients.get(clientId);
  if (client && client.heartbeatTimer) {
    clearInterval(client.heartbeatTimer);
    client.heartbeatTimer = null;
  }
};

/**
 * 注册一个 SSE 客户端连接
 * @param {object} res - express response 对象
 * @param {string} clientId - 客户端唯一标识，默认 default
 * @returns {"done"}
 */
const registerClient = (res, clientId = "default") => {
  if (!res || typeof res.write !== "function") {
    throw new Error("sseCommunication.registerClient 需要有效的 response 对象");
  }

  const id = clientId || "default";

  // 如果已存在同名客户端，先断开旧连接
  if (clients.has(id)) {
    disconnectClient(id, "存在新的连接，关闭旧的连接");
  }

  // 设置 SSE 响应头
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const now = Date.now();

  // 保存客户端（增加心跳相关字段）
  clients.set(id, {
    res,
    createdAt: now,
    lastActiveAt: now, // 最后活动时间
    isClosed: false,
    heartbeatTimer: null,
  });

  // 监听连接关闭事件，自动清理
  res.on("close", () => {
    const client = clients.get(id);
    if (client) {
      stopHeartbeat(id);
      if (!client.isClosed) {
        clients.delete(id);
      }
    }
  });

  // 监听错误事件
  res.on("error", (error) => {
    console.error(`[sseCommunication] ❌ 连接错误: ${id}`, error.message);
    stopHeartbeat(id);
    clients.delete(id);
  });

  // 发送初始化注释，保持连接活跃
  // 同时发送 retry 指令，告知客户端建议的重连间隔
  res.write(`retry: 3000\n`);
  res.write(`: connected ${new Date().toISOString()}\n\n`);

  // 启动心跳定时器
  startHeartbeat(id);

  // 确保全局清理定时器在运行
  startCleanupTimer();

  return "done";
};

/**
 * 向客户端发送消息
 * @param {string|object} message - 要发送的内容，推荐字符串
 * @param {object} [options]
 * @param {string} [options.clientId="default"] - 客户端唯一标识
 * @param {string} [options.event="message"] - SSE 事件名
 * @param {string|number} [options.id] - SSE 消息 ID
 * @param {number} [options.retry] - SSE 重试间隔（毫秒）
 * @returns {"done"|"no-client"|"error"}
 */
const sendMessage = (message, options = {}) => {
  const { clientId = "default", event = "message", id, retry } = options;

  const client = clients.get(clientId);

  if (!client || client.isClosed) {
    console.warn("[sseCommunication] ⚠️ 未找到有效的 SSE 连接，消息无法发送", {
      clientId,
    });
    return "no-client";
  }

  const { res } = client;

  try {
    if (event) {
      res.write(`event: ${event}\n`);
    }

    if (id !== undefined) {
      res.write(`id: ${id}\n`);
    }

    if (retry !== undefined) {
      res.write(`retry: ${retry}\n`);
    }

    const payload =
      typeof message === "string" ? message : JSON.stringify(message);

    // SSE 要求多行数据需要逐行写入 data:
    payload.split(/\r?\n/).forEach((line) => {
      res.write(`data: ${line}\n`);
    });

    res.write("\n");

    // 更新最后活动时间
    client.lastActiveAt = Date.now();

    return "done";
  } catch (error) {
    console.error("[sseCommunication] ❌ 发送 SSE 消息失败:", error.message);
    stopHeartbeat(clientId);
    clients.delete(clientId);
    return "error";
  }
};

/**
 * 主动断开客户端连接
 * @param {string} [clientId="default"] - 客户端唯一标识
 * @param {string} [reason] - 断开原因，会作为 close 事件发送给前端
 * @returns {"done"|"no-client"}
 */
const disconnectClient = (clientId = "default", reason) => {
  const client = clients.get(clientId);

  if (!client) {
    return "no-client";
  }

  // 先停止心跳
  stopHeartbeat(clientId);

  const { res } = client;

  try {
    if (reason) {
      sendMessage(
        JSON.stringify({
          type: "CONNECTION_CLOSED",
          reason,
          timestamp: new Date().toISOString(),
        }),
        { clientId, event: "close" }
      );
    } else {
      res.write("event: close\ndata: connection closed\n\n");
    }

    client.isClosed = true;
    res.end();
  } catch (error) {
    console.error("[sseCommunication] ❌ 断开 SSE 连接失败:", error.message);
  } finally {
    clients.delete(clientId);
  }

  return "done";
};

/**
 * 获取当前活跃客户端数量（用于监控）
 * @returns {number}
 */
const getClientCount = () => {
  return clients.size;
};

/**
 * 检查客户端是否存在且活跃
 * @param {string} clientId - 客户端ID
 * @returns {boolean}
 */
const isClientActive = (clientId = "default") => {
  const client = clients.get(clientId);
  return client && !client.isClosed;
};

module.exports = {
  registerClient,
  sendMessage,
  disconnectClient,
  getClientCount,
  isClientActive,
};
