const { getLLMConfig, saveLLMConfig } = require("../utils/llmConfig");
const recordErrorLog = require("../utils/recordErrorLog");

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * 将用户提交的模型供应商配置展开为单个模型列表
 * @param {Array} providers - 供应商列表，每个包含 provider, baseUrl, apiKey, models[]
 * @returns {Array} 展开后的模型列表
 */
const expandProviders = (providers = []) => {
  if (!Array.isArray(providers)) return [];
  
  const result = [];
  
  for (const prov of providers) {
    const provider = str(prov?.provider);
    const baseUrl = str(prov?.baseUrl);
    const apiKey = str(prov?.apiKey);
    
    if (!provider || !baseUrl || !apiKey) continue;
    
    const models = Array.isArray(prov?.models) ? prov.models : [];
    
    for (const m of models) {
      const modelName = str(m?.model || m?.name || m);
      if (!modelName) continue;
      
      result.push({
        provider,
        baseUrl,
        apiKey,
        model: modelName,
        tokenLimit: m?.tokenLimit ? num(m.tokenLimit, null) : null,
      });
    }
  }
  
  return result;
};

/**
 * 获取配置（从数据库）
 */
const getconfig = async (_req, res) => {
  try {
    const cfg = await getLLMConfig();
    return res.send({
      status: 0,
      message: "success",
      data: cfg,
    });
  } catch (error) {
    recordErrorLog(error, "llmconfig/getconfig");
    return res.send({
      status: 1,
      message: error.message || "获取模型配置失败",
      data: "fail",
    });
  }
};

/**
 * 保存配置（接收供应商列表，展开为单个模型后存储）
 */
const saveconfig = async (req, res) => {
  try {
    const { agentProviders, editFileProviders, miniProviders } = req.body || {};
    
    // 展开供应商配置为单个模型列表
    const agentModels = expandProviders(agentProviders);
    const editFileModels = expandProviders(editFileProviders);
    const miniModels = expandProviders(miniProviders);
    
    await saveLLMConfig({
      agentModels,
      editFileModels,
      miniModels,
    });
    
    return res.send({
      status: 0,
      message: "保存成功",
      data: {
        agentModels,
        editFileModels,
        miniModels,
      },
    });
  } catch (error) {
    recordErrorLog(error, "llmconfig/saveconfig");
    return res.send({
      status: 1,
      message: error.message || "保存模型配置失败",
      data: "fail",
    });
  }
};

module.exports = {
  getconfig,
  saveconfig,
};
