const pool = require("../db");
const recordErrorLog = require("../utils/recordErrorLog");
const { v4: uuidv4 } = require("uuid");

/**
 * 新建规则（直接插入一条新记录，带默认内容）
 */
const createrules = async (req, res) => {
  try {
    const { project_id } = req.body || {};

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const ruleId = uuidv4();
    const defaultContent = "//这是一个注释，请在此处填写rules配置规则";

    // 先查是否已有规则（不论状态），确保每个项目仅一条记录
    let existingRule = null;
    try {
      const [rows] = await pool.query(
        `SELECT rule_id, rule_version FROM rules_config 
         WHERE project_id = ? 
         ORDER BY update_time DESC 
         LIMIT 1`,
        [normalizedProjectId]
      );
      if (rows && rows.length > 0) {
        existingRule = rows[0];
      }
    } catch (error) {
      recordErrorLog(error, "createrules - select");
      return res.send({
        status: 1,
        message: "查询规则失败，请稍后重试",
        data: "fail",
      });
    }

    if (existingRule) {
      const newVersion = (existingRule.rule_version || 0) + 1;
      try {
        await pool.query(
          `UPDATE rules_config 
           SET rule_content = ?, rule_version = rule_version + 1, rule_status = 0, update_time = NOW() 
           WHERE rule_id = ?`,
          [defaultContent, existingRule.rule_id]
        );
      } catch (error) {
        recordErrorLog(error, "createrules - update");
        return res.send({
          status: 1,
          message: "创建规则失败，请稍后重试",
          data: "fail",
        });
      }

      return res.send({
        status: 0,
        message: "创建规则成功",
        data: {
          rule_id: existingRule.rule_id,
          project_id: normalizedProjectId,
          rule_content: defaultContent,
          rule_version: newVersion,
        },
      });
    } else {
      try {
        await pool.query(
          `INSERT INTO rules_config 
           (rule_id, project_id, rule_content, rule_version, rule_status) 
           VALUES (?, ?, ?, 1, 0)`,
          [ruleId, normalizedProjectId, defaultContent]
        );
      } catch (error) {
        recordErrorLog(error, "createrules - insert");
        return res.send({
          status: 1,
          message: "创建规则失败，请稍后重试",
          data: "fail",
        });
      }

      return res.send({
        status: 0,
        message: "创建规则成功",
        data: {
          rule_id: ruleId,
          project_id: normalizedProjectId,
          rule_content: defaultContent,
          rule_version: 1,
        },
      });
    }
  } catch (error) {
    recordErrorLog(error, "createrules");
    return res.send({
      status: 1,
      message: "创建规则失败，服务器内部错误",
      data: "fail",
    });
  }
};

/**
 * 保存规则（新增或更新最新版本）
 */
