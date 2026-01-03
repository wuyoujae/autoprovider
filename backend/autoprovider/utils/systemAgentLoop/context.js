/**
 * 执行上下文管理器
 * 用于在 AI 函数调用链中传递上下文信息（如 clientId）
 * 
 * 重要：使用 AsyncLocalStorage 来避免并发请求之间的上下文冲突
 * 之前使用全局变量会导致多个并发请求互相覆盖上下文
 */

const { AsyncLocalStorage } = require("async_hooks");

// 使用 AsyncLocalStorage 来存储每个请求的上下文
// 这样每个异步操作链都有自己独立的上下文，不会互相干扰
const asyncLocalStorage = new AsyncLocalStorage();

// 兼容旧代码的后备存储（仅在 AsyncLocalStorage 不可用时使用）
const contextMap = new Map();

/**
 * 设置当前执行上下文
 * @param {object} context - 上下文对象
 */
const setContext = (context) => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.context = context;
  } else {
    // 后备方案：使用 clientId 作为 key 存储
    if (context && context.clientId) {
      contextMap.set(context.clientId, context);
    }
  }
};

/**
 * 获取当前执行上下文
 * @returns {object|null} 当前上下文对象
 */
const getContext = () => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    return store.context;
  }
  return null;
};

/**
 * 清除当前执行上下文
 */
const clearContext = () => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    const clientId = store.context?.clientId;
    store.context = null;
    // 同时清理 Map 中的备份
    if (clientId) {
      contextMap.delete(clientId);
    }
  }
};

/**
 * 在上下文中执行函数（推荐使用此方法）
 * @param {object} context - 上下文对象
 * @param {function} fn - 要执行的函数
 * @returns {Promise<any>} 函数执行结果
 */
const runWithContext = async (context, fn) => {
  return asyncLocalStorage.run({ context }, async () => {
    // 同时存储到 Map 作为备份
    if (context && context.clientId) {
      contextMap.set(context.clientId, context);
    }
    try {
      return await fn();
    } finally {
      if (context && context.clientId) {
        contextMap.delete(context.clientId);
      }
    }
  });
};

/**
 * 根据 clientId 获取上下文（用于 SSE 等场景）
 * @param {string} clientId - 客户端ID
 * @returns {object|null} 上下文对象
 */
const getContextByClientId = (clientId) => {
  // 优先从 AsyncLocalStorage 获取
  const store = asyncLocalStorage.getStore();
  if (store && store.context?.clientId === clientId) {
    return store.context;
  }
  // 后备从 Map 获取
  return contextMap.get(clientId) || null;
};

module.exports = {
  setContext,
  getContext,
  clearContext,
  runWithContext,
  getContextByClientId,
};
