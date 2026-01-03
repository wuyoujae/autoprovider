const fs = require("fs/promises");
const path = require("path");
const util = require("util");
const https = require("https");
const { exec } = require("child_process");

const pool = require("../../db");
const { setProjectDeletedFlag } = require("../../db/redis");
const recordErrorLog = require("../recordErrorLog");
const getProjectsBasePath = require("../getProjectsBasePath");
const DokployClient = require("../dokploy/client");

const execAsync = util.promisify(exec);

const DOCKER_REGISTRY =
  process.env.DOCKER_REGISTRY_URL || "docker.io/autoprovider";
const IS_DOCKER_HUB = DOCKER_REGISTRY.startsWith("docker.io/");

/**
 * 执行 shell 命令（失败不抛异常）
 */
const safeExec = async (command, options = {}) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000,
      ...options,
    });
    return {
      success: true,
      stdout: stdout?.toString() || "",
      stderr: stderr?.toString() || "",
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || error.message,
      code: error.code,
    };
  }
};

/**
 * 发送 Docker Hub 请求
 */
const requestDockerHub = ({ path, method, body, token }) =>
  new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: "hub.docker.com",
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `JWT ${token}` } : {}),
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
        timeout: 20000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          const isJson = raw && raw.trim().startsWith("{");
          const parsed = isJson ? JSON.parse(raw || "{}") : raw;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            return resolve(parsed);
          }
          return reject(
            new Error(
              `Docker Hub API ${method} ${path} failed: ${res.statusCode} ${
                parsed?.detail || parsed || ""
              }`
            )
          );
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Docker Hub API request timeout"));
    });
    if (data) req.write(data);
    req.end();
  });

/**
 * 删除 Docker Hub 远端镜像标签（需要 DOCKER_HUB_USERNAME / DOCKER_HUB_TOKEN）
 */
const removeRemoteDockerHubImage = async ({ repository, tag }) => {
  const username = process.env.DOCKER_HUB_USERNAME;
  const token = process.env.DOCKER_HUB_TOKEN;

  if (!username || !token) {
    return {
      step: "remove_docker_remote",
      status: "skipped",
      detail: "缺少 DOCKER_HUB_USERNAME/DOCKER_HUB_TOKEN，跳过远端镜像删除",
    };
  }

  try {
    // 登录获取 JWT
    const loginResp = await requestDockerHub({
      path: "/v2/users/login",
      method: "POST",
      body: { username, password: token },
    });
    const jwt = loginResp?.token;
    if (!jwt) {
      throw new Error("未从 Docker Hub 登录接口获取到 token");
    }

    // 调用删除标签接口
    await requestDockerHub({
      path: `/v2/repositories/${repository}/tags/${tag}/`,
      method: "DELETE",
      token: jwt,
    });

    return {
      step: "remove_docker_remote",
      status: "success",
      detail: `Docker Hub 标签已删除: ${repository}:${tag}`,
    };
  } catch (error) {
    recordErrorLog(error, "deleteProject - removeRemoteDockerHubImage");
    return {
      step: "remove_docker_remote",
      status: "failed",
      detail: error.message || "删除远端镜像失败",
    };
  }
};

/**
 * 删除本地项目目录
 */
const removeLocalDirectory = async (projectId) => {
  const basePath = getProjectsBasePath();
  const targetPath = path.join(basePath, projectId);
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);

  // 保护：避免误删非 projects 目录
  if (!resolvedTarget.startsWith(resolvedBase)) {
    return {
      step: "remove_local",
      status: "failed",
      detail: `非法路径，拒绝删除: ${resolvedTarget}`,
    };
  }

  try {
    await fs.rm(resolvedTarget, { recursive: true, force: true });
    return {
      step: "remove_local",
      status: "success",
      detail: `本地目录已删除: ${resolvedTarget}`,
    };
  } catch (error) {
    recordErrorLog(error, "deleteProject - removeLocalDirectory");
    return {
      step: "remove_local",
      status: "failed",
      detail: error.message || "删除本地目录失败",
    };
  }
};

/**
 * 删除 Docker 镜像（本地 & 远端）
 */
