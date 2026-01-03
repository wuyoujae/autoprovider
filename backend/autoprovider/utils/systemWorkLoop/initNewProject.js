const fs = require("fs/promises");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const pool = require("../../db");
const recordErrorLog = require("../recordErrorLog");
const getFilesTree = require("../AIfunction/getFilesTree");
const bashOperation = require("../AIfunction/bashOperation");
const getProjectsBasePath = require("../getProjectsBasePath");
const DokployClient = require("../dokploy/client");
const { deployProject } = require("./deploy/deployProject");
const { getDbContainerId } = require("./ssh2/getDbContainerId");
const { initDatabase } = require("./database/initDatabase");
const MYSQL_DEFAULT_USER = "autoprovider";
const MYSQL_DEFAULT_PASSWORD = "123456";

// 配置常量（可以根据需要修改）
const TEMPLATE_PATH = path.join(__dirname, "../../template/app"); // template文件夹路径
// 项目存放的基础路径：优先环境变量 PROJECTS_BASE_PATH，否则使用 getProjectsBasePath()
const PROJECTS_BASE_PATH =
  process.env.PROJECTS_BASE_PATH && process.env.PROJECTS_BASE_PATH.trim()
    ? process.env.PROJECTS_BASE_PATH.trim()
    : getProjectsBasePath();

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * 递归复制文件夹（异步）
 * @param {string} src - 源文件夹路径
 * @param {string} dest - 目标文件夹路径
 */
const copyDirectory = async (src, dest) => {
  // 创建目标目录
  if (!(await pathExists(dest))) {
    await fs.mkdir(dest, { recursive: true });
  }

  // 读取源目录内容
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 递归复制子目录
      await copyDirectory(srcPath, destPath);
    } else {
      // 复制文件
      await fs.copyFile(srcPath, destPath);
    }
  }
};

/**
 * 更新新项目中的数据库名称（.env 与 lib/db.ts 默认值）
 * @param {string} projectPath
 * @param {string} dbName
 */
const updateProjectDbName = async (projectPath, dbName) => {
  const envPath = path.join(projectPath, ".env");
  try {
    let envContent = "";
    if (await pathExists(envPath)) {
      envContent = await fs.readFile(envPath, "utf-8");
    }

    if (/^DB_NAME=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^DB_NAME=.*$/m, `DB_NAME=${dbName}`);
    } else {
      envContent = `${
        envContent.trim().length ? `${envContent.trimEnd()}\n` : ""
      }DB_NAME=${dbName}\n`;
    }

    await fs.writeFile(envPath, envContent, "utf-8");
  } catch (error) {
    recordErrorLog(error, "initNewProject - writeEnvDbName");
  }

  const dbFilePath = path.join(projectPath, "lib", "db.ts");
  try {
    if (await pathExists(dbFilePath)) {
      const dbContent = await fs.readFile(dbFilePath, "utf-8");
      const replacedContent = dbContent.replace(
        /database:\s*process\.env\.DB_NAME\s*\|\|\s*"(.*?)"/,
        `database: process.env.DB_NAME || "${dbName}"`
      );

      if (replacedContent !== dbContent) {
        await fs.writeFile(dbFilePath, replacedContent, "utf-8");
      }
    }
  } catch (error) {
    recordErrorLog(error, "initNewProject - updateDbTs");
  }
};

/**
 * 初始化脚本（异步执行，不阻塞主流程）
 * @param {string} projectId - 项目ID
 * @param {string} dokployProjectId - Dokploy 项目ID（可选，用于自动部署）
 * @returns {Promise<boolean>}
 */
