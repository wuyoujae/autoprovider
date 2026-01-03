/**
 * initDatabase 功能测试脚本
 * 运行: node utils/systemWorkLoop/database/test-initDatabase.js
 */

const path = require("path");
const { initDatabase } = require("./initDatabase");
const { isAvailable } = require("../../docker");

async function main() {
  console.log("=".repeat(60));
  console.log("测试 initDatabase 功能");
  console.log("=".repeat(60));

  // 1. 检查 Docker 是否可用
  console.log("\n[步骤 1] 检查 Docker 连接...");
  const dockerAvailable = await isAvailable();
  
  if (!dockerAvailable) {
    console.log("\n❌ Docker 不可用，请检查:");
    console.log("  1. Docker Desktop 是否已启动");
    console.log("  2. Docker 服务是否正在运行");
    console.log("  3. 环境变量 DOCKER_HOST 或 DOCKER_SOCKET 是否正确配置");
    process.exit(1);
  }
  console.log("✅ Docker 可用");

  // 2. 检查 Dokploy 配置
  console.log("\n[步骤 2] 检查 Dokploy 配置...");
  const hasDokploy = !!(
    process.env.DOKPLOY_BASE_URL && process.env.DOKPLOY_API_KEY
  );
  
  if (hasDokploy) {
    console.log("✅ 检测到 Dokploy 配置");
    console.log(`   BASE_URL: ${process.env.DOKPLOY_BASE_URL}`);
    console.log(`   API_KEY: ${process.env.DOKPLOY_API_KEY.substring(0, 10)}...`);
    console.log("\n⚠️ 将跳过本地 Docker 数据库创建测试");
    console.log("   如需测试本地 Docker，请临时移除 Dokploy 环境变量");
    return;
  }
  console.log("✅ 未配置 Dokploy，将使用本地 Docker");

  // 3. 创建测试项目目录
  console.log("\n[步骤 3] 准备测试环境...");
  const testProjectId = `test-${Date.now()}`;
  const testProjectPath = path.join(__dirname, "../../../temp", testProjectId);
  const testDbName = `test_db_${testProjectId.replace(/-/g, "_")}`;

  console.log(`   项目ID: ${testProjectId}`);
  console.log(`   项目路径: ${testProjectPath}`);
  console.log(`   数据库名: ${testDbName}`);

  // 创建测试目录
  const fs = require("fs/promises");
  await fs.mkdir(testProjectPath, { recursive: true });
  console.log("✅ 测试目录创建完成");

  // 4. 测试数据库初始化
  console.log("\n[步骤 4] 测试数据库初始化...");
  console.log("=".repeat(60));
  
  const result = await initDatabase({
    projectId: testProjectId,
    projectPath: testProjectPath,
    databaseName: testDbName,
    useDokploy: false,
  });

  console.log("=".repeat(60));

  if (result.success) {
    console.log("\n✅ 数据库初始化成功!");
    console.log("\n结果详情:");
    console.log(`  类型: ${result.data.type}`);
    console.log(`  容器ID: ${result.data.containerId}`);
    console.log(`  容器名: ${result.data.containerName}`);
    console.log(`  端口: ${result.data.port}`);
    console.log(`  数据库名: ${result.data.databaseName}`);
    console.log(`  DB_URL: ${result.data.dbUrl}`);

    // 检查 .env 文件
    console.log("\n[步骤 5] 验证 .env 文件...");
    const envPath = path.join(testProjectPath, ".env");
    try {
      const envContent = await fs.readFile(envPath, "utf-8");
      console.log("✅ .env 文件内容:");
      console.log(envContent);
    } catch (err) {
      console.log("❌ 读取 .env 文件失败:", err.message);
    }

    // 提示清理
    console.log("\n" + "=".repeat(60));
    console.log("⚠️ 测试完成，但容器仍在运行");
    console.log("请手动清理测试资源:");
    console.log(`  1. 停止并删除容器: docker stop ${result.data.containerName} && docker rm ${result.data.containerName}`);
    console.log(`  2. 删除测试目录: rm -rf ${testProjectPath}`);
    console.log("=".repeat(60));
  } else {
    console.log("\n❌ 数据库初始化失败:", result.error);
    
    // 清理测试目录
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
      console.log("✅ 测试目录已清理");
    } catch (err) {
      console.log("⚠️ 清理测试目录失败:", err.message);
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ 测试过程中发生错误:", error);
  process.exit(1);
});