const removeDockerImages = async (projectId) => {
  const steps = [];
  const imageTag = `${DOCKER_REGISTRY}/${projectId}:latest`;

  // 本地镜像
  try {
    const result = await safeExec(`docker image rm -f "${imageTag}"`);
    if (
      !result.success &&
      (result.stderr.includes("No such image") ||
        result.stderr.includes("is referenced in multiple repositories"))
    ) {
      steps.push({
        step: "remove_docker_local",
        status: "skipped",
        detail: `本地未找到镜像或已被引用: ${imageTag}`,
      });
    } else {
      steps.push({
        step: "remove_docker_local",
        status: result.success ? "success" : "failed",
        detail: result.success
          ? `已删除本地镜像: ${imageTag}`
          : result.stderr || "删除本地镜像失败",
      });
    }
  } catch (error) {
    recordErrorLog(error, "deleteProject - removeDockerImages.local");
    steps.push({
      step: "remove_docker_local",
      status: "failed",
      detail: error.message || "删除本地镜像失败",
    });
  }

  // 远端镜像（仅 Docker Hub）
  if (IS_DOCKER_HUB) {
    const registryPath = DOCKER_REGISTRY.replace(/^docker\.io\//, "");
    const repository = `${registryPath}/${projectId}`;
    const remoteResult = await removeRemoteDockerHubImage({
      repository,
      tag: "latest",
    });
    steps.push(remoteResult);
  } else {
    steps.push({
      step: "remove_docker_remote",
      status: "skipped",
      detail: "非 Docker Hub Registry，跳过远端镜像删除",
    });
  }

  return steps;
};

/**
 * 删除 Dokploy 项目（先删除所有资源，再删除项目）
 * @param {string} dokployProjectId - Dokploy 项目ID
 * @returns {Promise<Array>} 返回多个步骤的结果数组
 */
const removeDokployProject = async (dokployProjectId) => {
  const steps = [];

  if (!dokployProjectId) {
    return [
      {
        step: "remove_dokploy",
        status: "skipped",
        detail: "未找到 dokploy_id，跳过 Dokploy 删除",
      },
    ];
  }

  if (!process.env.DOKPLOY_API_KEY) {
    return [
      {
        step: "remove_dokploy",
        status: "failed",
        detail: "缺少 DOKPLOY_API_KEY，无法删除 Dokploy 项目",
      },
    ];
  }

  try {
    const client = new DokployClient({
      baseUrl: process.env.DOKPLOY_BASE_URL || "http://165.154.23.73:3000",
      apiKey: process.env.DOKPLOY_API_KEY.trim(),
    });

    // 第一步：删除项目下的所有资源（applications、databases、compose 等）
    console.log(
      `[deleteProject] 开始删除 Dokploy 项目资源: ${dokployProjectId}`
    );
    const resourceResult = await client.removeAllProjectResources(
      dokployProjectId
    );

    // 记录资源删除结果
    if (resourceResult.details && resourceResult.details.length > 0) {
      const successCount = resourceResult.details.filter(
        (d) => d.status === "success"
      ).length;
      const failedCount = resourceResult.details.filter(
        (d) => d.status === "failed"
      ).length;

      steps.push({
        step: "remove_dokploy_resources",
        status: resourceResult.success ? "success" : "partial",
        detail: `已删除 ${successCount} 个资源${
          failedCount > 0 ? `，${failedCount} 个失败` : ""
        }`,
        resources: resourceResult.details,
      });
    } else {
      steps.push({
        step: "remove_dokploy_resources",
        status: "skipped",
        detail: "项目无需删除的资源",
      });
    }

    // 第二步：删除项目本身
    console.log(`[deleteProject] 开始删除 Dokploy 项目: ${dokployProjectId}`);
    await client.removeProject(dokployProjectId);

    steps.push({
      step: "remove_dokploy_project",
      status: "success",
      detail: `Dokploy 项目已删除: ${dokployProjectId}`,
    });

    return steps;
  } catch (error) {
    recordErrorLog(error, "deleteProject - removeDokployProject");
    steps.push({
      step: "remove_dokploy_project",
      status: "failed",
      detail: error.message || "删除 Dokploy 项目失败",
    });
    return steps;
  }
};

/**
 * 在 Redis 标记项目删除，避免读取到脏缓存
 */
const markRedisProjectDeleted = async (projectId) => {
  try {
    const redisResp = await setProjectDeletedFlag(projectId);
    return {
      step: "update_redis",
      status: redisResp.success ? "success" : "failed",
      detail: redisResp.success
        ? `Redis 标记删除: ${redisResp.key}`
        : redisResp.detail || "更新 Redis 失败",
    };
  } catch (error) {
    recordErrorLog(error, "deleteProject - markRedisProjectDeleted");
    return {
      step: "update_redis",
      status: "failed",
      detail: error.message || "更新 Redis 失败",
    };
  }
};

/**
 * 删除项目主流程
 * @param {Object} params
 * @param {string} params.projectId
 * @param {string} params.userId
 */
const deleteProject = async ({ projectId, userId }) => {
  const steps = [];

  if (!projectId) {
    return {
      status: 1,
      message: "项目ID不能为空",
      data: { steps },
    };
  }

  if (!userId) {
    return {
      status: 1,
      message: "用户ID不能为空",
      data: { steps },
    };
  }

  // 校验项目是否存在且属于用户
  let projectRow = null;
  try {
    const [rows] = await pool.query(
      `SELECT project_status, dokploy_id FROM project_info WHERE project_id = ? AND author_id = ? LIMIT 1`,
      [projectId, userId]
    );
    if (!rows || rows.length === 0) {
      return {
        status: 1,
        message: "项目不存在或无权操作",
        data: { steps },
      };
    }
    projectRow = rows[0];
    if (projectRow.project_status === 1) {
      return {
        status: 0,
        message: "项目已处于删除状态",
        data: { steps },
      };
    }
  } catch (error) {
    recordErrorLog(error, "deleteProject - queryProject");
    return {
      status: 1,
      message: "查询项目信息失败，请稍后重试",
      data: { steps },
    };
  }

  // 并行处理耗时的网络/镜像任务，避免阻塞本地/数据库/缓存更新
  const dockerPromise = removeDockerImages(projectId).catch((error) => {
    recordErrorLog(error, "deleteProject - removeDockerImages");
    return [
      {
        step: "remove_docker",
        status: "failed",
        detail: error.message || "删除 Docker 镜像失败",
      },
    ];
  });
  // removeDokployProject 现在返回数组
  const dokployPromise = removeDokployProject(projectRow.dokploy_id).catch(
    (error) => {
      recordErrorLog(error, "deleteProject - removeDokployProject");
      return [
        {
          step: "remove_dokploy",
          status: "failed",
          detail: error.message || "删除 Dokploy 项目失败",
        },
      ];
    }
  );

  // 1. 删除本地目录（必须执行）
  steps.push(await removeLocalDirectory(projectId));

  // 2. 更新数据库状态（即便网络任务失败也要尝试）
  try {
    await pool.query(
      `UPDATE project_info 
         SET project_status = 1, project_url = '', dokploy_id = NULL 
       WHERE project_id = ? AND author_id = ?`,
      [projectId, userId]
    );
    steps.push({
      step: "update_db",
      status: "success",
      detail: "数据库状态已更新为删除",
    });
  } catch (error) {
    recordErrorLog(error, "deleteProject - updateProject");
    steps.push({
      step: "update_db",
      status: "failed",
      detail: error.message || "更新数据库失败",
    });
  }

  // 3. 更新 Redis 状态，避免脏缓存
  steps.push(await markRedisProjectDeleted(projectId));

  // 4. 收集异步的 Docker/Dokploy 结果
  const [dockerResult, dokployResult] = await Promise.allSettled([
    dockerPromise,
    dokployPromise,
  ]);

  if (dockerResult.status === "fulfilled") {
    steps.push(...dockerResult.value);
  } else {
    steps.push({
      step: "remove_docker",
      status: "failed",
      detail: dockerResult.reason?.message || "删除 Docker 镜像失败",
    });
  }

  // dokployResult.value 现在是数组
  if (dokployResult.status === "fulfilled") {
    const dokploySteps = dokployResult.value;
    if (Array.isArray(dokploySteps)) {
      steps.push(...dokploySteps);
    } else {
      steps.push(dokploySteps);
    }
  } else {
    steps.push({
      step: "remove_dokploy",
      status: "failed",
      detail: dokployResult.reason?.message || "删除 Dokploy 项目失败",
    });
  }

  const dbStep = steps.find((s) => s.step === "update_db");
  const redisStep = steps.find((s) => s.step === "update_redis");
  const dbOk = dbStep?.status === "success";
  const redisOk = redisStep?.status === "success";

  const status = dbOk && redisOk ? 0 : 1;
  const message =
    status === 0 ? "删除项目成功" : "删除项目部分失败（DB/Redis 未更新）";

  if (status === 1) {
    recordErrorLog(
      new Error(
        `deleteProject status=1, dbOk=${dbOk}, redisOk=${redisOk}, projectId=${projectId}, userId=${userId}`
      ),
      "deleteProject - finalStatus"
    );
  }

  return {
    status,
    message,
    data: { steps },
  };
};

module.exports = {
  deleteProject,
};
