const recordErrorLog = require("../recordErrorLog");
const recordOperation = require("../systemAgentLoop/utils/recordOperation");

/**
 * 构建操作记录代码
 * @param {string} functionName - 函数名
 * @param {Array} params - 参数数组
 * @returns {Object} 操作记录对象
 */
const constructOperationCode = (functionName, params) => {
  return {
    functionName,
    params,
  };
};

/**
 * 生成并更新项目名称
 * @param {Object} payload - 函数参数对象
 * @param {string} payload.core_concept - 项目的核心概念或功能描述
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function generateProjectName(payload = {}, infoObject = {}) {
  try {
    // 参数验证
    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "generateprojectname fail",
        data: {
          error: "项目ID不能为空",
        },
      };
    }

    // 从 payload 中获取参数
    const coreConcept = payload?.core_concept;

    if (
      !coreConcept ||
      typeof coreConcept !== "string" ||
      coreConcept.trim() === ""
    ) {
      return {
        status: 1,
        message: "generateprojectname fail",
        data: {
          error: "core_concept 参数不能为空，必须是字符串",
        },
      };
    }

    // 使用 infoObject 中的 connection
    const connection = infoObject?.connection;
    if (!connection) {
      return {
        status: 1,
        message: "generateprojectname fail",
        data: {
          error: "数据库连接不可用",
        },
      };
    }

    // 验证项目是否存在
    const checkProjectSql = `SELECT project_id, project_name 
      FROM project_info 
      WHERE project_id = ? AND project_status = 0`;

    const [projectRows] = await connection.query(checkProjectSql, [
      infoObject.projectId,
    ]);

    if (projectRows.length === 0) {
      return {
        status: 1,
        message: "generateprojectname fail",
        data: {
          error: "项目不存在或已被删除",
        },
      };
    }

    // 使用 core_concept 作为项目名称（AI 已经根据核心概念生成了名称）
    const newProjectName = coreConcept.trim();

    // 更新项目名称
    const updateProjectSql = `UPDATE project_info 
      SET project_name = ? 
      WHERE project_id = ? AND project_status = 0`;

    await connection.query(updateProjectSql, [
      newProjectName,
      infoObject.projectId,
    ]);

    // 记录操作到数据库
    if (infoObject.dialogueId && infoObject.connection) {
      const operationCode = constructOperationCode("generate_project_name", [
        {
          project_id: infoObject.projectId,
          new_project_name: newProjectName,
        },
      ]);
      await recordOperation({
        dialogueId: infoObject.dialogueId,
        operationCode: operationCode,
        operationMethod: "generate_project_name",
        operationStatus: 0,
        connection: infoObject.connection,
      });
    }

    // 构建返回数据
    const responseData = {
      project_id: infoObject.projectId,
      old_project_name: projectRows[0].project_name,
      new_project_name: newProjectName,
    };

    return {
      status: 0,
      message: "generateprojectname success",
      data: responseData,
    };
  } catch (error) {
    recordErrorLog(error, "generateProjectName");
    console.error("[generateProjectName] ❌ 更新项目名称失败:", error.message);
    return {
      status: 1,
      message: "generateprojectname fail",
      data: {
        error: error.message || "更新项目名称时发生未知错误",
      },
    };
  }
}

module.exports = generateProjectName;
