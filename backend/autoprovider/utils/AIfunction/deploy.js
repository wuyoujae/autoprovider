const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const recordOperation = require("../systemAgentLoop/utils/recordOperation");
const { deployProject } = require("../systemWorkLoop/deploy/deployProject");
const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");

// 将 exec 转换为 Promise 版本
const execAsync = promisify(exec);

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

    // 优先使用 Dokploy 部署流程（Next.js 单体服务）
    if (dokployProjectId) {
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

    // 如果没有 dokployProjectId，回退到旧的本地脚本部署逻辑
    console.log(`[deploy] 未找到 Dokploy ID，回退到本地脚本部署流程`);

    // 通知前端开始本地部署（保持统一文案）
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

    // 读取 package.json（异步）
    let packageJson;
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      packageJson = JSON.parse(packageJsonContent);
    } catch (error) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: `无法读取或解析 package.json: ${error.message}`,
        },
      };
    }

    const scripts = packageJson.scripts || {};
    const deploySteps = [];
    const errors = [];

    // 步骤 1: 检查是否有 build 脚本（异步执行）
    if (scripts.build) {
      await sendDeployUpdate();
      try {
        const { stdout: buildOutput } = await execAsync("npm run build", {
          cwd: projectRoot,
          encoding: "utf-8",
          timeout: 300000, // 5分钟超时
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        deploySteps.push({
          step: "build",
          status: "success",
          output: buildOutput || "Build 完成",
        });
        await sendDeployUpdate();
      } catch (error) {
        const errorOutput = error.stdout || error.stderr || error.message;
        deploySteps.push({
          step: "build",
          status: "failed",
          output: errorOutput,
        });
        errors.push(`Build 失败: ${errorOutput}`);
        await sendDeployUpdate();
        await sendDeployUpdate();
      }
    } else {
      deploySteps.push({
        step: "build",
        status: "skipped",
        output: "未找到 build 脚本",
      });
    }

    // 如果 build 失败，不继续后续步骤
    if (errors.length > 0) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: "Build 失败，部署终止",
          steps: deploySteps,
          errors,
        },
      };
    }

    // 步骤 2: 检查是否有 test 脚本（异步执行）
    if (
      scripts.test &&
      scripts.test !== 'echo "Error: no test specified" && exit 1'
    ) {
      await sendDeployUpdate();
      try {
        const { stdout: testOutput } = await execAsync("npm run test", {
          cwd: projectRoot,
          encoding: "utf-8",
          timeout: 180000, // 3分钟超时
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        deploySteps.push({
          step: "test",
          status: "success",
          output: testOutput || "测试通过",
        });
        await sendDeployUpdate();
      } catch (error) {
        const errorOutput = error.stdout || error.stderr || error.message;
        deploySteps.push({
          step: "test",
          status: "failed",
          output: errorOutput,
        });
        errors.push(`测试失败: ${errorOutput}`);
        await sendDeployUpdate();
        await sendDeployUpdate();
      }
    } else {
      deploySteps.push({
        step: "test",
        status: "skipped",
        output: "未找到有效的 test 脚本",
      });
    }

    // 如果测试失败，不继续部署
    if (errors.length > 0) {
      return {
        status: 1,
        message: "deploy fail",
        data: {
          error: "测试失败，部署终止",
          steps: deploySteps,
          errors,
        },
      };
    }

    // 步骤 3: 检查是否有 deploy 脚本（异步执行）
    if (scripts.deploy) {
      await sendDeployUpdate();
      try {
        const { stdout: deployOutput } = await execAsync("npm run deploy", {
          cwd: projectRoot,
          encoding: "utf-8",
          timeout: 600000, // 10分钟超时
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        deploySteps.push({
          step: "deploy",
          status: "success",
          output: deployOutput || "部署完成",
        });
        await sendDeployUpdate();
      } catch (error) {
        const errorOutput = error.stdout || error.stderr || error.message;
        deploySteps.push({
          step: "deploy",
          status: "failed",
          output: errorOutput,
        });
        errors.push(`部署失败: ${errorOutput}`);
        await sendDeployUpdate();

        return {
          status: 1,
          message: "deploy fail",
          data: {
            error: "部署脚本执行失败",
            steps: deploySteps,
            errors,
          },
        };
      }
    } else {
      deploySteps.push({
        step: "deploy",
        status: "skipped",
        output: "未找到 deploy 脚本，项目已构建但未自动部署",
      });
    }

    // 记录操作到数据库
    if (infoObject.dialogueId && infoObject.connection) {
      const operationCode = constructOperationCode("deploy", [
        {
          stepsExecuted: deploySteps.length,
          hasErrors: errors.length > 0,
        },
      ]);
      await recordOperation({
        dialogueId: infoObject.dialogueId,
        operationCode: `<deploy>deploy</deploy>`,
        operationMethod: "deploy",
        operationStatus: 0,
        connection: infoObject.connection,
        operationIndex: 0,
      });
    }

    // 构建返回数据
    const responseData = {
      steps: deploySteps,
      totalSteps: deploySteps.length,
      successSteps: deploySteps.filter((s) => s.status === "success").length,
      failedSteps: deploySteps.filter((s) => s.status === "failed").length,
      skippedSteps: deploySteps.filter((s) => s.status === "skipped").length,
    };

    if (errors.length > 0) {
      responseData.errors = errors;
    }

    return {
      status: 0,
      message: "deploy success",
      data: responseData,
    };
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
