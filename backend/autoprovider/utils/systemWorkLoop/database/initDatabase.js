const fs = require("fs/promises");
const path = require("path");
const { docker } = require("../../docker");
const recordErrorLog = require("../../recordErrorLog");

// MySQL 默认配置
const MYSQL_DEFAULT_USER = "autoprovider";
const MYSQL_DEFAULT_PASSWORD = "123456";
const MYSQL_DEFAULT_ROOT_PASSWORD = "root123456";
const MYSQL_IMAGE = "mysql:8.0";

/**
 * 拉取 MySQL 镜像（如果本地不存在）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const pullMySQLImage = async () => {
  try {
    console.log(`[initDatabase] 检查 MySQL 镜像: ${MYSQL_IMAGE}`);
    
    // 检查镜像是否存在
    try {
      await docker.getImage(MYSQL_IMAGE).inspect();
      console.log(`[initDatabase] ✅ MySQL 镜像已存在`);
      return { success: true };
    } catch (inspectError) {
      // 镜像不存在，需要拉取
      console.log(`[initDatabase] 📥 开始拉取 MySQL 镜像...`);
    }

    // 拉取镜像
    return new Promise((resolve, reject) => {
      docker.pull(MYSQL_IMAGE, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        docker.modem.followProgress(
          stream,
          (err, output) => {
            if (err) {
              reject(err);
            } else {
              console.log(`[initDatabase] ✅ MySQL 镜像拉取完成`);
              resolve({ success: true });
            }
          },
          (event) => {
            // 显示拉取进度
            if (event.status) {
              const progress = event.progress || "";
              console.log(`[initDatabase] ${event.status} ${progress}`);
            }
          }
        );
      });
    });
  } catch (error) {
    console.error(`[initDatabase] ❌ 拉取 MySQL 镜像失败:`, error.message);
    recordErrorLog(error, "initDatabase - pullMySQLImage");
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * 创建 MySQL 容器
 * @param {Object} params
 * @param {string} params.containerName - 容器名称
 * @param {string} params.databaseName - 数据库名称
 * @param {string} [params.user] - 数据库用户名（默认：autoprovider）
 * @param {string} [params.password] - 数据库密码（默认：123456）
 * @param {string} [params.rootPassword] - root 密码（默认：root123456）
 * @param {number} [params.port] - 宿主机端口（默认：0，自动分配）
 * @returns {Promise<{success: boolean, data?: {containerId: string, port: number, dbUrl: string}, error?: string}>}
 */
