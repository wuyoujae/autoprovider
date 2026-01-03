/**
 * Docker 连接测试脚本
 * 运行: node utils/docker/test-connection.js
 */

const { testConnection, isAvailable, dockerConfig } = require("./index");

async function main() {
  console.log("=".repeat(50));
  console.log("Docker 连接测试");
  console.log("=".repeat(50));
  console.log("\n当前配置:", JSON.stringify(dockerConfig, null, 2));

  console.log("\n检查 Docker 是否可用...");
  const available = await isAvailable();

  if (!available) {
    console.log("\n❌ Docker 不可用，请检查:");
    console.log("  1. Docker Desktop 是否已启动");
    console.log("  2. Docker 服务是否正在运行");
    console.log("  3. 环境变量 DOCKER_HOST 或 DOCKER_SOCKET 是否正确配置");
    process.exit(1);
  }

  console.log("✅ Docker 可用\n");

  console.log("获取 Docker 详细信息...\n");
  const result = await testConnection();

  if (result.success) {
    console.log("\n" + "=".repeat(50));
    console.log("Docker 信息摘要:");
    console.log("=".repeat(50));
    console.log(`  服务器版本: ${result.data.serverVersion}`);
    console.log(`  操作系统: ${result.data.os}`);
    console.log(`  CPU 数量: ${result.data.cpus}`);
    console.log(
      `  内存总量: ${(result.data.memTotal / 1024 / 1024 / 1024).toFixed(2)} GB`
    );
    console.log(`  存储驱动: ${result.data.driver}`);
    console.log(`  容器总数: ${result.data.containers}`);
    console.log(`    - 运行中: ${result.data.containersRunning}`);
    console.log(`    - 已暂停: ${result.data.containersPaused}`);
    console.log(`    - 已停止: ${result.data.containersStopped}`);
    console.log(`  镜像数量: ${result.data.images}`);
    console.log("=".repeat(50));
    console.log("\n✅ Docker 连接测试成功!");
  } else {
    console.log("\n❌ 获取 Docker 信息失败:", result.error);
    process.exit(1);
  }
}

main().catch(console.error);
