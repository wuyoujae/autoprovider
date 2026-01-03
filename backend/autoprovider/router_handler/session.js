const pool = require("../db");
const recordErrorLog = require("../utils/recordErrorLog");
const createSessionUtil = require("../utils/systemWorkLoop/createSession");
const AgentWork = require("../utils/systemAgentLoop/Agent");
const fs = require("fs");
const path = require("path");
const activeSessions = require("../utils/systemAgentLoop/activeSessions");
const combyFilePath = require("../utils/systemAgentLoop/utils/combyFilePath");
const {
  registerClient,
  sendMessage,
  disconnectClient,
} = require("../utils/systemAgentLoop/sseCommunication");
const {
  getWork,
  removeWork,
} = require("../utils/systemWorkLoop/session/workQueue/workQueue");
const handleTerminateLogic = require("../utils/systemWorkLoop/session/terSession");

/**
 * 创建会话接口
 */
const createSession = async (req, res) => {
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

    // 校验项目是否属于该用户
    const checkProjectSql = `SELECT project_id, author_id, project_status 
      FROM project_info 
      WHERE project_id = ? AND project_status = 0`;

    const [projectRows] = await pool.query(checkProjectSql, [project_id]);

    if (projectRows.length === 0) {
      return res.send({
        status: 1,
        message: "项目不存在或已被删除",
        data: "fail",
      });
    }

    // 检查项目是否属于该用户
    if (projectRows[0].author_id !== user_id) {
      return res.send({
        status: 1,
        message: "无权访问该项目",
        data: "fail",
      });
    }

    // 调用创建会话的工具方法
    const result = await createSessionUtil(project_id);

    if (result.status === 0) {
      res.send({
        status: 0,
        message: "创建会话成功",
        data: result.data,
      });
    } else {
      res.send(result);
    }
  } catch (error) {
    recordErrorLog(error, "createSession");
    res.send({
      status: 1,
      message: "创建会话失败，服务器内部错误",
      data: "fail",
    });
  }
};

/**
 * 发起对话接口
 */