const saverules = async (req, res) => {
  try {
    const { project_id, rule_content } = req.body || {};

    // 参数验证
    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    if (rule_content === undefined || rule_content === null) {
      return res.send({
        status: 1,
        message: "规则内容不能为空",
        data: "fail",
      });
    }

    if (typeof rule_content !== "string") {
      return res.send({
        status: 1,
        message: "规则内容必须为字符串",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    // 查询是否已有规则（不论状态），确保单条记录
    let existingRule = null;
    try {
      const [rows] = await pool.query(
        `SELECT rule_id, rule_version FROM rules_config 
         WHERE project_id = ? 
         ORDER BY update_time DESC 
         LIMIT 1`,
        [normalizedProjectId]
      );
      if (rows && rows.length > 0) {
        existingRule = rows[0];
      }
    } catch (error) {
      recordErrorLog(error, "saverules - select");
      return res.send({
        status: 1,
        message: "查询规则失败，请稍后重试",
        data: "fail",
      });
    }

    let ruleId;
    let ruleVersion = 1;

    if (existingRule) {
      ruleId = existingRule.rule_id;
      ruleVersion = (existingRule.rule_version || 0) + 1;
      try {
        await pool.query(
          `UPDATE rules_config 
           SET rule_content = ?, rule_version = rule_version + 1, rule_status = 0, update_time = NOW() 
           WHERE rule_id = ?`,
          [rule_content, ruleId]
        );
      } catch (error) {
        recordErrorLog(error, "saverules - update");
        return res.send({
          status: 1,
          message: "更新规则失败，请稍后重试",
          data: "fail",
        });
      }
    } else {
      // 插入新规则
      ruleId = uuidv4();
      try {
        await pool.query(
          `INSERT INTO rules_config 
           (rule_id, project_id, rule_content, rule_version, rule_status) 
           VALUES (?, ?, ?, 1, 0)`,
          [ruleId, normalizedProjectId, rule_content]
        );
      } catch (error) {
        recordErrorLog(error, "saverules - insert");
        return res.send({
          status: 1,
          message: "保存规则失败，请稍后重试",
          data: "fail",
        });
      }
    }

    return res.send({
      status: 0,
      message: "规则保存成功",
      data: {
        rule_id: ruleId,
        project_id: normalizedProjectId,
        rule_version: ruleVersion,
      },
    });
  } catch (error) {
    recordErrorLog(error, "saverules");
    return res.send({
      status: 1,
      message: "保存规则失败，服务器内部错误",
      data: "fail",
    });
  }
};

/**
 * 获取项目当前规则（最新未删除版本）
 */
const getrules = async (req, res) => {
  try {
    const { project_id } = req.body || {};

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    if (!normalizedProjectId) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    try {
      const [rows] = await pool.query(
        `SELECT rule_id, project_id, rule_content, rule_version, update_time 
         FROM rules_config 
         WHERE project_id = ? AND rule_status = 0 
         ORDER BY update_time DESC 
         LIMIT 1`,
        [normalizedProjectId]
      );

      if (!rows || rows.length === 0) {
        return res.send({
          status: 0,
          message: "暂无规则",
          data: {
            rule_id: null,
            project_id: normalizedProjectId,
            rule_content: "",
            rule_version: 0,
            update_time: null,
          },
        });
      }

      const rule = rows[0];
      return res.send({
        status: 0,
        message: "获取规则成功",
        data: rule,
      });
    } catch (error) {
      recordErrorLog(error, "getrules - select");
      return res.send({
        status: 1,
        message: "获取规则失败，请稍后重试",
        data: "fail",
      });
    }
  } catch (error) {
    recordErrorLog(error, "getrules");
    return res.send({
      status: 1,
      message: "获取规则失败，服务器内部错误",
      data: "fail",
    });
  }
};

/**
 * 软删除指定规则
 */
const deleterules = async (req, res) => {
  try {
    const { rule_id, project_id } = req.body || {};

    if (!rule_id || typeof rule_id !== "string") {
      return res.send({
        status: 1,
        message: "规则ID不能为空",
        data: "fail",
      });
    }

    if (!project_id || typeof project_id !== "string") {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const normalizedProjectId = project_id.trim();
    const normalizedRuleId = rule_id.trim();
    if (!normalizedProjectId || !normalizedRuleId) {
      return res.send({
        status: 1,
        message: "规则ID和项目ID不能为空",
        data: "fail",
      });
    }

    try {
      const [result] = await pool.query(
        `UPDATE rules_config 
         SET rule_status = 1, update_time = NOW() 
         WHERE rule_id = ? AND project_id = ? AND rule_status = 0`,
        [normalizedRuleId, normalizedProjectId]
      );

      if (result.affectedRows === 0) {
        return res.send({
          status: 1,
          message: "规则不存在或已删除",
          data: "fail",
        });
      }

      return res.send({
        status: 0,
        message: "规则删除成功",
        data: {
          rule_id: normalizedRuleId,
          project_id: normalizedProjectId,
        },
      });
    } catch (error) {
      recordErrorLog(error, "deleterules - update");
      return res.send({
        status: 1,
        message: "删除规则失败，请稍后重试",
        data: "fail",
      });
    }
  } catch (error) {
    recordErrorLog(error, "deleterules");
    return res.send({
      status: 1,
      message: "删除规则失败，服务器内部错误",
      data: "fail",
    });
  }
};

module.exports = {
  createrules,
  saverules,
  getrules,
  deleterules,
};


