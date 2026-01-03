const activeWorkMap = new Map();

/**
 * 添加任务到队列
 * @param {string} sessionId
 * @param {object} controlObject - 包含 isStopped 等控制标志的对象
 */
const addWork = (sessionId, controlObject) => {
  activeWorkMap.set(sessionId, controlObject);
};

/**
 * 移除任务
 * @param {string} sessionId
 */
const removeWork = (sessionId) => {
  activeWorkMap.delete(sessionId);
};

/**
 * 获取任务控制对象
 * @param {string} sessionId
 * @returns {object|undefined}
 */
const getWork = (sessionId) => {
  return activeWorkMap.get(sessionId);
};

module.exports = {
  addWork,
  removeWork,
  getWork,
};
