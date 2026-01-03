// 用法示例：
// node backend/autoprovider/utils/AIfunction/linter/linterdemo.js "C:/abs/path/to/project" [type]
// 默认 type 为 nextjs。平台仅使用 npm。

const path = require("path");
const fs = require("fs");
const linter = require("./linter");

async function main() {
  const projectAbs = process.argv[2];
  const type = process.argv[3] || "nextjs";

  if (!projectAbs) {
    console.error(
      '请提供项目绝对路径，例如：node linterdemo.js "C:/Users/jae/Desktop/project/myapp" nextjs'
    );
    process.exit(1);
  }

  // 直接使用传入的绝对路径作为 projectRoot
  const projectRoot = path.resolve(projectAbs);

  console.log("=== 调试信息 ===");
  console.log("输入路径:", projectAbs);
  console.log("projectRoot:", projectRoot);
  console.log("目录是否存在:", fs.existsSync(projectRoot));
  console.log("================\n");

  const payload = { type };
  // 直接传入 projectRoot，绕过 combyFilePath
  const infoObject = { projectRoot };

  try {
    const res = await linter(payload, infoObject);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("执行 linter 发生错误：", err);
    process.exit(1);
  }
}

main();
