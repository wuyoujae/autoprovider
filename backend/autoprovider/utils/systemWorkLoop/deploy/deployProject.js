/**
 * 项目部署模块
 * 将项目部署到 Dokploy 平台
 *
 * 注意：当前实现仅创建 Dokploy Application，不进行实际的 Docker 构建和部署。
 * 完整的 Docker 部署需要在 Dokploy 服务器上配置 Docker Registry。
 */

const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const DokployClient = require("../../dokploy/client");
const dockerControl = require("./dockerContral");
const recordErrorLog = require("../../recordErrorLog");
const getProjectsBasePath = require("../../getProjectsBasePath");

// Docker Registry 配置（从环境变量读取或使用默认值）
// 支持 Docker Hub (docker.io/username) 或 GitHub Container Registry (ghcr.io/username)
const DOCKER_REGISTRY =
  process.env.DOCKER_REGISTRY_URL || "docker.io/autoprovider";
const DOKPLOY_SERVER_IP = process.env.DOKPLOY_SERVER_IP || "165.154.23.73";

// 是否启用 Docker 构建
const ENABLE_DOCKER_BUILD = process.env.ENABLE_DOCKER_BUILD === "true";

// 判断是否使用 Docker Hub
const isDockerHub = DOCKER_REGISTRY.startsWith("docker.io/");

