const pool = require("../db");
const recordErrorLog = require("../utils/recordErrorLog");
const { v4: uuidv4 } = require("uuid");
const { deleteProject } = require("../utils/systemWorkLoop/deleteProject");
const { initNewProject } = require("../utils/systemWorkLoop/initNewProject");

// 获取用户项目列表
const getuserprojectlist = async (req, res) => {
  try {
    const user_id = req.body.user_id;

    // 参数验证
    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }

    // 查询用户拥有的未删除项目
    const getProjectListSql = `SELECT 
      project_id,
      author_id,
      project_name,
      project_icon,
      project_url,
      project_status,
      create_time
    FROM project_info 
    WHERE author_id = ? AND project_status = 0
    ORDER BY create_time DESC`;

    const [rows] = await pool.query(getProjectListSql, [user_id]);

    // 处理项目图标，如果为空则使用默认图标
    const projectList = rows.map((project) => {
      return {
        ...project,
        project_icon: project.project_icon || "/static/logo.png", // 如果为空使用默认图标
      };
    });

    res.send({
      status: 0,
      message: "获取项目列表成功",
      data: {
        total: projectList.length,
        projects: projectList,
      },
    });
  } catch (error) {
    recordErrorLog(error, "getuserprojectlist");
    res.send({
      status: 1,
      message: "获取项目列表失败，服务器内部错误",
      data: "fail",
    });
  }
};

// 创建新项目
const createproject = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const { prompt, source_list } = req.body;

    // 参数验证
    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }

    if (!prompt || prompt.trim() === "") {
      return res.send({
        status: 1,
        message: "提示词内容不能为空",
        data: "fail",
      });
    }

    // source_list可以为空，但如果提供必须是数组
    if (source_list && !Array.isArray(source_list)) {
      return res.send({
        status: 1,
        message: "资源列表格式错误",
        data: "fail",
      });
    }

    // 调用 initNewProject 初始化新项目（开源版不做并发限制）
    let infoObject;
    try {
      infoObject = await initNewProject({
        user_id,
        prompt,
        source_list,
      });
    } catch (error) {
      recordErrorLog(error, "createproject - initNewProject");
      return res.send({
        status: 1,
        message: "初始化项目失败，服务器内部错误",
        data: "fail",
      });
    }

    // 第三步：判断项目创建结果
    if (infoObject && infoObject.error) {
      // 项目创建失败
      return res.send({
        status: 1,
        message: infoObject.error || "创建项目失败",
        data: "fail",
      });
    }

    // 返回成功结果
    res.send({
      status: 0,
      message: "创建项目成功",
      data: infoObject,
    });
  } catch (error) {
    recordErrorLog(error, "createproject");
    res.send({
      status: 1,
      message: "创建项目失败，服务器内部错误",
      data: "fail",
    });
  }
};

// 获取项目部署地址
const getProjectUrl = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const { project_id } = req.body;

    // 参数验证
    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }

    if (!project_id) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    // 查询项目信息，验证用户权限
    let projectRows;
    try {
      [projectRows] = await pool.query(
        `SELECT project_url, project_status FROM project_info WHERE project_id = ? AND author_id = ? LIMIT 1`,
        [project_id, user_id]
      );
    } catch (error) {
      recordErrorLog(error, "getProjectUrl - select project");
      return res.send({
        status: 1,
        message: "查询项目信息失败，请稍后重试",
        data: "fail",
      });
    }

    if (!projectRows || projectRows.length === 0) {
      return res.send({
        status: 1,
        message: "项目不存在或无权访问",
        data: "fail",
      });
    }

    const projectInfo = projectRows[0];

    // 检查项目是否已删除
    if (projectInfo.project_status === 1) {
      return res.send({
        status: 1,
        message: "项目已删除",
        data: "fail",
      });
    }

    // 返回项目地址
    res.send({
      status: 0,
      message: "获取项目地址成功",
      data: {
        project_id,
        project_url: projectInfo.project_url || "",
      },
    });
  } catch (error) {
    recordErrorLog(error, "getProjectUrl");
    res.send({
      status: 1,
      message: "获取项目地址失败，服务器内部错误",
      data: "fail",
    });
  }
};

// 冷删除（软删除）项目
const deleteproject = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const { project_id } = req.body;

    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }

    if (!project_id) {
      return res.send({
        status: 1,
        message: "项目ID不能为空",
        data: "fail",
      });
    }

    const deleteResult = await deleteProject({
      projectId: project_id,
      userId: user_id,
    });

    if (deleteResult.status !== 0) {
      return res.send({
        status: 1,
        message: deleteResult.message || "删除项目失败，请稍后重试",
        data: {
          project_id,
          steps: deleteResult.data?.steps || [],
        },
      });
    }

    res.send({
      status: 0,
      message: deleteResult.message || "项目删除成功",
      data: {
        project_id,
        steps: deleteResult.data?.steps || [],
      },
    });

  } catch (error) {
    recordErrorLog(error, "deleteproject");
    res.send({
      status: 1,
      message: "删除项目失败，服务器内部错误",
      data: "fail",
    });
  }
};

module.exports = {
  getuserprojectlist,
  createproject,
  deleteproject,
  getProjectUrl,
};
