/**
 * 简单的 SSH 连通性测试脚本
 * 环境变量：
 *   SSH_HOST        目标主机，默认 165.154.23.73
 *   SSH_PORT        端口，默认 22
 *   SSH_USER        用户名，默认 root
 *   SSH_PASSWORD    密码（可选，优先使用密钥）
 *   SSH_KEY_PATH    私钥路径，默认 ~/.ssh/id_rsa
 *   SSH_TEST_CMD    测试命令，默认打印 docker 名称列表
 */

const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = process.env.SSH_HOST || "165.154.23.73";
const port = Number(process.env.SSH_PORT || 22);
const username = process.env.SSH_USER || "root";
const password = process.env.SSH_PASSWORD;
const privateKeyPath =
  process.env.SSH_KEY_PATH ||
  path.join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".ssh",
    "id_rsa"
  );
const testCmd =
  process.env.SSH_TEST_CMD ||
  "docker ps --format '{{.ID}} {{.Names}}' | head -n 5";

let privateKey = undefined;
if (!password) {
  try {
    privateKey = fs.readFileSync(privateKeyPath);
  } catch (err) {
    console.log(
      `[ssh-test] ⚠️ 无法读取密钥文件 ${privateKeyPath}: ${err.message}`
    );
  }
}

console.log(`[ssh-test] target: ${username}@${host}:${port}`);
console.log(`[ssh-test] command: ${testCmd}`);

const conn = new Client();

conn
  .on("ready", () => {
    console.log("[ssh-test] ✅ SSH 连接成功，开始执行命令...");
    conn.exec(testCmd, (err, stream) => {
      if (err) {
        console.error(`[ssh-test] ❌ 执行命令失败: ${err.message}`);
        conn.end();
        return;
      }
      stream
        .on("close", (code, signal) => {
          console.log(
            `[ssh-test] ✅ 命令结束 code=${code} signal=${signal || "none"}`
          );
          conn.end();
        })
        .on("data", (data) => process.stdout.write(data))
        .stderr.on("data", (data) => process.stderr.write(data));
    });
  })
  .on("error", (err) => {
    console.error(`[ssh-test] ❌ 连接错误: ${err.message}`);
  })
  .on("end", () => {
    console.log("[ssh-test] 连接已关闭");
  })
  .connect({
    host,
    port,
    username,
    password,
    privateKey,
    tryKeyboard: false,
  });