const initScript = async (projectId, dokployProjectId = null) => {
  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[DEPLOY] 🚀 开始初始化项目: ${projectId}`);
    console.log(`${"=".repeat(60)}`);

    // Next.js 项目 npm install
    console.log(`\n[DEPLOY] 📦 步骤 1/2: 安装项目依赖 (npm install)...`);
    const installStart = Date.now();
    const installResult = await bashOperation(
      {
        commands: [
          {
            working_directory: "/app",
            instruction: "npm install",
          },
        ],
      },
      {
        projectId,
        skipSendMessage: true,
      }
    );
    if (installResult.status !== 0) {
      console.log(
        `[DEPLOY] ⚠️ 依赖安装可能有问题: ${installResult.data?.error || "未知"}`
      );
    }
    console.log(
      `[DEPLOY] ✅ 依赖安装完成 (${((Date.now() - installStart) / 1000).toFixed(
        1
      )}s)`
    );

    // npm install 完成后，不再自动部署到 Dokploy（根据需求改为手动部署，节省资源）
    if (dokployProjectId) {
      console.log(
        `\n[DEPLOY] 🛑 步骤 2/2: 跳过自动部署 (dokployProjectId: ${dokployProjectId})`
      );
      console.log(`[DEPLOY]    请在项目准备就绪后，手动触发部署流程`);
    }

    // 初始化完成
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[DEPLOY] 🎉 项目初始化完成: ${projectId}`);
    console.log(`${"=".repeat(60)}\n`);
    return true;
  } catch (error) {
    console.log(`[DEPLOY] ❌ 初始化失败: ${error.message}`);
    recordErrorLog(error, "initScript");
    return false;
  }
};

/**
 * 初始化新项目
 * @param {Object} params - 参数对象
 * @param {string} params.user_id - 用户ID
 * @returns {Promise<Object>} 返回项目信息对象，如果失败则返回包含 error 的对象
 */
