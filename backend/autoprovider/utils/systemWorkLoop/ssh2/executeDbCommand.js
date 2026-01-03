/**
 * 在远程容器内执行 MySQL 命令：
 *   docker exec <containerId> mysql -u autoprovider -p123456 [-D dbName] -e '<sql>'
 *
 * 入参：
 *  - containerId: 必填，目标容器 ID
 *  - sql: 必填，要执行的 SQL 语句
 *  - dbName: 可选，指定数据库名（会加上 -D dbName）
 *  - SSH 连接参数：host/port/username/password/privateKey/privateKeyPath
 *
 * 默认 SSH 配置来自环境变量：
 *  SSH_HOST / SSH_PORT / SSH_USER / SSH_PASSWORD / SSH_KEY_PATH
 */

const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const loadPrivateKey = (customPath) => {
  if (!customPath) return undefined;
  try {
    return fs.readFileSync(customPath);
  } catch (err) {
    console.log(
      `[ssh2:executeDbCommand] ⚠️ 无法读取私钥 ${customPath}: ${err.message}`
    );
    return undefined;
  }
};

const escapeSingleQuotes = (text = "") => text.replace(/'/g, `'\\''`); // 用单引号包裹时的转义

/**
 * 远程执行 MySQL 命令
 * @param {Object} params
 * @returns {Promise<{status: number, message: string, data: {output: string}}>}
 */
async function executeDbCommand(params = {}) {
  const {
    containerId,
    sql,
    dbName,
    host = process.env.SSH_HOST || "165.154.23.73",
    port = Number(process.env.SSH_PORT || 22),
    username = process.env.SSH_USER || "root",
    password = process.env.SSH_PASSWORD,
    privateKeyPath = params.privateKeyPath ||
      process.env.SSH_KEY_PATH ||
      path.join(
        process.env.HOME || process.env.USERPROFILE || "",
        ".ssh",
        "id_rsa"
      ),
    privateKey = params.privateKey,
  } = params;

  if (!containerId) {
    return { status: 1, message: "containerId 不能为空", data: { output: "" } };
  }
  if (!sql) {
    return { status: 1, message: "sql 不能为空", data: { output: "" } };
  }

  const key =
    privateKey || (password ? undefined : loadPrivateKey(privateKeyPath));
  const escapedSql = escapeSingleQuotes(sql);
  const dbFlag = dbName ? `-D ${dbName} ` : "";
  // -N: 不输出列名（表头）  -B: 批处理模式（tab分隔）
  const cmd = `docker exec ${containerId} mysql -u autoprovider -p123456 -N -B ${dbFlag}-e '${escapedSql}'`;

  return new Promise((resolve) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";

    conn
      .on("ready", () => {
        conn.exec(cmd, (err, stream) => {
          if (err) {
            resolve({
              status: 1,
              message: `执行命令失败: ${err.message}`,
              data: { output: "" },
            });
            conn.end();
            return;
          }
          stream
            .on("close", () => {
              conn.end();
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
              // 只返回 stdout 作为输出，不混入 stderr
              resolve({
                status: isError ? 1 : 0,
                message: isError ? errorLines.join("\n") : "success",
                data: { output: rawStdout },
              });
            })
            .on("data", (data) => {
              stdout += data.toString();
            })
            .stderr.on("data", (data) => {
              stderr += data.toString();
            });
        });
      })
      .on("error", (err) => {
        resolve({
          status: 1,
          message: `SSH 连接错误: ${err.message}`,
          data: { output: stderr || stdout },
        });
      })
      .connect({
        host,
        port,
        username,
        password,
        privateKey: key,
        tryKeyboard: false,
      });
  });
}

module.exports = {
  executeDbCommand,
};