/**
 * 部署项目到 Dokploy
 * @param {Object} params - 部署参数
 * @param {string} params.projectId - 项目ID（本地项目ID）
 * @param {string} params.dokployProjectId - Dokploy 项目ID
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function deployProject(params = {}) {
  try {
    console.log(`\n[DEPLOY] 📋 deployProject 开始`);
    console.log(`[DEPLOY]    项目ID: ${params.projectId}`);
    console.log(`[DEPLOY]    Dokploy项目ID: ${params.dokployProjectId}`);
    console.log(
      `[DEPLOY]    Docker构建: ${ENABLE_DOCKER_BUILD ? "启用" : "禁用"}`
    );
    console.log(`[DEPLOY]    Registry: ${DOCKER_REGISTRY}`);

    // 参数验证
    if (!params.projectId) {
      return {
        status: 1,
        message: "部署失败",
        data: { error: "项目ID不能为空" },
      };
    }

    if (!params.dokployProjectId) {
      return {
        status: 1,
        message: "部署失败",
        data: { error: "Dokploy 项目ID不能为空" },
      };
    }

    // 初始化 Dokploy 客户端
    const dokployApiKey = process.env.DOKPLOY_API_KEY;
    if (!dokployApiKey) {
      return {
        status: 1,
        message: "部署失败",
        data: { error: "DOKPLOY_API_KEY 未配置" },
      };
    }

    const client = new DokployClient({
      baseUrl: process.env.DOKPLOY_BASE_URL || "http://165.154.23.73:3000",
      apiKey: dokployApiKey.trim(),
    });

    // 获取项目路径
    const projectsBasePath = getProjectsBasePath();
    const projectPath = path.join(projectsBasePath, params.projectId);

    // 异步检查项目目录
    try {
      await fs.access(projectPath);
    } catch {
      return {
        status: 1,
        message: "部署失败",
        data: { error: `项目目录不存在: ${projectPath}` },
      };
    }

    const appPath = path.join(projectPath, "app");
    let hasApp = false;
    try {
      const statApp = await fs.stat(appPath);
      hasApp = statApp.isDirectory();
    } catch {
      hasApp = false;
    }

    console.log(`[DEPLOY]    App: ${hasApp ? "存在" : "不存在"}`);

    if (!hasApp) {
      return {
        status: 1,
        message: "部署失败",
        data: { error: "项目中未找到 app 目录（Next.js 单体项目）" },
      };
    }

    // 步骤 1: 获取 Environment（创建项目时已自动创建 production 环境）
    // 等待 1 秒，避免与 initNewProject 中的 createProject 请求冲突
    console.log(`\n[DEPLOY] ⏳ 等待 Dokploy 服务就绪...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`[DEPLOY] 🔍 获取 Dokploy Environment...`);
    let environmentId = null;
    try {
      const envResult = await client.getEnvironmentsByProjectId(
        params.dokployProjectId
      );

      if (
        envResult.status === 200 &&
        envResult.data &&
        envResult.data.length > 0
      ) {
        // 使用第一个 Environment
        environmentId = envResult.data[0].environmentId;
        console.log(`[DEPLOY] ✅ 找到环境: ${environmentId}`);
      } else {
        // 如果没有环境，创建一个
        console.log(`[DEPLOY]    未找到环境，创建新环境...`);
        const createEnvResult = await client.createEnvironment({
          name: "production",
          description: "Production environment",
          projectId: params.dokployProjectId,
        });

        if (createEnvResult.status === 200 && createEnvResult.data) {
          // 解析嵌套结构
          environmentId =
            createEnvResult.data?.environment?.environmentId ||
            createEnvResult.data?.environmentId ||
            createEnvResult.data?.id;
          console.log(`[DEPLOY] ✅ 环境创建成功: ${environmentId}`);
        }
      }
    } catch (error) {
      // 详细格式化错误信息
      const errorMessage =
        error?.message ||
        (typeof error === "object" ? JSON.stringify(error) : String(error));
      console.log(`[DEPLOY] ❌ 获取环境失败:`);
      console.log(
        `[DEPLOY]    错误类型: ${error?.constructor?.name || typeof error}`
      );
      console.log(`[DEPLOY]    错误信息: ${errorMessage}`);
      if (error?.status) console.log(`[DEPLOY]    状态码: ${error.status}`);
      if (error?.data)
        console.log(`[DEPLOY]    响应数据: ${JSON.stringify(error.data)}`);
      recordErrorLog(error, "deployProject - getOrCreateEnvironment");
      return {
        status: 1,
        message: "部署失败",
        data: { error: `获取或创建环境失败: ${errorMessage}` },
      };
    }

    if (!environmentId) {
      return {
        status: 1,
        message: "部署失败",
        data: { error: "无法获取或创建 Environment" },
      };
    }

    const deployResults = {
      app: null,
    };

    // 步骤 2: 部署 App (Next.js 单体)
    console.log(`\n[DEPLOY] 🚀 部署 App (Next.js)...`);
    const appResult = await deployService({
      client,
      projectId: params.projectId,
      dokployProjectId: params.dokployProjectId,
      environmentId,
      servicePath: appPath,
      projectRoot: projectPath,
      // 服务名直接用 projectId，避免多余后缀
      serviceName: params.projectId,
      port: 3000,
    });
    deployResults.app = appResult;

    // 检查部署结果
    const hasError = deployResults.app && deployResults.app.status !== 0;

    console.log(`\n[DEPLOY] 📊 部署结果汇总:`);
    console.log(
      `[DEPLOY]    App: ${
        deployResults.app?.status === 0 ? "✅ 成功" : "❌ 失败"
      }`
    );

    if (hasError) {
      // 将服务的详细错误向上透传，避免只有笼统的“部署部分失败”
      const errorMessages = [];
      for (const [serviceName, result] of Object.entries(deployResults)) {
        if (!result || result.status === 0) continue;
        const detail = result.data?.error || result.message || "未知错误";
        errorMessages.push(`[${serviceName}] ${detail}`);
      }

      const combinedError =
        errorMessages.length > 0
          ? errorMessages.join(" | ")
          : "部署失败（未提供详细错误）";

      return {
        status: 1,
        message: combinedError, // message 直接携带详细错误
        data: {
          ...deployResults,
          error: combinedError, // 顶层 data.error 也携带详细错误，便于上层直接取用
          errors: errorMessages,
        },
      };
    }

    return {
      status: 0,
      message: "部署成功",
      data: deployResults,
    };
  } catch (error) {
    recordErrorLog(error, "deployProject");
    return {
      status: 1,
      message: "部署失败",
      data: { error: error.message || "未知错误" },
    };
  }
}

/**
 * 部署单个服务（frontend 或 backend）
 * @private
 */
