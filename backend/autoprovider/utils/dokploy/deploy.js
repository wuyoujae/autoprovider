/**
 * Dokploy 部署函数
 * 将项目部署到 Dokploy 平台
 */

const DokployClient = require("./client");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const recordOperation = require("../systemAgentLoop/utils/recordOperation");
const { sendMessage } = require("../systemAgentLoop/sseCommunication");
const { getContext } = require("../systemAgentLoop/context");

/**
 * 构建操作记录代码
 */
const constructOperationCode = (functionName, params) => {
  return {
    functionName,
    params,
  };
};

/**
 * 读取 Dockerfile 内容
 */
const readDockerfile = async (projectRoot) => {
  const dockerfilePath = path.join(projectRoot, "Dockerfile");
  try {
    await fs.access(dockerfilePath);
    return await fs.readFile(dockerfilePath, "utf-8");
  } catch {
    return null;
  }
};

/**
 * 检测项目类型
 */
const detectProjectType = async (projectRoot) => {
  const packageJsonPath = path.join(projectRoot, "package.json");
  try {
    await fs.access(packageJsonPath);
  } catch {
    return null;
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // 检测前端框架
  if (dependencies.vue || dependencies["@vitejs/plugin-vue"]) {
    return "vue-frontend";
  }
  if (dependencies.react || dependencies["react-dom"]) {
    return "react-frontend";
  }
  if (dependencies.next) {
    return "nextjs";
  }

  // 检测后端框架
  if (dependencies.express) {
    return "express-backend";
  }
  if (dependencies["@nestjs/core"]) {
    return "nestjs-backend";
  }

  return "nodejs";
};

/**
 * 生成默认 Dockerfile（如果不存在）
 */
const generateDefaultDockerfile = async (projectRoot, projectType) => {
  const dockerfilePath = path.join(projectRoot, "Dockerfile");
  try {
    await fs.access(dockerfilePath);
    return null; // 已存在，不生成
  } catch {}

  let dockerfile = "";

  if (projectType === "vue-frontend" || projectType === "react-frontend") {
    // 前端项目 Dockerfile
    dockerfile = `# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
  } else if (projectType === "express-backend" || projectType === "nodejs") {
    // Node.js 后端项目 Dockerfile
    dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]`;
  } else {
    // 通用 Dockerfile
    dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || true
EXPOSE 3000
CMD ["npm", "start"]`;
  }

  await fs.writeFile(dockerfilePath, dockerfile);
  return dockerfile;
};

/**
 * 部署项目到 Dokploy
 * @param {Object} payload - 函数参数对象
 * @param {string} payload.appName - 应用名称（必需）
 * @param {string} payload.environmentId - 环境ID（必需）
 * @param {string} payload.serverId - 服务器ID（可选）
 * @param {string} payload.buildType - 构建类型: "dockerfile" | "nixpacks" | "static"（可选，默认自动检测）
 * @param {Object} payload.env - 环境变量对象（可选）
 * @param {string} payload.description - 应用描述（可选）
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function deployToDokploy(payload = {}, infoObject = {}) {
  try {
    // 参数验证
    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: "项目ID不能为空",
        },
      };
    }

    if (!payload.appName) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: "应用名称 (appName) 不能为空",
        },
      };
    }

    if (!payload.environmentId) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: "环境ID (environmentId) 不能为空",
        },
      };
    }

    // 初始化 Dokploy 客户端
    const client = new DokployClient({
      baseUrl: process.env.DOKPLOY_BASE_URL || "http://165.154.23.73:3000",
      apiKey: process.env.DOKPLOY_API_KEY,
    });

    // 获取项目根目录
    const projectRoot = combyFilePath(infoObject.projectId, "/");

    try {
      await fs.access(projectRoot);
    } catch {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: `项目目录不存在: ${projectRoot}`,
        },
      };
    }

    // SSE 通知部署步骤
    const notifyDeployStep = (step, status = "running", message = "") => {
      try {
        const context = getContext();
        const clientId =
          infoObject?.clientId ||
          infoObject?.sessionId ||
          context?.clientId ||
          "default";

        if (clientId && clientId !== "default") {
          const payload = JSON.stringify({ step, status, message });
          sendMessage(`<deploy>${payload}</deploy>`, {
            clientId,
            event: "message",
          });
        }
      } catch (error) {
        // 静默处理 SSE 消息发送失败
      }
    };

    let applicationId = null;
    let isNewApplication = false;

    // 步骤 1: 检查应用是否已存在（通过 appName 查找）
    notifyDeployStep("check_application", "running", "检查应用是否存在...");
    try {
      // 注意: Dokploy API 可能没有通过 appName 查询的接口
      // 这里假设应用不存在，直接创建新应用
      // 如果需要检查，可能需要先获取环境下的所有应用
      isNewApplication = true;
      notifyDeployStep("check_application", "success", "将创建新应用");
    } catch (error) {
      // 如果检查失败，继续创建新应用
      isNewApplication = true;
      notifyDeployStep(
        "check_application",
        "info",
        "无法检查应用，将创建新应用"
      );
    }

    // 步骤 2: 创建或获取应用
    notifyDeployStep("create_application", "running", "创建应用...");
    try {
      const createResult = await client.createApplication({
        name: payload.appName,
        appName: payload.appName,
        description:
          payload.description || `项目 ${infoObject.projectId} 的部署`,
        environmentId: payload.environmentId,
        serverId: payload.serverId || null,
      });

      applicationId = createResult.data.id || createResult.data.applicationId;
      if (!applicationId) {
        throw new Error("创建应用失败：未返回应用ID");
      }

      notifyDeployStep(
        "create_application",
        "success",
        `应用创建成功，ID: ${applicationId}`
      );
    } catch (error) {
      notifyDeployStep("create_application", "failed", error.message);
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: `创建应用失败: ${error.message}`,
        },
      };
    }

    // 步骤 3: 检测项目类型并配置构建类型
    notifyDeployStep("configure_build", "running", "配置构建类型...");
    try {
      const projectType = await detectProjectType(projectRoot);
      let buildType = payload.buildType;

      // 如果没有指定构建类型，自动检测
      if (!buildType) {
        if (
          projectType === "vue-frontend" ||
          projectType === "react-frontend"
        ) {
          // 检查是否有 dist 目录或构建脚本
          const packageJsonPath = path.join(projectRoot, "package.json");
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, "utf-8")
            );
            if (packageJson.scripts && packageJson.scripts.build) {
              buildType = "static"; // 静态网站
            } else {
              buildType = "dockerfile";
            }
          } else {
            buildType = "dockerfile";
          }
        } else {
          buildType = "dockerfile";
        }
      }

      // 读取或生成 Dockerfile
      let dockerfile = await readDockerfile(projectRoot);
      if (!dockerfile && buildType === "dockerfile") {
        await generateDefaultDockerfile(projectRoot, projectType);
        dockerfile = await readDockerfile(projectRoot);
      }

      const buildConfig = {
        applicationId,
        buildType,
        dockerContextPath: "./",
        dockerBuildStage: null,
      };

      if (buildType === "dockerfile" && dockerfile) {
        buildConfig.dockerfile = dockerfile;
      }

      if (buildType === "static") {
        // 检测发布目录
        const packageJsonPath = path.join(projectRoot, "package.json");
        try {
          await fs.access(packageJsonPath);
          const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, "utf-8")
          );
          // 检查 vite.config 或其他构建配置来确定输出目录
          const distPath = path.join(projectRoot, "dist");
          const buildPath = path.join(projectRoot, "build");
          try {
            await fs.access(distPath);
            buildConfig.publishDirectory = "dist";
          } catch {
            try {
              await fs.access(buildPath);
              buildConfig.publishDirectory = "build";
            } catch {
              buildConfig.publishDirectory = "dist"; // 默认
            }
          }
        } catch {
          // 如果没有 package.json，默认 dist
          buildConfig.publishDirectory = "dist";
        }
        buildConfig.isStaticSpa = true;
      }

      await client.saveBuildType(buildConfig);
      notifyDeployStep(
        "configure_build",
        "success",
        `构建类型配置成功: ${buildType}`
      );
    } catch (error) {
      notifyDeployStep("configure_build", "failed", error.message);
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: `配置构建类型失败: ${error.message}`,
          applicationId, // 返回已创建的应用ID，方便后续清理
        },
      };
    }

    // 步骤 4: 配置环境变量
    if (payload.env && Object.keys(payload.env).length > 0) {
      notifyDeployStep("configure_env", "running", "配置环境变量...");
      try {
        await client.saveEnvironment({
          applicationId,
          env: JSON.stringify(payload.env),
          buildArgs: null,
          buildSecrets: null,
        });
        notifyDeployStep("configure_env", "success", "环境变量配置成功");
      } catch (error) {
        notifyDeployStep("configure_env", "failed", error.message);
      }
    }

    // 步骤 5: 执行部署
    notifyDeployStep("deploy", "running", "开始部署应用...");
    try {
      const deployResult = await client.deployApplication({
        applicationId,
        title: `部署 ${payload.appName}`,
        description:
          payload.description || `项目 ${infoObject.projectId} 的自动部署`,
      });

      notifyDeployStep("deploy", "success", "部署任务已提交");
    } catch (error) {
      notifyDeployStep("deploy", "failed", error.message);
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: `部署失败: ${error.message}`,
          applicationId,
        },
      };
    }

    // 新增步骤 5.1: 部署后立刻触发一次 redeploy，规避 Dokploy 首次不可访问的 bug
    notifyDeployStep(
      "redeploy_after_deploy",
      "running",
      "部署完成，触发一次重新部署..."
    );
    try {
      await client.redeployApplication({
        applicationId,
        title: `Redeploy ${payload.appName}`,
        description: `Auto-redeploy after initial deploy for ${infoObject.projectId}`,
      });
      notifyDeployStep("redeploy_after_deploy", "success", "重新部署已触发");
    } catch (error) {
      // 不阻塞整体结果，但记录状态
      notifyDeployStep(
        "redeploy_after_deploy",
        "failed",
        `重新部署触发失败: ${error.message}`
      );
    }

    // 记录操作到数据库
    if (infoObject.dialogueId && infoObject.connection) {
      const operationCode = constructOperationCode("deployToDokploy", [
        {
          applicationId,
          appName: payload.appName,
          environmentId: payload.environmentId,
        },
      ]);
      await recordOperation({
        dialogueId: infoObject.dialogueId,
        operationCode: `<deploy>dokploy</deploy>`,
        operationMethod: "deployToDokploy",
        operationStatus: 0,
        connection: infoObject.connection,
        operationIndex: 0,
      });
    }

    return {
      status: 0,
      message: "deploy success",
      data: {
        applicationId,
        appName: payload.appName,
        environmentId: payload.environmentId,
        message: "应用已成功部署到 Dokploy",
      },
    };
  } catch (error) {
    return {
      status: 1,
      message: "deploy fail",
      data: {
        error: error.message || "部署时发生未知错误",
      },
    };
  }
}

module.exports = deployToDokploy;