const createMySQLContainer = async ({
  containerName,
  databaseName,
  user = MYSQL_DEFAULT_USER,
  password = MYSQL_DEFAULT_PASSWORD,
  rootPassword = MYSQL_DEFAULT_ROOT_PASSWORD,
  port = 0, // 0 表示自动分配端口
}) => {
  try {
    console.log(`[initDatabase] 🐳 创建 MySQL 容器: ${containerName}`);
    console.log(`[initDatabase]   - 数据库: ${databaseName}`);
    console.log(`[initDatabase]   - 用户: ${user}`);

    // 1. 拉取镜像
    const pullResult = await pullMySQLImage();
    if (!pullResult.success) {
      return pullResult;
    }

    // 2. 创建容器
    const containerConfig = {
      name: containerName,
      Image: MYSQL_IMAGE,
      Env: [
        `MYSQL_ROOT_PASSWORD=${rootPassword}`,
        `MYSQL_DATABASE=${databaseName}`,
        `MYSQL_USER=${user}`,
        `MYSQL_PASSWORD=${password}`,
      ],
      ExposedPorts: {
        "3306/tcp": {},
      },
      HostConfig: {
        PortBindings: {
          "3306/tcp": [{ HostPort: port.toString() }],
        },
        RestartPolicy: {
          Name: "unless-stopped", // 自动重启
        },
      },
      Labels: {
        "app.type": "database",
        "app.database": "mysql",
        "app.managed-by": "autoprovider",
      },
    };

    const container = await docker.createContainer(containerConfig);
    console.log(`[initDatabase] ✅ 容器创建成功: ${container.id}`);

    // 3. 启动容器
    await container.start();
    console.log(`[initDatabase] ✅ 容器已启动`);

    // 4. 获取容器详细信息（包括分配的端口）
    const containerInfo = await container.inspect();
    const hostPort =
      containerInfo.NetworkSettings.Ports["3306/tcp"]?.[0]?.HostPort;

    if (!hostPort) {
      throw new Error("无法获取容器端口映射");
    }

    console.log(`[initDatabase] ✅ MySQL 端口: ${hostPort}`);

    // 5. 生成 DB_URL
    const dbUrl = `mysql://${user}:${password}@localhost:${hostPort}/${databaseName}`;

    // 6. 等待 MySQL 就绪（简单延迟，实际应该用健康检查）
    console.log(`[initDatabase] ⏳ 等待 MySQL 初始化...`);
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 等待10秒
    console.log(`[initDatabase] ✅ MySQL 初始化完成`);

    return {
      success: true,
      data: {
        containerId: container.id,
        containerName,
        port: parseInt(hostPort),
        dbUrl,
        databaseName,
        user,
      },
    };
  } catch (error) {
    console.error(`[initDatabase] ❌ 创建 MySQL 容器失败:`, error.message);
    recordErrorLog(error, "initDatabase - createMySQLContainer");
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * 写入 DB_URL 到项目的 .env 文件
 * @param {string} projectPath - 项目路径
 * @param {string} dbUrl - 数据库连接 URL
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const writeDbUrlToEnv = async (projectPath, dbUrl) => {
  try {
    const envFilePath = path.join(projectPath, ".env");
    
    let envContent = "";
    try {
      envContent = await fs.readFile(envFilePath, "utf-8");
    } catch {
      // 文件不存在则创建
      envContent = "";
    }

    // 更新或添加 DB_URL
    if (/^DB_URL=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^DB_URL=.*$/m, `DB_URL=${dbUrl}`);
    } else {
      envContent = `${
        envContent.trim().length ? `${envContent.trimEnd()}\n` : ""
      }DB_URL=${dbUrl}\n`;
    }

    await fs.writeFile(envFilePath, envContent, "utf-8");
    console.log(`[initDatabase] ✅ DB_URL 已写入 .env`);
    
    return { success: true };
  } catch (error) {
    console.error(`[initDatabase] ❌ 写入 DB_URL 失败:`, error.message);
    recordErrorLog(error, "initDatabase - writeDbUrlToEnv");
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * 初始化项目数据库
 * - 如果配置了 Dokploy，则跳过（由调用方处理远程数据库）
 * - 否则，创建本地 Docker MySQL 容器
 * 
 * @param {Object} params
 * @param {string} params.projectId - 项目ID
 * @param {string} params.projectPath - 项目路径
 * @param {string} params.databaseName - 数据库名称
 * @param {boolean} [params.useDokploy] - 是否使用 Dokploy（默认：根据环境变量判断）
 * @returns {Promise<{success: boolean, data?: {containerId: string, dbUrl: string, type: 'docker'|'dokploy'}, error?: string}>}
 */
const initDatabase = async ({
  projectId,
  projectPath,
  databaseName,
  useDokploy = null,
}) => {
  try {
    // 判断是否使用 Dokploy
    const shouldUseDokploy =
      useDokploy !== null
        ? useDokploy
        : !!(process.env.DOKPLOY_BASE_URL && process.env.DOKPLOY_API_KEY);

    if (shouldUseDokploy) {
      console.log(
        `[initDatabase] 🌐 检测到 Dokploy 配置，跳过本地数据库创建`
      );
      return {
        success: true,
        data: {
          type: "dokploy",
          message: "使用 Dokploy 远程数据库",
        },
      };
    }

    console.log(`[initDatabase] 🐳 开始创建本地 Docker MySQL 容器...`);

    // 创建 MySQL 容器
    const containerName = `autoprovider-db-${projectId.replace(/-/g, "_")}`;
    const createResult = await createMySQLContainer({
      containerName,
      databaseName,
    });

    if (!createResult.success) {
      return createResult;
    }

    // 写入 DB_URL 到项目 .env
    const writeResult = await writeDbUrlToEnv(
      projectPath,
      createResult.data.dbUrl
    );

    if (!writeResult.success) {
      // 写入失败，但容器已创建，需要清理
      console.log(`[initDatabase] ⚠️ 写入失败，清理容器...`);
      try {
        const container = docker.getContainer(createResult.data.containerId);
        await container.stop();
        await container.remove();
        console.log(`[initDatabase] ✅ 容器已清理`);
      } catch (cleanupError) {
        console.error(
          `[initDatabase] ❌ 清理容器失败:`,
          cleanupError.message
        );
      }
      return writeResult;
    }

    console.log(
      `[initDatabase] 🎉 本地数据库初始化完成 (容器: ${createResult.data.containerId.substring(0, 12)})`
    );

    return {
      success: true,
      data: {
        type: "docker",
        containerId: createResult.data.containerId,
        containerName: createResult.data.containerName,
        port: createResult.data.port,
        dbUrl: createResult.data.dbUrl,
        databaseName: createResult.data.databaseName,
      },
    };
  } catch (error) {
    console.error(`[initDatabase] ❌ 数据库初始化失败:`, error.message);
    recordErrorLog(error, "initDatabase");
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  initDatabase,
  createMySQLContainer,
  pullMySQLImage,
  writeDbUrlToEnv,
};