async function deployService(params) {
  const {
    client,
    projectId,
    dokployProjectId,
    environmentId,
    servicePath,
    projectRoot, // 新增：项目根目录（用于查找根级 Dockerfile）
    serviceName,
    port,
  } = params;

  const logPrefix = `[DEPLOY:${serviceName.toUpperCase()}]`;

  try {
    // 步骤 1: 创建 Dokploy Application
    console.log(`${logPrefix} 📌 步骤 1: 创建 Dokploy Application...`);
    const appName = projectId;
    let applicationId = null;

    try {
      const createAppResult = await client.createApplication({
        name: serviceName,
        appName: appName,
        description: `Project ${projectId}`,
        environmentId: environmentId,
      });

      if (createAppResult.status === 200 && createAppResult.data) {
        applicationId =
          createAppResult.data.applicationId || createAppResult.data.id;
        console.log(`${logPrefix} ✅ Application 创建成功: ${applicationId}`);
      } else {
        console.log(
          `${logPrefix} ❌ Application 创建失败: ${JSON.stringify(
            createAppResult
          )}`
        );
        recordErrorLog(
          `createApplication 失败: ${JSON.stringify(createAppResult)}`,
          `deployService - ${serviceName}`
        );
      }
    } catch (error) {
      console.log(`${logPrefix} ❌ Application 创建异常: ${error.message}`);
      recordErrorLog(
        error,
        `deployService - createApplication - ${serviceName}`
      );
      return {
        status: 1,
        message: `${serviceName} 创建应用失败`,
        data: { error: error.message },
      };
    }

    if (!applicationId) {
      return {
        status: 1,
        message: `${serviceName} 创建应用失败`,
        data: { error: "未返回 applicationId" },
      };
    }

    // 如果启用了 Docker 构建，执行构建和推送
    let imageTag = null;
    if (ENABLE_DOCKER_BUILD) {
      // 优先使用服务路径下的 Dockerfile，找不到则回退到项目根目录
      // 同时确定 build context 路径：Dockerfile 在哪，context 就用哪
      let dockerfilePath = path.join(servicePath, "Dockerfile");
      let buildContextPath = servicePath;

      // 优先使用服务路径下的 Dockerfile，找不到则回退到项目根目录
      try {
        await fs.access(dockerfilePath);
      } catch {
        if (projectRoot) {
          const rootDockerfile = path.join(projectRoot, "Dockerfile");
          try {
            await fs.access(rootDockerfile);
            dockerfilePath = rootDockerfile;
            buildContextPath = projectRoot; // Dockerfile 在根目录，context 也用根目录
          } catch {
            // rootDockerfile 不存在，保持原 dockerfilePath
          }
        }
      }

      let dockerfileExists = true;
      try {
        await fs.access(dockerfilePath);
      } catch {
        dockerfileExists = false;
      }

      if (!dockerfileExists) {
        console.log(`${logPrefix} ⚠️ Dockerfile 不存在: ${dockerfilePath}`);
        recordErrorLog(
          `Dockerfile 不存在: ${dockerfilePath}`,
          `deployService - ${serviceName}`
        );
        // 不阻塞，Application 已创建成功
      } else {
        imageTag = `${DOCKER_REGISTRY}/${projectId}:latest`;

        // ----------------------------------------------------------------
        // 新增步骤：宿主机预构建 Next.js（生成 .next/standalone）
        // 只要 projectRoot 存在就执行预构建（Next.js 单体项目）
        // ----------------------------------------------------------------
        if (projectRoot) {
          console.log(
            `${logPrefix} 🏗️ 步骤 1.5: 预构建项目 (npm ci && npm run build)...`
          );
          console.log(`${logPrefix}    工作目录: ${projectRoot}`);
          try {
            const cwd = projectRoot;

            console.log(`${logPrefix}    正在安装依赖 (npm ci)...`);
            const { stdout: ciStdout, stderr: ciStderr } = await execAsync(
              "npm ci --legacy-peer-deps",
              {
                cwd,
                timeout: 600000,
                maxBuffer: 10 * 1024 * 1024,
              }
            );
            if (ciStdout) console.log(ciStdout.toString());
            if (ciStderr) console.log(ciStderr.toString());
            console.log(`${logPrefix}    ✅ 依赖安装完成`);

            console.log(`${logPrefix}    正在构建项目 (npm run build)...`);
            const { stdout: buildStdout, stderr: buildStderr } =
              await execAsync("npm run build", {
                cwd,
                timeout: 600000,
                maxBuffer: 10 * 1024 * 1024,
              });
            if (buildStdout) console.log(buildStdout.toString());
            if (buildStderr) console.log(buildStderr.toString());
            console.log(`${logPrefix} ✅ 预构建完成`);
          } catch (buildErr) {
            // 捕获 stdout/stderr，便于前端和 AI 精确定位编译错误
            const stdout = buildErr.stdout ? buildErr.stdout.toString() : "";
            const stderr = buildErr.stderr ? buildErr.stderr.toString() : "";
            const detailedMsg = `${
              buildErr.message || "预构建失败"
            }\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;

            console.log(`${logPrefix} ❌ 预构建失败:`);
            console.log(detailedMsg);
            recordErrorLog(
              detailedMsg,
              `deployService - prebuild - ${serviceName}`
            );
            return {
              status: 1,
              message: "预构建失败",
              data: { error: detailedMsg },
            };
          }
        }

        // ----------------------------------------------------------------
        // 新增步骤：在宿主机执行构建 (仅前端)
        // ----------------------------------------------------------------
        if (serviceName === "frontend") {
          console.log(
            `${logPrefix} 🔨 步骤 1.5: 本地构建前端 (npm run build)...`
          );
          try {
            // 1. 安装依赖
            console.log(`${logPrefix}    正在安装依赖...`);
            const { stdout: installStdout, stderr: installStderr } =
              await execAsync("npm install", {
                cwd: servicePath,
                timeout: 300000, // 5分钟超时
                maxBuffer: 10 * 1024 * 1024,
              });
            if (installStdout) console.log(installStdout.toString());
            if (installStderr) console.log(installStderr.toString());

            // 2. 构建项目
            console.log(`${logPrefix}    正在构建项目...`);
            const { stdout: feBuildStdout, stderr: feBuildStderr } =
              await execAsync("npm run build", {
                cwd: servicePath,
                timeout: 300000,
                maxBuffer: 10 * 1024 * 1024,
              });
            if (feBuildStdout) console.log(feBuildStdout.toString());
            if (feBuildStderr) console.log(feBuildStderr.toString());

            // 3. 验证 dist 目录
            const distPath = path.join(servicePath, "dist");
            try {
              await fs.access(distPath);
              const distEntries = await fs.readdir(distPath);
              if (distEntries.length > 0) {
                console.log(`${logPrefix} ✅ 本地构建成功，dist 目录已生成`);
              } else {
                throw new Error("构建完成后 dist 目录不存在或为空");
              }
            } catch {
              throw new Error("构建完成后 dist 目录不存在或为空");
            }
          } catch (buildError) {
            // Capture stdout/stderr for detailed error reporting
            const stdout = buildError.stdout
              ? buildError.stdout.toString()
              : "";
            const stderr = buildError.stderr
              ? buildError.stderr.toString()
              : "";
            const detailedMsg = `${buildError.message}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;

            console.log(`${logPrefix} ❌ 本地构建失败:`);
            console.log(detailedMsg);

            recordErrorLog(
              `本地构建失败: ${detailedMsg}`,
              `deployService - localBuild - ${serviceName}`
            );

            // Throw new error with detailed message so it propagates
            throw new Error(detailedMsg);
          }
        }
        // ----------------------------------------------------------------

        // 步骤 2: 构建 Docker 镜像
        console.log(`${logPrefix} 🔨 步骤 2: 构建 Docker 镜像...`);
        console.log(`${logPrefix}    镜像标签: ${imageTag}`);
        console.log(`${logPrefix}    构建路径: ${buildContextPath}`);
        console.log(`${logPrefix}    Dockerfile: ${dockerfilePath}`);

        const buildStart = Date.now();
        const buildResult = await dockerControl.buildImage({
          tag: imageTag,
          contextPath: buildContextPath,
          dockerfile: dockerfilePath,
        });

        if (buildResult.status !== 0) {
          console.log(
            `${logPrefix} ❌ 镜像构建失败 (${(
              (Date.now() - buildStart) /
              1000
            ).toFixed(1)}s)`
          );
          console.log(
            `${logPrefix}    错误: ${buildResult.data?.error?.substring(
              0,
              200
            )}...`
          );
          recordErrorLog(
            `镜像构建失败: ${buildResult.data?.error}`,
            `deployService - buildImage - ${serviceName}`
          );
          // 不阻塞
        } else {
          console.log(
            `${logPrefix} ✅ 镜像构建成功 (${(
              (Date.now() - buildStart) /
              1000
            ).toFixed(1)}s)`
          );

          // 步骤 3: 推送镜像到 Registry
          console.log(`${logPrefix} 📤 步骤 3: 推送镜像到 Docker Hub...`);
          const pushStart = Date.now();
          const pushResult = await dockerControl.pushImage({ tag: imageTag });

          if (pushResult.status !== 0) {
            console.log(
              `${logPrefix} ❌ 镜像推送失败 (${(
                (Date.now() - pushStart) /
                1000
              ).toFixed(1)}s)`
            );
            console.log(`${logPrefix}    错误: ${pushResult.data?.error}`);
            recordErrorLog(
              `镜像推送失败: ${pushResult.data?.error}`,
              `deployService - pushImage - ${serviceName}`
            );
          } else {
            console.log(
              `${logPrefix} ✅ 镜像推送成功 (${(
                (Date.now() - pushStart) /
                1000
              ).toFixed(1)}s)`
            );

            // 步骤 4: 配置应用使用 Docker 镜像（使用 saveDockerProvider API）
            console.log(`${logPrefix} ⚙️ 步骤 4: 配置 Docker Provider...`);
            console.log(`${logPrefix}    镜像地址: ${imageTag}`);

            try {
              // 使用 saveDockerProvider API 配置 Docker 镜像
              // 根据文档，只需要 dockerImage 和 applicationId 两个必填参数
              const dockerProviderResult = await client.saveDockerProvider({
                dockerImage: imageTag,
                applicationId: applicationId,
              });

              if (dockerProviderResult.status === 200) {
                console.log(`${logPrefix} ✅ Docker Provider 配置成功`);

                // 新增：设置环境变量 PORT=3800 (适用于前端)，确保 Dokploy 能正确识别
                // 如果 Dokploy 支持通过环境变量自动配置端口，这将解决 404 问题
                if (serviceName === "frontend") {
                  console.log(`${logPrefix} 🔧 配置环境变量 PORT=${port}...`);
                  try {
                    // 尝试调用 saveEnvironment (如果 client 中有这个方法)
                    // 这里假设 DokployClient 应该有类似的方法，如果没有，可能需要查阅文档或源码
                    if (typeof client.saveEnvironment === "function") {
                      await client.saveEnvironment({
                        applicationId: applicationId,
                        env: JSON.stringify({ PORT: String(port) }),
                      });
                      console.log(`${logPrefix} ✅ 环境变量配置成功`);
                    } else {
                      // 临时方案：如果客户端没有封装，就跳过，依赖我们之前的手动端口修改
                      console.log(
                        `${logPrefix} ⚠️ DokployClient.saveEnvironment 未定义，跳过环境变量配置`
                      );
                    }
                  } catch (envError) {
                    console.log(
                      `${logPrefix} ⚠️ 环境变量配置失败 (非致命): ${envError.message}`
                    );
                  }
                }
              } else {
                console.log(
                  `${logPrefix} ❌ Docker Provider 配置失败: ${JSON.stringify(
                    dockerProviderResult
                  )}`
                );
                recordErrorLog(
                  `saveDockerProvider 失败: ${JSON.stringify(
                    dockerProviderResult
                  )}`,
                  `deployService - saveDockerProvider - ${serviceName}`
                );
              }
            } catch (error) {
              console.log(
                `${logPrefix} ❌ Docker Provider 配置异常: ${error.message}`
              );
              recordErrorLog(
                error.message || JSON.stringify(error),
                `deployService - saveDockerProvider - ${serviceName}`
              );
            }

            // 步骤 5: 触发部署
            console.log(`${logPrefix} 🚀 步骤 5: 触发 Dokploy 部署...`);
            try {
              await client.deployApplication({
                applicationId: applicationId,
                title: "Initial deployment",
                description: `Deploying ${serviceName} for project ${projectId}`,
              });
              console.log(`${logPrefix} ✅ 部署已触发`);

              // 同步等待部署完成 (轮询状态)
              console.log(`${logPrefix} ⏳ 同步等待部署完成 (Max 5min)...`);
              let isRunning = false;
              let redeployAttempts = 0;
              const maxRedeployAttempts = 3;
              // 轮询 60 次，每次 5 秒
              for (let i = 0; i < 60; i++) {
                await new Promise((resolve) => setTimeout(resolve, 5000));

                try {
                  const appInfo = await client.getApplication(applicationId);
                  // 尝试获取状态字段，优先匹配 applicationStatus
                  const appData = appInfo.data || {};
                  const currentStatus =
                    appData.applicationStatus || appData.status;

                  console.log(
                    `${logPrefix}    [${i + 1}/60] 当前状态: ${currentStatus}`
                  );

                  if (currentStatus === "RUNNING" || currentStatus === "done") {
                    isRunning = true;
                    console.log(
                      `${logPrefix} ✅ 服务已成功运行 (${currentStatus})`
                    );
                    break;
                  } else if (
                    ["ERROR", "CRASHED", "BUILD_ERROR"].includes(currentStatus)
                  ) {
                    throw new Error(`部署失败，状态: ${currentStatus}`);
                  } else {
                    // 每检测 10 次仍未 RUNNING，则尝试重新触发部署（最多 3 次）
                    const shouldRetry =
                      (i + 1) % 10 === 0 &&
                      !isRunning &&
                      redeployAttempts < maxRedeployAttempts;
                    if (shouldRetry) {
                      redeployAttempts += 1;
                      console.log(
                        `${logPrefix} 🔁 第 ${redeployAttempts} 次重试部署（状态: ${currentStatus}，poll: ${
                          i + 1
                        }/60）`
                      );
                      await client.deployApplication({
                        applicationId: applicationId,
                        title: `Redeploy attempt ${redeployAttempts}`,
                        description: `Redeploying ${serviceName} for project ${projectId} (attempt ${redeployAttempts})`,
                      });
                      console.log(
                        `${logPrefix} 🔁 重试部署已触发 (attempt ${redeployAttempts})`
                      );
                    }
                  }
                } catch (pollError) {
                  // 如果是我们手动抛出的错误，直接中断
                  if (pollError.message.startsWith("部署失败")) {
                    throw pollError;
                  }
                  // API 错误则忽略，继续重试
                  console.log(
                    `${logPrefix}    ⚠️ 获取状态失败: ${pollError.message}`
                  );
                }
              }

              if (!isRunning) {
                throw new Error(
                  `部署超时，已重试${redeployAttempts}次仍未检测到 RUNNING 状态`
                );
              }
            } catch (error) {
              console.log(
                `${logPrefix} ❌ 部署触发或等待失败: ${error.message}`
              );
              recordErrorLog(
                error,
                `deployService - deployApplication - ${serviceName}`
              );
              throw error; // 抛出错误以便中断流程
            }

            // 步骤 6: 配置域名 (新功能)
            console.log(`${logPrefix} 🌐 步骤 6: 配置域名...`);
            let domainUrl = null;
            try {
              // 1. 生成域名
              console.log(
                `${logPrefix} 🌐 generateDomain 调用参数 -> appName: ${appName}`
              );
              const generateDomainResult = await client.generateDomain(appName);
              console.log(
                `${logPrefix} 🌐 generateDomain 返回 -> status: ${
                  generateDomainResult?.status
                }, data: ${JSON.stringify(generateDomainResult?.data)}`
              );
              if (
                generateDomainResult.status === 200 &&
                generateDomainResult.data
              ) {
                // API 返回值可能是对象或直接字符串，需要根据实际情况处理
                // 假设返回结构: { domain: "xxx.traefik.me" } 或直接字符串
                const generatedDomain =
                  typeof generateDomainResult.data === "string"
                    ? generateDomainResult.data
                    : generateDomainResult.data.domain ||
                      generateDomainResult.data.host ||
                      generateDomainResult.data;

                if (generatedDomain && typeof generatedDomain === "string") {
                  console.log(`${logPrefix}    生成的域名: ${generatedDomain}`);

                  // 2. 创建域名配置
                  console.log(
                    `${logPrefix} 🌐 createDomain 调用参数 -> host: ${generatedDomain}, applicationId: ${applicationId}, port: ${port}, https: true`
                  );
                  const createDomainResult = await client.createDomain({
                    host: generatedDomain,
                    applicationId: applicationId,
                    port: port, // 使用传入的服务端口 (80 或 3000)
                    https: true,
                    certificateType: "letsencrypt",
                  });
                  console.log(
                    `${logPrefix} 🌐 createDomain 返回 -> status: ${
                      createDomainResult?.status
                    }, data: ${JSON.stringify(createDomainResult?.data)}`
                  );

                  if (
                    createDomainResult.status === 200 ||
                    createDomainResult.status === 201
                  ) {
                    console.log(`${logPrefix} ✅ 域名配置成功`);
                    // 默认使用 https 域名
                    domainUrl = `https://${generatedDomain}`;
                  } else {
                    console.log(
                      `${logPrefix} ❌ 域名创建失败: ${JSON.stringify(
                        createDomainResult
                      )}`
                    );
                  }
                } else {
                  console.log(
                    `${logPrefix} ❌ 无法解析生成的域名: ${JSON.stringify(
                      generateDomainResult.data
                    )}`
                  );
                }
              } else {
                console.log(
                  `${logPrefix} ❌ 域名生成失败: ${JSON.stringify(
                    generateDomainResult
                  )}`
                );
              }
            } catch (error) {
              console.log(`${logPrefix} ❌ 域名配置异常: ${error.message}`);
              console.log(
                `${logPrefix} ❌ 域名配置异常堆栈: ${
                  error?.stack || "no stack"
                }`
              );
              recordErrorLog(
                error,
                `deployService - domainConfig - ${serviceName}`
              );
            }

            return {
              status: 0,
              message: `${serviceName} 应用创建成功`,
              data: {
                applicationId,
                appName,
                imageTag,
                port,
                dockerBuildEnabled: ENABLE_DOCKER_BUILD,
                domainUrl, // 返回生成的域名 URL
              },
            };
          }
        }
      }
    } else {
      console.log(`${logPrefix} ⏭️ Docker 构建已禁用，跳过镜像构建`);
    }

    console.log(`${logPrefix} 🏁 ${serviceName} 部署流程完成`);
    return {
      status: 0,
      message: `${serviceName} 应用创建成功`,
      data: {
        applicationId,
        appName,
        imageTag,
        port,
        dockerBuildEnabled: ENABLE_DOCKER_BUILD,
      },
    };
  } catch (error) {
    recordErrorLog(error, `deployService - ${serviceName}`);
    return {
      status: 1,
      message: `${serviceName} 部署失败`,
      data: { error: error.message || "未知错误" },
    };
  }
}

