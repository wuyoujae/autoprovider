const { exec, spawn } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const net = require("net");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const recordOperation = require("../systemAgentLoop/utils/recordOperation");
const { deployProject } = require("../systemWorkLoop/deploy/deployProject");
const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");

// 将 exec 转换为 Promise 版本
const execAsync = promisify(exec);

// 本地 dev server 进程注册表（按 projectId 复用）
// value: { proc: ChildProcess, port: number, url: string, startedAt: number }
const devServerRegistry = new Map();

const hasDokployConfig = () => {
  return !!(process.env.DOKPLOY_BASE_URL && process.env.DOKPLOY_API_KEY);
};

const isProcessAlive = (proc) => {
  return !!proc && proc.exitCode === null && !proc.killed;
};

// 更可靠的端口选择（和 initNewProject 保持一致）：
// - 优先尝试指定端口（在 0.0.0.0 上探测）
// - 如果不可用，使用系统分配的随机空闲端口
const getAvailablePort = async (preferredPort = 3000) => {
  const canListen = (port) =>
    new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "0.0.0.0");
    });

  if (preferredPort && (await canListen(preferredPort))) {
    return preferredPort;
  }

  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "0.0.0.0", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      server.close(() => resolve(port));
    });
  });
};

const waitForPortOpen = async (port, host = "127.0.0.1", timeoutMs = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const socket = new net.Socket();
      const onDone = (result) => {
        try {
          socket.destroy();
        } catch (e) {
          // ignore
        }
        resolve(result);
      };
      socket.setTimeout(800);
      socket.once("connect", () => onDone(true));
      socket.once("timeout", () => onDone(false));
      socket.once("error", () => onDone(false));
      socket.connect(port, host);
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const detectDevRunner = async (projectRoot, packageJson) => {
  const scripts = packageJson?.scripts || {};
  const devScript = scripts.dev || "";
  const deps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  // 优先从脚本判断
  if (/next(\s+dev|\s*$)/i.test(devScript)) return "next";
  if (/vite/i.test(devScript)) return "vite";

  // 再从依赖判断
  if (deps.next) return "next";
  if (deps.vite || deps["@vitejs/plugin-vue"] || deps["@vitejs/plugin-react"]) {
    return "vite";
  }

  // 默认：unknown（仍然用 npm run dev）
  return "unknown";
};

const startOrReuseLocalDevServer = async ({
  projectId,
  projectRoot,
  infoObject,
}) => {
  const existing = devServerRegistry.get(projectId);
  if (existing && isProcessAlive(existing.proc)) {
    return { url: existing.url, port: existing.port, reused: true };
  }

  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent);

  const runner = await detectDevRunner(projectRoot, packageJson);

  // 端口选择：优先默认端口（Next:3000 / Vite:5173），被占用则自动分配随机可用端口
  const defaultPort = runner === "vite" ? 5173 : 3000;
  const port = await getAvailablePort(defaultPort);
  if (!port) throw new Error("无法找到可用端口启动本地 dev server");

  // 生成对浏览器友好的预览 URL（可通过环境变量覆盖 host）
  const previewHost = process.env.DEV_PREVIEW_HOST || "localhost";
  const url = `http://${previewHost}:${port}`;

  // 通过参数/环境尽量确保可被 iframe 访问：监听 0.0.0.0
  const env = {
    ...process.env,
  };

  const npmArgs = ["run", "dev", "--"];
  const extraArgs = [];

  if (runner === "next") {
    // Next 支持 -p / -H；同时设置环境变量兜底
    env.PORT = String(port);
    env.HOSTNAME = env.HOSTNAME || "0.0.0.0";
    extraArgs.push("-p", String(port), "-H", "0.0.0.0");
  } else if (runner === "vite") {
    extraArgs.push("--host", "0.0.0.0", "--port", String(port));
  } else {
    // unknown：只设置 PORT/HOSTNAME，避免 dev 脚本不识别参数导致报错
    env.PORT = env.PORT || String(port);
    env.HOSTNAME = env.HOSTNAME || "0.0.0.0";
  }

  const args = runner === "unknown" ? ["run", "dev"] : npmArgs.concat(extraArgs);

  // 启动 dev server（后台常驻）
  const proc = spawn("npm", args, {
    cwd: projectRoot,
    env,
    shell: true, // Windows 兼容
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const prefix = `[local-dev:${projectId}]`;
  proc.stdout?.on("data", (buf) => {
    const msg = buf.toString();
    console.log(prefix, msg.trimEnd());
  });
  proc.stderr?.on("data", (buf) => {
    const msg = buf.toString();
    console.log(prefix, msg.trimEnd());
  });
  proc.on("exit", (code, signal) => {
    console.log(`${prefix} exited`, { code, signal });
    const cur = devServerRegistry.get(projectId);
    if (cur && cur.proc === proc) {
      devServerRegistry.delete(projectId);
    }
  });

  // 等待端口可访问
  const ready = await waitForPortOpen(port, "127.0.0.1", 20000);
  if (!ready) {
    // 进程可能已退出，补充错误信息
    if (!isProcessAlive(proc)) {
      throw new Error("本地 dev server 启动失败（进程已退出）");
    }
    throw new Error("本地 dev server 启动超时（端口未就绪）");
  }

  devServerRegistry.set(projectId, { proc, port, url, startedAt: Date.now() });

  // 这里也给前端一个“可用 URL”提示（保持 deploy 标签，以便复用现有渲染）
  await chatToFrontend(`部署成功，预览地址: ${url}`, "deploy", infoObject);

  return { url, port, reused: false };
};

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
 * 部署项目到生产/测试环境
 * @param {Object} payload - 函数参数对象（deploy 不需要参数）
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function deploy(payload = {}, infoObject = {}) {
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

    const projectId = infoObject.projectId;

    // 统一使用 chatToFrontend 发送部署阶段状态
    // 精简前端提示：仅使用三种固定文案
    const sendDeployUpdate = async () => Promise.resolve();

    // 尝试获取 Dokploy 项目ID
    let dokployProjectId = infoObject.dokployProjectId;
    if (!dokployProjectId) {
      try {
        const [rows] = await pool.query(
          "SELECT dokploy_id FROM project_info WHERE project_id = ?",
          [projectId]
        );
        if (rows.length > 0 && rows[0].dokploy_id) {
          dokployProjectId = rows[0].dokploy_id;
        }
      } catch (dbError) {
        console.error("[deploy] 查询 dokploy_id 失败:", dbError);
      }
    }

    // 优先使用 Dokploy 部署流程（需要：有 dokployProjectId 且环境变量已配置）
    if (dokployProjectId && hasDokployConfig()) {
      console.log(
        `[deploy] 开始 Dokploy 部署流程, ProjectID: ${projectId}, DokployID: ${dokployProjectId}`
      );

      // 通知前端开始部署
      await chatToFrontend("开始部署", "deploy", infoObject);

      const deploySteps = [];
      const errors = [];

      try {
        const deployStart = Date.now();
        const deployResult = await deployProject({
          projectId,
          dokployProjectId,
        });

        if (deployResult.status === 0) {
          const duration = ((Date.now() - deployStart) / 1000).toFixed(1);
          console.log(`[deploy] ✅ Dokploy 部署成功 (${duration}s)`);

          deploySteps.push({
            step: "dokploy_deploy",
            status: "success",
            output: `部署成功 (${duration}s)`,
            details: deployResult.data,
          });

          // 更新数据库中的域名信息（单体 Next.js）
          const appUrl =
            deployResult.data?.app?.data?.domainUrl ||
            deployResult.data?.frontend?.data?.domainUrl ||
            deployResult.data?.domainUrl;

          if (appUrl) {
            try {
              const updateSql = `UPDATE project_info SET project_url = ? WHERE project_id = ?`;
              await pool.query(updateSql, [appUrl, projectId]);
              console.log(`[deploy] ✅ 数据库域名信息更新成功`);
              deploySteps.push({
                step: "update_url",
                status: "success",
                output: "域名更新成功",
              });
            } catch (dbError) {
              console.error(`[deploy] ❌ 数据库更新失败: ${dbError.message}`);
              deploySteps.push({
                step: "update_url",
                status: "failed",
                output: `数据库更新失败: ${dbError.message}`,
              });
              // 数据库更新失败不影响整体部署状态，但记录错误
              recordErrorLog(dbError, "deploy - updateDomainUrls");
            }
          }

          // 通知前端部署成功
          await chatToFrontend("部署成功", "deploy", infoObject);

          // 记录操作：仅记录精简文案
          if (infoObject.dialogueId && infoObject.connection) {
            await recordOperation({
              dialogueId: infoObject.dialogueId,
              operationCode: "部署成功",
              operationMethod: "deploy",
              operationStatus: 0,
              connection: infoObject.connection,
              operationIndex: 0,
            });
          }

          return {
            status: 0,
            message: "deploy success",
            data: {
              steps: deploySteps,
              frontendUrl: appUrl,
              backendUrl: undefined,
              dokployData: deployResult.data,
            },
          };
        } else {
          // 部署失败，尽可能提取明确的错误信息
          let errorMsg = deployResult.data?.error || deployResult.message;

          // 捕获具体服务（包括 app/front/back）的错误
          if (!errorMsg && deployResult.data) {
            const services = ["app", "frontend", "backend"];
            const serviceErrors = [];

            for (const service of services) {
              const serviceResult = deployResult.data[service];
              if (serviceResult && serviceResult.status !== 0) {
                const srvError =
                  serviceResult.data?.error || serviceResult.message;
                if (srvError) {
                  serviceErrors.push(`[${service}] ${srvError}`);
                }
              }
            }

            if (serviceErrors.length > 0) {
              errorMsg = serviceErrors.join("\n");
            }
          }

          if (!errorMsg) errorMsg = "未知错误";

          console.error(`[deploy] ❌ Dokploy 部署失败: ${errorMsg}`);
          errors.push(errorMsg);

          deploySteps.push({
            step: "dokploy_deploy",
            status: "failed",
            output: errorMsg,
          });

          await sendDeployUpdate();

          // 通知前端部署失败（固定文案）
          await chatToFrontend("部署失败！正在分析问题", "deploy", infoObject);

          // 记录操作：失败时也只记录精简文案
          if (infoObject.dialogueId && infoObject.connection) {
            await recordOperation({
              dialogueId: infoObject.dialogueId,
              operationCode: "部署失败！正在分析问题",
              operationMethod: "deploy",
              operationStatus: 1,
              connection: infoObject.connection,
              operationIndex: 0,
            });
          }

          return {
            status: 1,
            message: "deploy fail",
            data: {
              error: errorMsg,
              steps: deploySteps,
              errors,
            },
          };
        }
      } catch (deployError) {
        console.error(`[deploy] ❌ Dokploy 部署异常: ${deployError.message}`);
        await sendDeployUpdate();
        recordErrorLog(deployError, "deploy - dokployDeploy");

        // 通知前端部署异常
        await chatToFrontend("部署失败！正在分析问题", "deploy", infoObject);

        // 记录操作：异常也记录精简文案
        if (infoObject.dialogueId && infoObject.connection) {
          await recordOperation({
            dialogueId: infoObject.dialogueId,
            operationCode: "部署失败！正在分析问题",
            operationMethod: "deploy",
            operationStatus: 1,
            connection: infoObject.connection,
            operationIndex: 0,
          });
        }

        return {
          status: 1,
          message: "deploy fail",
          data: {
            error: deployError.message,
            steps: deploySteps,
          },
        };
      }
    }

    // 无 Dokploy 配置：启动本地 dev server，并返回可预览 URL
    console.log(
      `[deploy] 未配置 Dokploy 或缺少 dokploy_id，启用本地 dev 预览模式`
    );
    await chatToFrontend("开始部署", "deploy", infoObject);

    // 使用 combyFilePath 获取项目根目录
    const projectRoot = combyFilePath(infoObject.projectId, "/");

    // 检查项目目录是否存在（异步）
    let projectRootExists = false;
    try {
      await fs.access(projectRoot);
      projectRootExists = true;
    } catch (e) {
      projectRootExists = false;
    }

    if (!projectRootExists) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: `项目目录不存在: ${projectRoot}`,
        },
      };
    }

    // 检查 package.json 是否存在（异步）
    const packageJsonPath = path.join(projectRoot, "package.json");
    let packageJsonExists = false;
    try {
      await fs.access(packageJsonPath);
      packageJsonExists = true;
    } catch (e) {
      packageJsonExists = false;
    }

    if (!packageJsonExists) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: "项目目录中未找到 package.json",
        },
      };
    }

    // 启动/复用本地 dev server
    const deploySteps = [];
      try {
      const devResult = await startOrReuseLocalDevServer({
        projectId,
        projectRoot,
        infoObject,
      });

        deploySteps.push({
        step: "dev",
          status: "success",
        output: devResult.reused ? "dev 已在运行（复用）" : "dev 启动成功",
        url: devResult.url,
        port: devResult.port,
      });

      // 记录操作
      if (infoObject.dialogueId && infoObject.connection) {
        await recordOperation({
          dialogueId: infoObject.dialogueId,
          operationCode: "部署成功",
          operationMethod: "deploy",
          operationStatus: 0,
          connection: infoObject.connection,
          operationIndex: 0,
      });
    }

      return {
        status: 0,
        message: "deploy success",
        data: {
          mode: "local-dev",
          steps: deploySteps,
          frontendUrl: devResult.url,
        },
      };
    } catch (devError) {
      console.error(`[deploy] ❌ 本地 dev 启动失败: ${devError.message}`);
      recordErrorLog(devError, "deploy - localDev");
      await chatToFrontend("部署失败！正在分析问题", "deploy", infoObject);
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: devError.message || "本地 dev 启动失败",
          steps: deploySteps,
        },
      };
    }
  } catch (error) {
    console.error("[deploy] 执行异常:", error);
    recordErrorLog(error, "AIfunction-deploy");
    return {
      status: 1,
      message: "deploy fail",
      data: {
        error: error.message || "部署时发生未知错误",
      },
    };
  }
}

module.exports = deploy;
