/**
 * 预部署模块
 * 在部署项目之前执行的准备工作，主要处理数据库导出和配置
 */

const path = require("path");
const fs = require("fs").promises;
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const getProjectsBasePath = require("../../getProjectsBasePath");
const recordErrorLog = require("../../recordErrorLog");
const dockerControl = require("./dockerContral");
const DokployClient = require("../../dokploy/client");

// 数据库连接配置（从环境变量读取）
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "3306";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";

// Docker Registry 配置
const DOCKER_REGISTRY =
  process.env.DOCKER_REGISTRY_URL || "docker.io/autoprovider";

// MySQL 服务默认配置
const MYSQL_DEFAULT_USER = "autoprovider";
const MYSQL_DEFAULT_PASSWORD = "123456";

/**
 * 将 projectId 转换为数据库名
 * 规则：myapp_ + projectId（移除连字符，转小写）
 * @param {string} projectId - 项目ID
 * @returns {string} 数据库名
 */
function projectIdToDatabaseName(projectId) {
  // 移除连字符和特殊字符，转小写
  const sanitizedId = projectId.replace(/[-]/g, "_").toLowerCase();
  return `myapp_${sanitizedId}`;
}

/**
 * 导出数据库到 dump.sql
 * @param {string} databaseName - 数据库名
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function exportDatabase(databaseName, outputPath) {
  try {
    console.log(`[PREDEPLOY] 📦 开始导出数据库: ${databaseName}`);
    console.log(`[PREDEPLOY]    输出路径: ${outputPath}`);

    // 构建 mysqldump 命令
    let command = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER}`;
    if (DB_PASSWORD) {
      command += ` -p${DB_PASSWORD}`;
    }
    command += ` ${databaseName} > "${outputPath}"`;

    console.log(
      `[PREDEPLOY]    执行命令: mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${databaseName} > "${outputPath}"`
    );

    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分钟超时
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    if (stderr && !stderr.includes("Warning")) {
      console.log(`[PREDEPLOY] ⚠️ mysqldump stderr: ${stderr}`);
    }

    // 验证导出文件是否存在且有内容
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error("导出的 dump.sql 文件为空");
    }

    console.log(
      `[PREDEPLOY] ✅ 数据库导出成功，文件大小: ${(stats.size / 1024).toFixed(
        2
      )} KB`
    );

    return {
      status: 0,
      message: "数据库导出成功",
      data: {
        databaseName,
        outputPath,
        fileSize: stats.size,
      },
    };
  } catch (error) {
    console.log(`[PREDEPLOY] ❌ 数据库导出失败: ${error.message}`);
    recordErrorLog(error, "perdeploy - exportDatabase");
    return {
      status: 1,
      message: "数据库导出失败",
      data: { error: error.message },
    };
  }
}

/**
 * 更新 lib/Dockerfile 中的数据库配置
 * @param {string} dockerfilePath - Dockerfile 路径
 * @param {string} databaseName - 数据库名
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function updateDockerfile(dockerfilePath, databaseName) {
  try {
    console.log(`[PREDEPLOY] 📝 更新 Dockerfile: ${dockerfilePath}`);

    // 读取 Dockerfile
    let content = await fs.readFile(dockerfilePath, "utf-8");

    // 替换 MYSQL_DATABASE 的值
    // 匹配 MYSQL_DATABASE=xxx 的模式（可能带引号或不带）
    const dbNameRegex = /MYSQL_DATABASE=["']?[^"'\s\\]+["']?/;
    if (dbNameRegex.test(content)) {
      content = content.replace(dbNameRegex, `MYSQL_DATABASE=${databaseName}`);
    } else {
      // 如果没找到，尝试在 ENV 指令中添加
      console.log(`[PREDEPLOY] ⚠️ 未找到 MYSQL_DATABASE，尝试添加`);
    }

    // 不修改 MYSQL_ROOT_PASSWORD，保留模板中原有的密码

    // 写回 Dockerfile
    await fs.writeFile(dockerfilePath, content, "utf-8");

    console.log(`[PREDEPLOY] ✅ Dockerfile 更新成功`);
    console.log(`[PREDEPLOY]    数据库名: ${databaseName}`);

    return {
      status: 0,
      message: "Dockerfile 更新成功",
      data: {
        databaseName,
        dockerfilePath,
      },
    };
  } catch (error) {
    console.log(`[PREDEPLOY] ❌ Dockerfile 更新失败: ${error.message}`);
    recordErrorLog(error, "perdeploy - updateDockerfile");
    return {
      status: 1,
      message: "Dockerfile 更新失败",
      data: { error: error.message },
    };
  }
}

/**
 * 预部署主函数
 * 在部署前准备数据库相关文件
 * @param {Object} params - 参数对象
 * @param {string} params.projectId - 项目ID（必需）
 * @param {string} params.dokployProjectId - Dokploy 项目ID（必需，用于创建 MySQL 服务）
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function predeploy(params = {}) {
  try {
    console.log(`\n[PREDEPLOY] 🚀 开始预部署准备`);
    console.log(`[PREDEPLOY]    项目ID: ${params.projectId}`);
    console.log(`[PREDEPLOY]    Dokploy项目ID: ${params.dokployProjectId}`);

    // 参数验证
    if (!params.projectId) {
      return {
        status: 1,
        message: "预部署失败",
        data: { error: "项目ID不能为空" },
      };
    }

    if (!params.dokployProjectId) {
      return {
        status: 1,
        message: "预部署失败",
        data: { error: "Dokploy 项目ID不能为空" },
      };
    }

    // 初始化 Dokploy 客户端
    const dokployApiKey = process.env.DOKPLOY_API_KEY;
    if (!dokployApiKey) {
      return {
        status: 1,
        message: "预部署失败",
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
    const appPath = path.join(projectPath, "app");
    const libPath = path.join(appPath, "lib");

    // 检查项目目录
    try {
      await fs.access(appPath);
    } catch {
      return {
        status: 1,
        message: "预部署失败",
        data: { error: `项目 app 目录不存在: ${appPath}` },
      };
    }

    // 检查 lib 目录
    try {
      await fs.access(libPath);
    } catch {
      console.log(`[PREDEPLOY] 📁 lib 目录不存在，创建中...`);
      await fs.mkdir(libPath, { recursive: true });
    }

    // 生成数据库名
    const databaseName = projectIdToDatabaseName(params.projectId);
    console.log(`[PREDEPLOY]    数据库名: ${databaseName}`);

    // 步骤 1: 导出数据库
    const dumpPath = path.join(libPath, "dump.sql");
    const exportResult = await exportDatabase(databaseName, dumpPath);
    if (exportResult.status !== 0) {
      return exportResult;
    }

    // 步骤 2: 更新 Dockerfile
    const dockerfilePath = path.join(libPath, "Dockerfile");

    // 检查 Dockerfile 是否存在
    try {
      await fs.access(dockerfilePath);
    } catch {
      // 如果不存在，创建默认的 Dockerfile
      console.log(`[PREDEPLOY] 📝 lib/Dockerfile 不存在，创建默认文件...`);
      const defaultDockerfile = `FROM mysql:8.0
ENV MYSQL_DATABASE=${databaseName} \\
    MYSQL_ROOT_PASSWORD=changeme
COPY dump.sql /docker-entrypoint-initdb.d/01_dump.sql
`;
      await fs.writeFile(dockerfilePath, defaultDockerfile, "utf-8");
    }

    const updateResult = await updateDockerfile(dockerfilePath, databaseName);
    if (updateResult.status !== 0) {
      return updateResult;
    }

    // 步骤 3: 构建数据库 Docker 镜像
    const imageTag = `${DOCKER_REGISTRY}/${params.projectId}-db:latest`;
    console.log(`\n[PREDEPLOY] 🔨 步骤 3: 构建数据库 Docker 镜像...`);
    console.log(`[PREDEPLOY]    镜像标签: ${imageTag}`);
    console.log(`[PREDEPLOY]    构建路径: ${libPath}`);
    console.log(`[PREDEPLOY]    Dockerfile: ${dockerfilePath}`);

    const buildStart = Date.now();
    const buildResult = await dockerControl.buildImage({
      tag: imageTag,
      contextPath: libPath,
      dockerfile: dockerfilePath,
    });

    if (buildResult.status !== 0) {
      console.log(
        `[PREDEPLOY] ❌ 镜像构建失败 (${(
          (Date.now() - buildStart) /
          1000
        ).toFixed(1)}s)`
      );
      console.log(
        `[PREDEPLOY]    错误: ${buildResult.data?.error?.substring(0, 200)}...`
      );
      recordErrorLog(
        `数据库镜像构建失败: ${buildResult.data?.error}`,
        "predeploy - buildImage"
      );
      return {
        status: 1,
        message: "数据库镜像构建失败",
        data: { error: buildResult.data?.error },
      };
    }

    console.log(
      `[PREDEPLOY] ✅ 镜像构建成功 (${(
        (Date.now() - buildStart) /
        1000
      ).toFixed(1)}s)`
    );

    // 步骤 4: 推送镜像到 Docker Hub
    console.log(`\n[PREDEPLOY] 📤 步骤 4: 推送镜像到 Docker Hub...`);
    const pushStart = Date.now();
    const pushResult = await dockerControl.pushImage({ tag: imageTag });

    if (pushResult.status !== 0) {
      console.log(
        `[PREDEPLOY] ❌ 镜像推送失败 (${(
          (Date.now() - pushStart) /
          1000
        ).toFixed(1)}s)`
      );
      console.log(`[PREDEPLOY]    错误: ${pushResult.data?.error}`);
      recordErrorLog(
        `数据库镜像推送失败: ${pushResult.data?.error}`,
        "predeploy - pushImage"
      );
      return {
        status: 1,
        message: "数据库镜像推送失败",
        data: { error: pushResult.data?.error },
      };
    }

    console.log(
      `[PREDEPLOY] ✅ 镜像推送成功 (${((Date.now() - pushStart) / 1000).toFixed(
        1
      )}s)`
    );

    // 步骤 5: 获取 Environment
    console.log(`\n[PREDEPLOY] 🔍 步骤 5: 获取 Dokploy Environment...`);
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
        environmentId = envResult.data[0].environmentId;
        console.log(`[PREDEPLOY] ✅ 找到环境: ${environmentId}`);
      } else {
        // 如果没有环境，创建一个
        console.log(`[PREDEPLOY]    未找到环境，创建新环境...`);
        const createEnvResult = await client.createEnvironment({
          name: "production",
          description: "Production environment",
          projectId: params.dokployProjectId,
        });

        if (createEnvResult.status === 200 && createEnvResult.data) {
          environmentId =
            createEnvResult.data?.environment?.environmentId ||
            createEnvResult.data?.environmentId ||
            createEnvResult.data?.id;
          console.log(`[PREDEPLOY] ✅ 环境创建成功: ${environmentId}`);
        }
      }
    } catch (error) {
      const errorMessage = error?.message || JSON.stringify(error);
      console.log(`[PREDEPLOY] ❌ 获取环境失败: ${errorMessage}`);
      recordErrorLog(error, "predeploy - getOrCreateEnvironment");
      return {
        status: 1,
        message: "预部署失败",
        data: { error: `获取或创建环境失败: ${errorMessage}` },
      };
    }

    if (!environmentId) {
      return {
        status: 1,
        message: "预部署失败",
        data: { error: "无法获取或创建 Environment" },
      };
    }

    // 步骤 6: 创建 MySQL 服务
    const mysqlServiceName = `${params.projectId}-db`;
    console.log(`\n[PREDEPLOY] 🗄️ 步骤 6: 创建 MySQL 服务...`);
    console.log(`[PREDEPLOY]    服务名称: ${mysqlServiceName}`);
    console.log(`[PREDEPLOY]    数据库名: ${databaseName}`);
    console.log(`[PREDEPLOY]    用户名: ${MYSQL_DEFAULT_USER}`);
    console.log(`[PREDEPLOY]    镜像地址: ${imageTag}`);

    try {
      const createMysqlResult = await client.createMySQL({
        name: mysqlServiceName,
        appName: mysqlServiceName,
        environmentId: environmentId,
        databaseName: databaseName,
        databaseUser: MYSQL_DEFAULT_USER,
        databasePassword: MYSQL_DEFAULT_PASSWORD,
        databaseRootPassword: MYSQL_DEFAULT_PASSWORD,
        dockerImage: imageTag,
        description: `MySQL database for project ${params.projectId}`,
      });

      if (createMysqlResult.status === 200) {
        console.log(`[PREDEPLOY] ✅ MySQL 服务创建成功`);
      } else {
        console.log(
          `[PREDEPLOY] ❌ MySQL 服务创建失败: ${JSON.stringify(
            createMysqlResult
          )}`
        );
        return {
          status: 1,
          message: "MySQL 服务创建失败",
          data: { error: createMysqlResult.message || "未知错误" },
        };
      }
    } catch (error) {
      console.log(`[PREDEPLOY] ❌ MySQL 服务创建异常: ${error.message}`);
      recordErrorLog(error, "predeploy - createMySQL");
      return {
        status: 1,
        message: "MySQL 服务创建失败",
        data: { error: error.message },
      };
    }

    // 步骤 7: 通过 project.one 获取 mysqlId
    console.log(`\n[PREDEPLOY] 🔍 步骤 7: 获取 MySQL 服务信息...`);
    let mysqlId = null;
    let mysqlAppName = null;

    try {
      // 等待 1 秒，确保 MySQL 服务创建完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const projectResult = await client.getProject(params.dokployProjectId);
      if (projectResult.status === 200 && projectResult.data) {
        const projectData = projectResult.data;
        console.log(`[PREDEPLOY]    项目名称: ${projectData.name}`);

        // 从 environments 中查找 mysql
        if (projectData.environments && projectData.environments.length > 0) {
          for (const env of projectData.environments) {
            if (env.mysql && env.mysql.length > 0) {
              // 查找我们刚创建的 MySQL（通过 name 匹配）
              const targetMysql = env.mysql.find(
                (m) => m.name === mysqlServiceName
              );
              if (targetMysql) {
                mysqlId = targetMysql.mysqlId;
                console.log(`[PREDEPLOY] ✅ 找到 mysqlId: ${mysqlId}`);
                break;
              }
            }
          }
        }
      } else {
        console.log(
          `[PREDEPLOY] ⚠️ 获取项目信息失败: ${JSON.stringify(projectResult)}`
        );
      }
    } catch (error) {
      console.log(`[PREDEPLOY] ⚠️ 获取项目信息异常: ${error.message}`);
    }

    if (!mysqlId) {
      console.log(`[PREDEPLOY] ❌ 无法获取 mysqlId`);
      return {
        status: 1,
        message: "无法获取 MySQL 服务ID",
        data: { error: "createMySQL 成功但无法从 project.one 获取 mysqlId" },
      };
    }

    // 步骤 8: 通过 mysql.one 获取 appName
    console.log(`\n[PREDEPLOY] 🔍 步骤 8: 获取 MySQL appName...`);
    try {
      const mysqlResult = await client.getMySQL(mysqlId);
      if (mysqlResult.status === 200 && mysqlResult.data) {
        mysqlAppName = mysqlResult.data.appName;
        console.log(`[PREDEPLOY] ✅ 获取 appName: ${mysqlAppName}`);
      } else {
        console.log(
          `[PREDEPLOY] ⚠️ 获取 MySQL 详情失败: ${JSON.stringify(mysqlResult)}`
        );
      }
    } catch (error) {
      console.log(`[PREDEPLOY] ⚠️ 获取 MySQL 详情异常: ${error.message}`);
    }

    if (!mysqlAppName) {
      console.log(`[PREDEPLOY] ❌ 无法获取 MySQL appName`);
      return {
        status: 1,
        message: "无法获取 MySQL appName",
        data: { error: "mysql.one 未返回 appName" },
      };
    }

    // 步骤 9: 组装 db_url
    // 格式: mysql://<用户>:<密码>@<appName>:3306/<数据库名>
    const dbUrl = `mysql://${MYSQL_DEFAULT_USER}:${MYSQL_DEFAULT_PASSWORD}@${mysqlAppName}:3306/${databaseName}`;
    console.log(`\n[PREDEPLOY] 🔗 步骤 9: 生成数据库连接地址`);
    console.log(`[PREDEPLOY]    DB_URL: ${dbUrl}`);

    // 步骤 10: 更新项目 .env 文件中的 DB_URL
    console.log(`\n[PREDEPLOY] 📝 步骤 10: 更新项目 .env 文件...`);
    // 与 initNewProject 的 DB_NAME 写入路径保持一致：项目根目录 .env
    const envFilePath = path.join(projectPath, ".env");
    try {
      let envContent = "";
      // 检查 .env 文件是否存在
      try {
        await fs.access(envFilePath);
        envContent = await fs.readFile(envFilePath, "utf-8");
      } catch {
        // .env 不存在，创建新文件
        console.log(`[PREDEPLOY]    .env 文件不存在，将创建新文件`);
      }

      // 替换或添加 DB_URL
      if (/^DB_URL=.*$/m.test(envContent)) {
        // 已存在 DB_URL，替换
        envContent = envContent.replace(/^DB_URL=.*$/m, `DB_URL=${dbUrl}`);
      } else {
        // 不存在，追加
        envContent = `${
          envContent.trim().length ? `${envContent.trimEnd()}\n` : ""
        }DB_URL=${dbUrl}\n`;
      }

      await fs.writeFile(envFilePath, envContent, "utf-8");
      console.log(`[PREDEPLOY] ✅ .env 文件更新成功`);
      console.log(`[PREDEPLOY]    路径: ${envFilePath}`);
    } catch (error) {
      console.log(`[PREDEPLOY] ⚠️ .env 文件更新失败: ${error.message}`);
      // 不阻塞流程，只记录警告
      recordErrorLog(error, "predeploy - updateEnvFile");
    }

    // 步骤 11: 部署 MySQL 服务
    console.log(`\n[PREDEPLOY] 🚀 步骤 11: 部署 MySQL 服务...`);
    try {
      const deployMysqlResult = await client.deployMySQL(mysqlId);
      if (deployMysqlResult.status === 200) {
        console.log(`[PREDEPLOY] ✅ MySQL 服务部署已触发`);
      } else {
        console.log(
          `[PREDEPLOY] ⚠️ MySQL 服务部署触发失败: ${JSON.stringify(
            deployMysqlResult
          )}`
        );
      }
    } catch (error) {
      console.log(`[PREDEPLOY] ⚠️ MySQL 服务部署触发异常: ${error.message}`);
      // 部署触发失败不阻塞流程，只记录警告
    }

    console.log(`\n[PREDEPLOY] ✅ 预部署准备完成`);

    return {
      status: 0,
      message: "预部署准备完成",
      data: {
        projectId: params.projectId,
        databaseName,
        dumpPath,
        dockerfilePath,
        imageTag, // 数据库镜像地址
        mysqlId, // Dokploy MySQL 服务ID
        mysqlAppName, // Dokploy 分配的 appName（用于连接）
        dbUrl, // 完整的数据库连接地址
        environmentId,
        mysqlServiceName,
        mysqlUser: MYSQL_DEFAULT_USER,
        mysqlPassword: MYSQL_DEFAULT_PASSWORD,
      },
    };
  } catch (error) {
    console.log(`[PREDEPLOY] ❌ 预部署失败: ${error.message}`);
    recordErrorLog(error, "predeploy");
    return {
      status: 1,
      message: "预部署失败",
      data: { error: error.message || "未知错误" },
    };
  }
}

module.exports = {
  predeploy,
  projectIdToDatabaseName,
  exportDatabase,
  updateDockerfile,
};
