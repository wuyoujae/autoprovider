const fs = require("fs");
const path = require("path");
const pool = require("../db");

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const num = (v, fallback) => {
  // 处理 null/undefined，直接返回 fallback
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  // 确保返回有效的数值，且如果 fallback 有意义的最小值检查
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// tokenLimit 专用：确保有合理的最小值
const tokenLimitNum = (v, fallback = 130000) => {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  // tokenLimit 至少要有 10000，避免负数问题
  const MIN_TOKEN_LIMIT = 10000;
  return Number.isFinite(n) && n >= MIN_TOKEN_LIMIT ? n : fallback;
};

/**
 * 从数据库读取 LLM 模型配置
 * @returns {Promise<{agentModels: Array, editFileModels: Array}>}
 */
const CACHE_PATH = path.resolve(__dirname, "../config/llm-config.json");

const writeCache = (data) => {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("[llmConfig] 写入缓存失败:", error);
  }
};

const readCache = () => {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      agentModels: Array.isArray(parsed?.agentModels) ? parsed.agentModels : [],
      editFileModels: Array.isArray(parsed?.editFileModels)
        ? parsed.editFileModels
        : [],
    };
  } catch (error) {
    return { agentModels: [], editFileModels: [] };
  }
};

const getLLMConfig = async () => {
  const sql = `
    SELECT id, model_type, provider, base_url, api_key, model, token_limit, order_no
    FROM llm_model_config
    WHERE status = 0
    ORDER BY model_type, order_no, id
  `;

  try {
    const [rows] = await pool.query(sql);

    const mapRows = (type) =>
      rows
        .filter((r) => r.model_type === type)
        .map((r) => ({
          id: r.id,
          provider: str(r.provider),
          baseUrl: str(r.base_url),
          apiKey: str(r.api_key),
          model: str(r.model),
          tokenLimit: tokenLimitNum(r.token_limit, 130000),
          orderNo: r.order_no || 0,
        }));

    const agentModels = mapRows("agent");
    const editFileModels = mapRows("editfile");
    const miniModels = mapRows("mini");

    const payload = { agentModels, editFileModels, miniModels };
    writeCache(payload);
    return payload;
  } catch (error) {
    console.error("[llmConfig] 读取数据库失败:", error);
    // 回退缓存
    return readCache();
  }
};

/**
 * 保存 LLM 模型配置到数据库
 * @param {Object} config - 配置对象
 * @param {Array} config.agentModels - Agent 模型列表
 * @param {Array} config.editFileModels - EditFile 模型列表
 * @returns {Promise<void>}
 */
const saveLLMConfig = async ({
  agentModels = [],
  editFileModels = [],
  miniModels = [],
}) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 清空旧数据
    await conn.query(
      `DELETE FROM llm_model_config WHERE model_type IN ('agent', 'editfile', 'mini')`
    );

    let orderNo = 0;

    // 插入 agent 模型
    for (const item of agentModels) {
      orderNo++;
      await conn.query(
        `INSERT INTO llm_model_config 
         (model_type, provider, base_url, api_key, model, token_limit, order_no) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "agent",
          str(item.provider),
          str(item.baseUrl),
          str(item.apiKey),
          str(item.model),
          tokenLimitNum(item.tokenLimit, 130000),
          orderNo,
        ]
      );
    }

    // 插入 editfile 模型
    orderNo = 0;
    for (const item of editFileModels) {
      orderNo++;
      await conn.query(
        `INSERT INTO llm_model_config 
         (model_type, provider, base_url, api_key, model, token_limit, order_no) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "editfile",
          str(item.provider),
          str(item.baseUrl),
          str(item.apiKey),
          str(item.model),
          tokenLimitNum(item.tokenLimit, 130000),
          orderNo,
        ]
      );
    }

    // 插入 mini 模型
    orderNo = 0;
    for (const item of miniModels) {
      orderNo++;
      await conn.query(
        `INSERT INTO llm_model_config 
         (model_type, provider, base_url, api_key, model, token_limit, order_no) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "mini",
          str(item.provider),
          str(item.baseUrl),
          str(item.apiKey),
          str(item.model),
          tokenLimitNum(item.tokenLimit, 130000),
          orderNo,
        ]
      );
    }

    await conn.commit();
    // 写缓存
    writeCache({ agentModels, editFileModels, miniModels });
  } catch (error) {
    await conn.rollback();
    console.error("[llmConfig] 保存数据库失败:", error);
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  getLLMConfig,
  getLLMConfigSync: readCache,
  saveLLMConfig,
};