const initNewProject = async ({ user_id }) => {
  const connection = await pool.getConnection();
  let dokployClient = null;
  let dokployProjectId = null;
  let dbUrlFromRemote = null;
  let dbContainerId = null;

  try {
    // 参数验证
    if (!user_id) {
      return {
        error: "用户ID不能为空",
      };
    }

    // 开启事务
    await connection.beginTransaction();

    // 1. 生成项目ID
    const project_id = uuidv4();
    const sanitizedProjectId = project_id.replace(/-/g, "_");
    const dbName = `myapp_${sanitizedProjectId}`;

    await connection.query("use autoprovider_open");
    // 2. 在MySQL中插入项目信息
    const insertProjectSql = `INSERT INTO project_info 
      (project_id, author_id, project_name, project_icon, project_url, project_status, create_time) 
      VALUES (?, ?, ?, ?, ?, ?, NOW())`;

    await connection.query(insertProjectSql, [
      project_id,
      user_id,
      "新项目", // 默认项目名称
      "", // 默认图标为空
      "", // 默认URL为空
      0, // 项目状态：使用中
    ]);

    // 提交事务
    await connection.commit();

    // 2.1. 在 Dokploy 中创建项目（异步，不阻塞主流程）
    try {
      // 仅当明确配置了 Dokploy 地址和 API KEY 时才执行
      const dokployBaseUrl = process.env.DOKPLOY_BASE_URL;
      const dokployApiKey = process.env.DOKPLOY_API_KEY;

      if (dokployBaseUrl && dokployApiKey) {
        // 清理 API Key（去除首尾空格和换行符）
        const cleanedApiKey = dokployApiKey.trim().replace(/\r?\n/g, "");

        dokployClient =
          dokployClient ||
          new DokployClient({
            baseUrl: dokployBaseUrl,
            apiKey: cleanedApiKey,
          });

        const dokployResult = await dokployClient.createProject({
          name: project_id, // 使用 projectId 作为项目名称
          description: `项目 ${project_id} 的 Dokploy 项目`,
          env: JSON.stringify({}), // 必需参数，先传空对象
        });

        // 获取 Dokploy 项目ID（API 返回结构: {project: {...}, environment: {...}}）
        dokployProjectId =
          dokployResult.data?.project?.projectId ||
          dokployResult.data?.projectId ||
          dokployResult.data?.id;

        // 更新数据库中的 dokploy_id
        if (dokployProjectId) {
          await connection.query(
            "UPDATE project_info SET dokploy_id = ? WHERE project_id = ?",
            [dokployProjectId, project_id]
          );
          console.log(
            `[initNewProject] 已更新 dokploy_id: ${dokployProjectId}`
          );
        }
      }
    } catch (dokployError) {
      // Dokploy 创建失败不影响项目创建，只记录错误
      recordErrorLog(dokployError, "initNewProject - createDokployProject");
    }

    // 3. 检查template文件夹是否存在
    if (!(await pathExists(TEMPLATE_PATH))) {
      return {
        error: `模板文件夹不存在: ${TEMPLATE_PATH}`,
      };
    }

    // 4. 确保项目基础目录存在
    if (!(await pathExists(PROJECTS_BASE_PATH))) {
      await fs.mkdir(PROJECTS_BASE_PATH, { recursive: true });
    }

    // 5. 目标项目路径（以project_id命名）
    const targetProjectPath = path.join(PROJECTS_BASE_PATH, project_id);

    // 6. 检查目标路径是否已存在
    if (await pathExists(targetProjectPath)) {
      return {
        error: `项目文件夹已存在: ${targetProjectPath}`,
      };
    }

    // 7. 复制template文件夹到目标位置
    try {
      await copyDirectory(TEMPLATE_PATH, targetProjectPath);
    } catch (error) {
      recordErrorLog(error, "initNewProject - copyDirectory");
      return {
        error: `复制模板文件夹失败: ${error.message}`,
      };
    }

    // 7.1. 更新项目内的数据库名称配置
    await updateProjectDbName(targetProjectPath, dbName);

    // 7.2. 初始化数据库
    // - 如果配置了 Dokploy，则在 Dokploy 中创建远程 MySQL
    // - 否则，使用 Docker 创建本地 MySQL 容器
    const useDokploy = !!(dokployClient && dokployProjectId);
    
    if (!useDokploy) {
      // 使用本地 Docker 数据库
      console.log(`[initNewProject] 🐳 开始创建本地 Docker MySQL 容器...`);
      const dbResult = await initDatabase({
        projectId: project_id,
        projectPath: targetProjectPath,
        databaseName: dbName,
        useDokploy: false,
      });

      if (dbResult.success && dbResult.data.type === "docker") {
        dbContainerId = dbResult.data.containerId;
        console.log(
          `[initNewProject] ✅ 本地数据库创建成功 (容器: ${dbContainerId.substring(0, 12)})`
        );
        console.log(`[initNewProject]    DB_URL: ${dbResult.data.dbUrl}`);
      } else if (!dbResult.success) {
        console.log(
          `[initNewProject] ⚠️ 本地数据库创建失败: ${dbResult.error}`
        );
        recordErrorLog(
          new Error(dbResult.error),
          "initNewProject - localDatabase"
        );
      }
    }

    // 7.3. 在 Dokploy 中创建远程 MySQL 并写入 DB_URL
    try {
      if (dokployClient && dokployProjectId) {
        console.log(`[initNewProject] ⚙️ 开始创建远程 MySQL 服务...`);

        // 获取或创建 Environment
        let environmentId = null;
        try {
          const envResult = await dokployClient.getEnvironmentsByProjectId(
            dokployProjectId
          );
          if (
            envResult.status === 200 &&
            Array.isArray(envResult.data) &&
            envResult.data.length > 0
          ) {
            environmentId = envResult.data[0].environmentId;
            console.log(`[initNewProject] ✅ 找到环境: ${environmentId}`);
          } else {
            console.log(`[initNewProject] 环境不存在，创建 production...`);
            const createEnvResult = await dokployClient.createEnvironment({
              name: "production",
              description: "Production environment",
              projectId: dokployProjectId,
            });
            environmentId =
              createEnvResult.data?.environment?.environmentId ||
              createEnvResult.data?.environmentId ||
              createEnvResult.data?.id;
            console.log(
              `[initNewProject] ✅ 环境创建成功: ${environmentId || "unknown"}`
            );
          }
        } catch (envError) {
          console.log(
            `[initNewProject] ❌ 获取/创建环境失败: ${envError.message}`
          );
          recordErrorLog(envError, "initNewProject - getOrCreateEnvironment");
        }

        if (environmentId) {
          const mysqlServiceName = `${project_id}-db`;
          console.log(
            `[initNewProject] 🗄️ 创建 MySQL 服务: ${mysqlServiceName} (${dbName})`
          );

          try {
            const createMysqlResult = await dokployClient.createMySQL({
              name: mysqlServiceName,
              appName: mysqlServiceName,
              environmentId,
              databaseName: dbName,
              databaseUser: MYSQL_DEFAULT_USER,
              databasePassword: MYSQL_DEFAULT_PASSWORD,
              databaseRootPassword: MYSQL_DEFAULT_PASSWORD,
              description: `MySQL database for project ${project_id}`,
            });

            if (createMysqlResult.status === 200) {
              console.log(`[initNewProject] ✅ MySQL 服务创建成功`);
            } else {
              console.log(
                `[initNewProject] ❌ MySQL 服务创建失败: ${JSON.stringify(
                  createMysqlResult
                )}`
              );
            }
          } catch (createMysqlError) {
            console.log(
              `[initNewProject] ❌ MySQL 服务创建异常: ${createMysqlError.message}`
            );
            recordErrorLog(createMysqlError, "initNewProject - createMySQL");
          }

          // 获取 mysqlId
          let mysqlId = null;
          let mysqlAppName = null;
          try {
            await new Promise((r) => setTimeout(r, 1000));
            const projectResult = await dokployClient.getProject(
              dokployProjectId
            );
            if (projectResult.status === 200 && projectResult.data) {
              const projectData = projectResult.data;
              if (projectData.environments) {
                for (const env of projectData.environments) {
                  if (env.mysql && env.mysql.length > 0) {
                    const targetMysql = env.mysql.find(
                      (m) => m.name === mysqlServiceName
                    );
                    if (targetMysql) {
                      mysqlId = targetMysql.mysqlId;
                      break;
                    }
                  }
                }
              }
            }
          } catch (findMysqlError) {
            console.log(
              `[initNewProject] ⚠️ 获取 MySQL 服务信息失败: ${findMysqlError.message}`
            );
          }

          // 获取 appName
          if (mysqlId) {
            try {
              const mysqlResult = await dokployClient.getMySQL(mysqlId);
              if (mysqlResult.status === 200 && mysqlResult.data) {
                mysqlAppName = mysqlResult.data.appName;
                console.log(
                  `[initNewProject] ✅ 获取 MySQL appName: ${mysqlAppName}`
                );
              }
            } catch (mysqlDetailError) {
              console.log(
                `[initNewProject] ⚠️ 获取 MySQL 详情失败: ${mysqlDetailError.message}`
              );
            }
          }

          // 生成并写入 DB_URL
          if (mysqlAppName) {
            dbUrlFromRemote = `mysql://${MYSQL_DEFAULT_USER}:${MYSQL_DEFAULT_PASSWORD}@${mysqlAppName}:3306/${dbName}`;
            const envFilePath = path.join(targetProjectPath, ".env");
            try {
              let envContent = "";
              try {
                envContent = await fs.readFile(envFilePath, "utf-8");
              } catch {
                // 文件不存在则创建
                envContent = "";
              }

              if (/^DB_URL=.*$/m.test(envContent)) {
                envContent = envContent.replace(
                  /^DB_URL=.*$/m,
                  `DB_URL=${dbUrlFromRemote}`
                );
              } else {
                envContent = `${
                  envContent.trim().length ? `${envContent.trimEnd()}\n` : ""
                }DB_URL=${dbUrlFromRemote}\n`;
              }

              await fs.writeFile(envFilePath, envContent, "utf-8");
              console.log(`[initNewProject] ✅ .env 写入 DB_URL 成功`);
            } catch (envWriteError) {
              console.log(
                `[initNewProject] ⚠️ 写入 DB_URL 失败: ${envWriteError.message}`
              );
              recordErrorLog(envWriteError, "initNewProject - writeDbUrl");
            }
          }

          // 触发 MySQL 部署
          if (mysqlId) {
            try {
              await dokployClient.deployMySQL(mysqlId);
              console.log(`[initNewProject] ✅ 已触发 MySQL 部署`);
            } catch (deployMysqlError) {
              console.log(
                `[initNewProject] ⚠️ 触发 MySQL 部署失败: ${deployMysqlError.message}`
              );
              recordErrorLog(deployMysqlError, "initNewProject - deployMySQL");
            }
          }

          // 获取容器 ID（带重试机制，等待容器启动）
          const MAX_RETRIES = 5;
          const RETRY_DELAY = 3000; // 3秒

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              console.log(
                `[initNewProject] 🔄 尝试获取容器ID (${attempt}/${MAX_RETRIES})...`
              );
              // 第一次等待较长时间让容器启动
              const waitTime = attempt === 1 ? 5000 : RETRY_DELAY;
              await new Promise((r) => setTimeout(r, waitTime));

              const containerResult = await getDbContainerId({
                projectId: project_id,
                dbName,
                serviceName: `${project_id}-db`,
              });

              if (
                containerResult.status === 0 &&
                containerResult.data?.containerId
              ) {
                dbContainerId = containerResult.data.containerId;
                console.log(
                  `[initNewProject] ✅ 获取数据库容器ID成功: ${dbContainerId}`
                );
                break; // 成功获取，退出重试循环
              } else {
                console.log(
                  `[initNewProject] ⚠️ 第${attempt}次尝试未获取到容器ID: ${containerResult.message}`
                );
              }
            } catch (containerError) {
              console.log(
                `[initNewProject] ⚠️ 第${attempt}次获取容器ID异常: ${containerError.message}`
              );
              if (attempt === MAX_RETRIES) {
                recordErrorLog(
                  containerError,
                  "initNewProject - getDbContainerId"
                );
              }
            }
          }

          if (!dbContainerId) {
            console.log(
              `[initNewProject] ⚠️ ${MAX_RETRIES}次尝试后仍未获取到容器ID，将在后续查询时动态获取`
            );
          }
        }
      }
    } catch (remoteDbError) {
      console.log(
        `[initNewProject] ⚠️ 远程数据库创建流程异常: ${remoteDbError.message}`
      );
      recordErrorLog(remoteDbError, "initNewProject - remoteDatabase");
    }

    // 8. 异步调用initScript（不等待结果），完成后自动部署到 Dokploy
    initScript(project_id, dokployProjectId).catch((error) => {
      recordErrorLog(error, "initNewProject - initScript");
    });

    // 9. 获取项目文件树（Next.js 全栈项目，统一获取整个项目文件树）
    let filesTree = null;

    try {
      filesTree = getFilesTree(targetProjectPath);
    } catch (error) {
      // 文件树获取失败不影响项目创建
      recordErrorLog(error, "initNewProject - getFilesTree");
    }

    // 回写 db_id 到项目表（若获取到）
    try {
      await connection.query(
        "UPDATE project_info SET db_id = ? WHERE project_id = ?",
        [dbContainerId || null, project_id]
      );
    } catch (writeDbIdError) {
      recordErrorLog(writeDbIdError, "initNewProject - writeDbId");
    }

    // 10. 返回项目信息对象
    const infoObject = {
      project_id,
      project_name: "新项目",
      project_path: targetProjectPath,
      filesTree,
      dokploy_project_id: dokployProjectId, // 添加 Dokploy 项目ID
      db_id: dbContainerId || null,
    };

    return infoObject;
  } catch (error) {
    // 回滚事务
    if (connection) {
      await connection.rollback();
    }
    recordErrorLog(error, "initNewProject");
    return {
      error: `初始化项目失败: ${error.message}`,
    };
  } finally {
    // 释放连接
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  initNewProject,
};
