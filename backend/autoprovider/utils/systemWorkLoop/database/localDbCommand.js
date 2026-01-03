/**
 * 本地 Docker 数据库操作模块
 * 使用 Dockerode 直接操作本地 Docker 容器执行 MySQL 命令
 */

const { docker } = require("../../docker");
const recordErrorLog = require("../../recordErrorLog");

// MySQL 默认凭据（与 initDatabase.js 保持一致）
const MYSQL_DEFAULT_USER = "autoprovider";
const MYSQL_DEFAULT_PASSWORD = "123456";

/**
 * 在本地 Docker 容器中执行 MySQL 命令
 * @param {Object} params
 * @param {string} params.containerId - 容器 ID
 * @param {string} params.sql - 要执行的 SQL 语句
 * @param {string} [params.dbName] - 数据库名称（可选）
 * @param {string} [params.user] - MySQL 用户名（默认：autoprovider）
 * @param {string} [params.password] - MySQL 密码（默认：123456）
 * @returns {Promise<{status: number, message: string, data: {output: string}}>}
 */
const executeLocalDbCommand = async ({
  containerId,
  sql,
  dbName,
  user = MYSQL_DEFAULT_USER,
  password = MYSQL_DEFAULT_PASSWORD,
}) => {
  if (!containerId) {
    return {
      status: 1,
      message: "containerId 不能为空",
      data: { output: "" },
    };
  }

  if (!sql) {
    return {
      status: 1,
      message: "sql 不能为空",
      data: { output: "" },
    };
  }

  try {
    const container = docker.getContainer(containerId);

    // 检查容器是否存在且运行中
    const containerInfo = await container.inspect();
    if (!containerInfo.State.Running) {
      return {
        status: 1,
        message: "容器未运行",
        data: { output: "" },
      };
    }

    // 构建 MySQL 命令
    // -N: 不输出列名（表头）
    // -B: 批处理模式（tab分隔）
    const dbFlag = dbName ? ["-D", dbName] : [];
    const cmd = [
      "mysql",
      "-u",
      user,
      `-p${password}`,
      "-N",
      "-B",
      ...dbFlag,
      "-e",
      sql,
    ];

    console.log(
      `[localDbCommand] 执行命令: mysql -u ${user} -p*** ${
        dbName ? `-D ${dbName}` : ""
      } -e '${sql.substring(0, 100)}...'`
    );

    // 创建 exec 实例
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
    });

    // 执行并获取输出
    return new Promise((resolve) => {
      exec.start({ hijack: true, stdin: false }, (err, stream) => {
        if (err) {
          console.error(`[localDbCommand] exec.start 错误:`, err.message);
          resolve({
            status: 1,
            message: `执行命令失败: ${err.message}`,
            data: { output: "" },
          });
          return;
        }

        let stdout = "";
        let stderr = "";

        // Docker exec 返回的是 multiplexed stream，需要 demux
        container.modem.demuxStream(
          stream,
          {
            write: (chunk) => {
              stdout += chunk.toString();
            },
          },
          {
            write: (chunk) => {
              stderr += chunk.toString();
            },
          }
        );

        stream.on("end", () => {
          const rawStdout = stdout.trim();
          const rawStderr = stderr.trim();

          // 过滤掉 mysql 密码 warning，只保留真正的错误
          const errorLines = rawStderr
            .split("\n")
            .map((l) => l.trim())
            .filter(
              (l) =>
                l &&
                !/^mysql: \[Warning\]/i.test(l) &&
                !/using a password on the command line interface can be insecure/i.test(
                  l
                )
            );

          const isError = errorLines.length > 0;

          if (isError) {
            console.error(
              `[localDbCommand] MySQL 错误:`,
              errorLines.join("\n")
            );
          }

          resolve({
            status: isError ? 1 : 0,
            message: isError ? errorLines.join("\n") : "success",
            data: { output: rawStdout },
          });
        });

        stream.on("error", (streamErr) => {
          console.error(`[localDbCommand] stream 错误:`, streamErr.message);
          resolve({
            status: 1,
            message: `流错误: ${streamErr.message}`,
            data: { output: stderr || stdout },
          });
        });
      });
    });
  } catch (error) {
    console.error(`[localDbCommand] 执行失败:`, error.message);
    recordErrorLog(error, "localDbCommand - executeLocalDbCommand");
    return {
      status: 1,
      message: error.message,
      data: { output: "" },
    };
  }
};

/**
 * 查找本地 Docker 数据库容器
 * @param {Object} params
 * @param {string} params.projectId - 项目 ID
 * @param {string} [params.containerName] - 容器名称（可选，默认根据 projectId 生成）
 * @returns {Promise<{status: number, message: string, data: {containerId: string|null}}>}
 */
const findLocalDbContainer = async ({ projectId, containerName }) => {
  if (!projectId && !containerName) {
    return {
      status: 1,
      message: "projectId 或 containerName 不能都为空",
      data: { containerId: null },
    };
  }

  try {
    // 容器名格式：autoprovider-db-<projectId with _ instead of ->
    const expectedName =
      containerName || `autoprovider-db-${projectId.replace(/-/g, "_")}`;

    console.log(`[localDbCommand] 查找容器: ${expectedName}`);

    // 列出所有容器（包括停止的）
    const containers = await docker.listContainers({ all: true });

    for (const containerInfo of containers) {
      // Docker 容器名以 / 开头
      const names = containerInfo.Names || [];
      const matchedName = names.find(
        (name) => name === `/${expectedName}` || name === expectedName
      );

      if (matchedName) {
        console.log(
          `[localDbCommand] ✅ 找到容器: ${containerInfo.Id.substring(
            0,
            12
          )} (${matchedName})`
        );
        return {
          status: 0,
          message: "success",
          data: {
            containerId: containerInfo.Id,
            containerName: expectedName,
            state: containerInfo.State,
          },
        };
      }
    }

    console.log(`[localDbCommand] ⚠️ 未找到容器: ${expectedName}`);
    return {
      status: 1,
      message: `未找到容器: ${expectedName}`,
      data: { containerId: null },
    };
  } catch (error) {
    console.error(`[localDbCommand] 查找容器失败:`, error.message);
    recordErrorLog(error, "localDbCommand - findLocalDbContainer");
    return {
      status: 1,
      message: error.message,
      data: { containerId: null },
    };
  }
};

/**
 * 检查 Docker 是否可用
 * @returns {Promise<boolean>}
 */
const isDockerAvailable = async () => {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  executeLocalDbCommand,
  findLocalDbContainer,
  isDockerAvailable,
  MYSQL_DEFAULT_USER,
  MYSQL_DEFAULT_PASSWORD,
};
