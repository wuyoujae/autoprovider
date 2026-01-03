/**
 * 通过 SSH 远程获取指定数据库容器的 ID。
 * 容器名模式：<project>-<db>-<random>.<...>，例如 test-test-naym3y.1.xxxxx
 *
 * 入参：
 *  - projectId: 项目名（可选，如果容器名只包含 dbName，可不传）
 *  - dbName: 数据库名（必填）
 *  - serviceName: 可选，服务名/容器名前缀（例如 <projectId>-db）
 *  - host / port / username / password / privateKey / privateKeyPath：可覆盖默认 SSH 连接配置
 *
 * 默认从环境变量读取：
 *  - SSH_HOST / SSH_PORT / SSH_USER / SSH_PASSWORD / SSH_KEY_PATH
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
      `[ssh2:getDbContainerId] ⚠️ 无法读取私钥 ${customPath}: ${err.message}`
    );
    return undefined;
  }
};

/**
 * 构造容器名的正则片段
 */
const buildNamePattern = (projectId, dbName, serviceName) => {
  const escape = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  if (serviceName) {
    return `^${escape(serviceName)}-[^.]+\\.`; // e.g. proj-db-xxxx.
  }
  if (projectId) {
    return `^${escape(projectId)}-${escape(dbName)}-[^.]+\\.`; // e.g. proj-myapp_xxx-xxxx.
  }
  return `^${escape(dbName)}-[^.]+\\.`; // e.g. myapp_xxx-xxxx.
};

/**
 * 获取 DB 容器 ID
 * @param {Object} params
 * @returns {Promise<{status: number, message: string, data: {containerId: string|null, output: string}}>}
 */
async function getDbContainerId(params = {}) {
  const {
    projectId,
    dbName,
    serviceName,
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

  if (!dbName) {
    return {
      status: 1,
      message: "dbName 不能为空",
      data: { containerId: null, output: "" },
    };
  }

  const key =
    privateKey || (password ? undefined : loadPrivateKey(privateKeyPath));

  const patterns = [
    buildNamePattern(projectId, dbName, serviceName),
    // 回退：仅 projectId + "-db"
    serviceName
      ? null
      : projectId
      ? `^${projectId.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}-db-[^.]+\\.`
      : null,
    // 回退：仅 dbName
    `^${dbName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}-[^.]+\\.`,
  ].filter(Boolean);

  const baseCmd =
    "docker ps --format '{{.ID}} {{.Names}}' | awk '$2 ~ /PATTERN/ {print $1}'";

  return new Promise((resolve) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";

    const tryPattern = (idx) => {
      if (idx >= patterns.length) {
        resolve({
          status: 1,
          message: "not found",
          data: { containerId: null, output: stdout.trim() || stderr.trim() },
        });
        conn.end();
        return;
      }
      const pattern = patterns[idx];
      const cmd = baseCmd.replace("PATTERN", pattern);
      stdout = "";
      stderr = "";

      conn.exec(cmd, (err, stream) => {
        if (err) {
          resolve({
            status: 1,
            message: `执行命令失败: ${err.message}`,
            data: { containerId: null, output: "" },
          });
          conn.end();
          return;
        }
        stream
          .on("close", () => {
            const containerId =
              stdout.trim().split("\n").filter(Boolean)[0] || null;
            if (containerId) {
              conn.end();
              resolve({
                status: 0,
                message: "success",
                data: { containerId, output: stdout.trim() || stderr.trim() },
              });
            } else {
              tryPattern(idx + 1);
            }
          })
          .on("data", (data) => {
            stdout += data.toString();
          })
          .stderr.on("data", (data) => {
            stderr += data.toString();
          });
      });
    };

    conn
      .on("ready", () => {
        tryPattern(0);
      })
      .on("error", (err) => {
        resolve({
          status: 1,
          message: `SSH 连接错误: ${err.message}`,
          data: { containerId: null, output: stderr || stdout },
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
  getDbContainerId,
};
