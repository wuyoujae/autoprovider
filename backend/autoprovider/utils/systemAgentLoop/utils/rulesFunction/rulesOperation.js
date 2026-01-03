const pool = require("../../../../db");
const recordErrorLog = require("../../../recordErrorLog");

const DEFAULT_RULE_CONTENT = "//这是一个注释，请在此处填写rules配置规则";

/**
 * 获取项目规则内容（若不存在则返回默认内容）
 * @param {string} projectId
 * @returns {Promise<string>}
 */
const getProjectRules = async (projectId) => {
  if (!projectId || typeof projectId !== "string") {
    return DEFAULT_RULE_CONTENT;
  }

  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) {
    return DEFAULT_RULE_CONTENT;
  }

  try {
    const [rows] = await pool.query(
      `SELECT rule_content 
       FROM rules_config 
       WHERE project_id = ? AND rule_status = 0 
       ORDER BY update_time DESC 
       LIMIT 1`,
      [normalizedProjectId]
    );

    if (!rows || rows.length === 0) {
      return DEFAULT_RULE_CONTENT;
    }

    return rows[0].rule_content || DEFAULT_RULE_CONTENT;
  } catch (error) {
    recordErrorLog(error, "getProjectRules");
    return DEFAULT_RULE_CONTENT;
  }
};

module.exports = {
  getProjectRules,
  DEFAULT_RULE_CONTENT,
};