/**
 * 重新部署项目
 * @param {Object} params - 部署参数
 * @param {string} params.projectId - 项目ID
 * @param {string} params.applicationId - Dokploy 应用ID
 * @param {string} params.serviceName - 服务名称 (单体 nextjs 则为 app)
 */
async function redeployService(params = {}) {
  try {
    if (!params.projectId || !params.applicationId || !params.serviceName) {
      return {
        status: 1,
        message: "重新部署失败",
        data: { error: "参数不完整" },
      };
    }

    const dokployApiKey = process.env.DOKPLOY_API_KEY;
    if (!dokployApiKey) {
      return {
        status: 1,
        message: "重新部署失败",
        data: { error: "DOKPLOY_API_KEY 未配置" },
      };
    }

    const client = new DokployClient({
      baseUrl: process.env.DOKPLOY_BASE_URL || "http://165.154.23.73:3000",
      apiKey: dokployApiKey.trim(),
    });

    // 获取项目路径
    const projectsBasePath = getProjectsBasePath();
    const servicePath = path.join(
      projectsBasePath,
      params.projectId,
      params.serviceName
    );

    try {
      await fs.access(servicePath);
    } catch {
      return {
        status: 1,
        message: "重新部署失败",
        data: { error: `服务目录不存在: ${servicePath}` },
      };
    }

    // 镜像标签
    const imageTag = `${DOCKER_REGISTRY}/${params.projectId}-${params.serviceName}:latest`;

    // 构建镜像
    const buildResult = await dockerControl.buildImage({
      tag: imageTag,
      contextPath: servicePath,
    });

    if (buildResult.status !== 0) {
      return {
        status: 1,
        message: "镜像构建失败",
        data: { error: buildResult.data.error },
      };
    }

    // 推送镜像
    const pushResult = await dockerControl.pushImage({ tag: imageTag });

    if (pushResult.status !== 0) {
      return {
        status: 1,
        message: "镜像推送失败",
        data: { error: pushResult.data.error },
      };
    }

    // 触发重新部署
    await client.redeployApplication({
      applicationId: params.applicationId,
      title: "Redeploy",
      description: `Redeploying ${params.serviceName}`,
    });

    return {
      status: 0,
      message: "重新部署成功",
      data: {
        applicationId: params.applicationId,
        imageTag,
      },
    };
  } catch (error) {
    recordErrorLog(error, "redeployService");
    return {
      status: 1,
      message: "重新部署失败",
      data: { error: error.message || "未知错误" },
    };
  }
}

module.exports = {
  deployProject,
  redeployService,
};
