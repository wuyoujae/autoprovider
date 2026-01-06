// 加载环境变量（如果安装了 dotenv）
// 优先级：.env > .env.production > .env.development
// 生产环境：直接使用 .env 文件（推荐）
// 开发环境：使用 .env.development 文件
try {
  const dotenv = require("dotenv");
  const path = require("path");
  const fs = require("fs");

  // 优先加载 .env 文件（生产环境推荐使用此文件）
  const envPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("Loaded .env file");
  } else {
    // 如果 .env 不存在，根据 NODE_ENV 加载对应的文件
    const envFile =
      process.env.NODE_ENV === "production"
        ? ".env.production"
        : ".env.development";
    const envFilePath = path.resolve(__dirname, envFile);
    if (fs.existsSync(envFilePath)) {
      dotenv.config({ path: envFilePath });
      console.log(`Loaded ${envFile} file`);
    }
  }

  // 如果设置了 NODE_ENV，也尝试加载对应的环境文件（会覆盖 .env 中的配置）
  if (process.env.NODE_ENV === "production") {
    const prodEnvPath = path.resolve(__dirname, ".env.production");
    if (fs.existsSync(prodEnvPath)) {
      dotenv.config({ path: prodEnvPath });
      console.log("Loaded .env.production file (overrides .env)");
    }
  } else {
    const devEnvPath = path.resolve(__dirname, ".env.development");
    if (fs.existsSync(devEnvPath)) {
      dotenv.config({ path: devEnvPath });
      console.log("Loaded .env.development file (overrides .env)");
    }
  }

  console.log(
    `Environment: ${process.env.NODE_ENV || "development"} | Projects Path: ${
      process.env.PROJECTS_BASE_PATH || "relative path"
    }`
  );
} catch (e) {
  // dotenv 未安装时忽略错误，使用系统环境变量
  console.log("dotenv not installed, using system environment variables");
}

const express = require("express");
const app = express();
const cors = require("cors");
const router = require("./router");
const { bootstrapMySQL, shouldAutoInitDb } = require("./utils/dbBootstrap");
const getFilesTree = require("./utils/AIfunction/getFilesTree");
const createFile = require("./utils/AIfunction/createFile");
const editFile = require("./utils/AIfunction/editFile");
const readFile = require("./utils/AIfunction/readFile");
const linter = require("./utils/AIfunction/linter/linter");
const sqlOperation = require("./utils/AIfunction/sqlOperation");
const deleteFile = require("./utils/AIfunction/deleteFile");
const bashOperation = require("./utils/AIfunction/bashOperation");
const AgentChat = require("./utils/systemAgentLoop/Agent");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/v1", router);

app.listen(3033, () => {
  console.log("Server is running on port 3019");

  // 启动后自动初始化数据库（创建 DB 并执行 db/db.sql）
  // - 默认：开发环境开启，生产环境关闭（除非 AUTO_INIT_DB=true）
  // - 说明：仅用于本服务的 MySQL schema 初始化，不会创建 Docker 容器
  if (shouldAutoInitDb()) {
    bootstrapMySQL()
      .then((r) => {
        console.log(
          `[DB Bootstrap] ✅ database=${r.database} statements=${r.statements} executed=${r.executed} skipped=${r.skipped}`
        );
      })
      .catch((err) => {
        console.error("[DB Bootstrap] ❌ 初始化失败:", err?.message || err);
      });
  } else {
    console.log("[DB Bootstrap] ℹ️ AUTO_INIT_DB disabled");
  }
});