const agentChat = async (req, res) => {
  let clientId = null;

  try {
    const user_id = req.body.user_id;
    const { session_id, prompt } = req.body;

    //参数校验
    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }
    if (!session_id) {
      return res.send({
        status: 1,
        message: "会话ID不能为空",
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
    // 注意：这里使用 pool.query 而不是 getConnection，避免连接泄漏
    // 之前的代码获取了 connection 但从未释放，导致连接池耗尽
    try {
      const checkSessionSql = `SELECT 
        s.session_id, 
        s.session_status, 
        s.project_id,
        p.author_id,
        p.project_status
      FROM session_record s
      INNER JOIN project_info p ON s.project_id = p.project_id`;
      const [sessionRows] = await pool.query(checkSessionSql);

      if (sessionRows.length === 0) {
        return res.send({
          status: 1,
          message: "会话不存在、已被删除或项目不存在",
          data: "fail",
        });
      }
    } catch (error) {
      recordErrorLog(error, "checkSession");
      return res.send({
        status: 1,
        message: "校验会话、项目和用户权限失败",
        data: "fail",
      });
    }
    // 使用 session_id 作为 SSE 客户端标识

    // 1. 校验会话、项目和用户权限
    const connection = await pool.getConnection();
    try {
      const checkSessionSql = `SELECT 
        s.session_id, 
        s.session_status, 
        s.project_id,
        p.author_id,
        p.project_status
      FROM session_record s
      INNER JOIN project_info p ON s.project_id = p.project_id
      WHERE s.session_id = ? AND s.session_status = 0 AND p.project_status = 0`;

      const [sessionRows] = await connection.query(checkSessionSql, [
        session_id,
      ]);

      if (sessionRows.length === 0) {
        return res.send({
          status: 1,
          message: "会话不存在、已被删除或项目不存在",
          data: "fail",
        });
      }

      const sessionInfo = sessionRows[0];

      // 检查项目是否属于该用户
      if (sessionInfo.author_id !== user_id) {
        return res.send({
          status: 1,
          message: "无权访问该会话",
          data: "fail",
        });
      }

      // 检查会话是否已经在执行中（防止重复请求）
      if (activeSessions.has(session_id)) {
        return res.send({
          status: 1,
          message: "该会话正在执行中，请等待当前任务完成或终止后再发起新请求",
          data: "fail",
        });
      }

      // 注册 SSE 客户端连接
      clientId = session_id || "default";
      try {
        await registerClient(res, clientId);
      } catch (sseError) {
        // 如果 SSE 注册失败，使用传统方式返回错误
        return res.send({
          status: 1,
          message: "SSE连接初始化失败",
          data: "fail",
        });
      }

      // 3. 构建 infoObject 用于 AgentWork
      // 使用 combyFilePath 统一处理路径，支持环境变量配置（Next.js 全栈项目）
      const projectRootPath = combyFilePath(sessionInfo.project_id, "/");
      const sqlFilePath = combyFilePath(
        sessionInfo.project_id,
        "/lib/db/db.sql"
      );

      // 读取 SQL 文件（如果存在）
      let sqlRecordList = "";
      try {
        if (fs.existsSync(sqlFilePath)) {
          sqlRecordList = fs.readFileSync(sqlFilePath, "utf-8");
        }
      } catch (error) {
        // SQL 文件不存在或读取失败时，使用空字符串
        recordErrorLog(
          `读取 SQL 文件失败: ${sqlFilePath}, ${error.message}`,
          "session.js - agentChat"
        );
      }

      const infoObject = {
        userId: user_id,
        projectId: sessionInfo.project_id,
        sessionId: session_id,
        clientId: clientId, // 添加 clientId 用于 SSE 通信
        newPrompt: prompt,
        filePath: {
          root: projectRootPath,
          sqlRecordList: sqlRecordList,
        },
      };

      sendMessage("<words>正在思考您的任务！</words>", {
        clientId,
        event: "agentChatResponseFlag",
      });

      // 4. 调用 AgentWork（内部会处理对话历史保存和积分扣除）
      // 使用 fire-and-forget 模式，不阻塞当前请求
      // AgentWork 在后台异步执行，通过 SSE 推送进度，完成后自动断开连接
      activeSessions.add(session_id);

      // 先释放路由层的数据库连接，AgentWork 内部会按需获取自己的连接
      connection.release();

      // 不使用 await，让 AgentWork 在后台运行
      // 使用 setImmediate 确保当前事件循环完成后再启动，避免阻塞
      setImmediate(() => {
        AgentWork(infoObject)
          .then(() => {
            // AgentWork 完成，断开 SSE 连接
            disconnectClient(clientId, "任务完成");
          })
          .catch((error) => {
            // AgentWork 发生错误
            recordErrorLog(error, "agentChat - AgentWork background");
            sendMessage(
              JSON.stringify({
                status: 1,
                message: "AI工作执行失败",
                data: error.message || "未知错误",
              }),
              { clientId, event: "error" }
            );
            disconnectClient(clientId, "任务执行失败");
          })
          .finally(() => {
            // 无论成功失败，都从活跃会话中移除
            activeSessions.delete(session_id);
          });
      });

      // 路由函数立即返回，不再等待 AgentWork 完成
      // SSE 连接保持打开，由 AgentWork 完成后断开
      return;
    } finally {
      // 注意：连接已在上面提前释放，这里不需要再释放
      // 但为了安全起见，检查连接状态
      if (connection && !connection._pool) {
        // 连接尚未释放，进行释放
        connection.release();
      }
    }
  } catch (error) {
    recordErrorLog(error, "agentChat");

    // 发送错误消息
    if (clientId) {
      sendMessage(
        JSON.stringify({
          status: 1,
          message: "发起对话失败，服务器内部错误",
          data: "fail",
        }),
        { clientId, event: "error" }
      );
      disconnectClient(clientId, "服务器内部错误");
    } else {
      // 如果 SSE 未初始化，使用传统方式返回
      res.send({
        status: 1,
        message: "发起对话失败，服务器内部错误",
        data: "fail",
      });
    }
  }
};

/**
 * 获取会话列表接口
 */
const getSessionList = async (req, res) => {
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

    // 校验项目是否属于该用户
    const checkProjectSql = `SELECT project_id, author_id, project_status 
      FROM project_info 
      WHERE project_id = ? AND project_status = 0`;

    const [projectRows] = await pool.query(checkProjectSql, [project_id]);

    if (projectRows.length === 0) {
      return res.send({
        status: 1,
        message: "项目不存在或已被删除",
        data: "fail",
      });
    }

    // 检查项目是否属于该用户
    if (projectRows[0].author_id !== user_id) {
      return res.send({
        status: 1,
        message: "无权访问该项目",
        data: "fail",
      });
    }

    // 查询该项目的会话列表（只查询未删除的会话）
    const getSessionListSql = `SELECT 
      session_id,
      project_id,
      session_title,
      session_status,
      create_time
    FROM session_record 
    WHERE project_id = ? AND session_status = 0
    ORDER BY create_time DESC`;

    const [sessionRows] = await pool.query(getSessionListSql, [project_id]);

    res.send({
      status: 0,
      message: "获取会话列表成功",
      data: {
        total: sessionRows.length,
        sessions: sessionRows,
      },
    });
  } catch (error) {
    recordErrorLog(error, "getSessionList");
    res.send({
      status: 1,
      message: "获取会话列表失败，服务器内部错误",
      data: "fail",
    });
  }
};

/**
 * 获取会话的所有对话记录接口
 */
const getSessionOperations = async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const { session_id } = req.body;

    // 参数验证
    if (!user_id) {
      return res.send({
        status: 1,
        message: "用户ID不能为空",
        data: "fail",
      });
    }

    if (!session_id) {
      return res.send({
        status: 1,
        message: "会话ID不能为空",
        data: "fail",
      });
    }

    // 校验会话、项目和用户权限
    const connection = await pool.getConnection();
    try {
      const checkSessionSql = `SELECT 
        s.session_id, 
        s.session_status, 
        s.project_id,
        p.author_id,
        p.project_status
      FROM session_record s
      INNER JOIN project_info p ON s.project_id = p.project_id
      WHERE s.session_id = ? AND s.session_status = 0 AND p.project_status = 0`;

      const [sessionRows] = await connection.query(checkSessionSql, [
        session_id,
      ]);

      if (sessionRows.length === 0) {
        return res.send({
          status: 1,
          message: "会话不存在、已被删除或项目不存在",
          data: "fail",
        });
      }

      const sessionInfo = sessionRows[0];

      // 检查项目是否属于该用户
      if (sessionInfo.author_id !== user_id) {
        return res.send({
          status: 1,
          message: "无权访问该会话",
          data: "fail",
        });
      }

      // 调用工具方法获取work维度的操作记录
      const getSessionOperationsUtil = require("../utils/systemWorkLoop/session/getSessionOperations");
      const result = await getSessionOperationsUtil(session_id, connection);

      // 直接返回result（已经经过operationHistoryMatch处理）
      res.send(result);
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (error) {
    recordErrorLog(error, "getSessionDialogs");
    res.send({
      status: 1,
      message: "获取会话对话记录失败，服务器内部错误",
      data: "fail",
    });
  }
};

/**
 * 重连会话接口
 */
const reconnectSession = async (req, res) => {
  const { session_id, user_id } = req.body;

  if (!session_id) {
    return res.send({
      status: 1,
      message: "会话ID不能为空",
      data: "fail",
    });
  }

  // 校验会话、项目和用户权限
  try {
    const connection = await pool.getConnection();
    try {
      const checkSessionSql = `SELECT
            s.session_id,
            s.session_status,
            s.project_id,
            p.author_id,
            p.project_status
          FROM session_record s
          INNER JOIN project_info p ON s.project_id = p.project_id
          WHERE s.session_id = ? AND s.session_status = 0 AND p.project_status = 0`;

      const [sessionRows] = await connection.query(checkSessionSql, [
        session_id,
      ]);

      if (sessionRows.length === 0) {
        return res.send({
          status: 1,
          message: "会话不存在、已被删除或项目不存在",
          data: "fail",
        });
      }

      const sessionInfo = sessionRows[0];
      // 检查项目是否属于该用户
      if (sessionInfo.author_id !== user_id) {
        return res.send({
          status: 1,
          message: "无权访问该会话",
          data: "fail",
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    recordErrorLog(error, "reconnectSession");
    return res.send({
      status: 1,
      message: "校验会话失败",
      data: "fail",
    });
  }

  const workControl = getWork(session_id);
  if (workControl && !workControl.isStopped) {
    try {
      await registerClient(res, session_id);
      // 成功重新连接，保持连接开启
    } catch (error) {
      return res.send({
        status: 1,
        message: "重连失败",
        data: "fail",
      });
    }
  } else {
    res.send({
      status: 0,
      message: "当前无正在进行的任务",
      data: "last work is done",
    });
  }
};

/**
 * 终止会话接口
 */
const terminateSession = async (req, res) => {
  const { session_id, user_id } = req.body;

  if (!session_id) {
    return res.send({
      status: 1,
      message: "会话ID不能为空",
      data: "fail",
    });
  }

  // 校验会话、项目和用户权限
  try {
    const connection = await pool.getConnection();
    try {
      const checkSessionSql = `SELECT
            s.session_id,
            s.session_status,
            s.project_id,
            p.author_id,
            p.project_status
          FROM session_record s
          INNER JOIN project_info p ON s.project_id = p.project_id
          WHERE s.session_id = ? AND s.session_status = 0 AND p.project_status = 0`;

      const [sessionRows] = await connection.query(checkSessionSql, [
        session_id,
      ]);

      if (sessionRows.length === 0) {
        return res.send({
          status: 1,
          message: "会话不存在、已被删除或项目不存在",
          data: "fail",
        });
      }

      const sessionInfo = sessionRows[0];
      // 检查项目是否属于该用户
      if (sessionInfo.author_id !== user_id) {
        return res.send({
          status: 1,
          message: "无权访问该会话",
          data: "fail",
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    recordErrorLog(error, "terminateSession");
    return res.send({
      status: 1,
      message: "校验会话失败",
      data: "fail",
    });
  }

  // 获取任务控制对象
  const workControl = getWork(session_id);
  if (workControl) {
    // 设置停止标志
    workControl.isStopped = true;

    // 若存在上游流式请求，主动中断
    if (
      workControl.abortController &&
      typeof workControl.abortController.abort === "function"
    ) {
      console.log(
        `[terminateSession] aborting upstream stream for session ${session_id}`
      );
      workControl.abortController.abort();
    }

    // 处理终止时的消息逻辑
    if (workControl.workId) {
      await handleTerminateLogic(workControl.workId);
    }

    // 主动断开 SSE 连接，避免连接占用
    console.log(
      `[terminateSession] disconnecting SSE client for session ${session_id}`
    );
    disconnectClient(session_id, "会话已被用户终止");

    // 也可以选择在这里断开连接，或者等待循环自己退出
    // disconnectClient(session_id, "会话已被用户终止"); // 可选：立即断开连接
    res.send({
      status: 0,
      message: "会话终止指令已发送",
      data: "success",
    });
  } else {
    res.send({
      status: 0,
      message: "当前无正在进行的任务",
      data: "success",
    });
  }
};

module.exports = {
  createSession,
  agentChat,
  getSessionList,
  getSessionOperations,
  reconnectSession,
  terminateSession,
};
