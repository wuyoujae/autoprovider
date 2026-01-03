const Docker = require("dockerode");
const recordErrorLog = require("../recordErrorLog");

// Docker 连接配置，支持环境变量
const getDockerConfig = () => {
  // 优先使用 DOCKER_HOST 环境变量（支持远程 Docker）
  const dockerHost = process.env.DOCKER_HOST;

  if (dockerHost) {
    // 解析 DOCKER_HOST（支持 tcp://host:port 或 unix:///var/run/docker.sock）
    if (dockerHost.startsWith("tcp://")) {
      const url = new URL(dockerHost);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 2375,
        protocol: process.env.DOCKER_TLS_VERIFY === "1" ? "https" : "http",
      };
    } else if (dockerHost.startsWith("unix://")) {
      return {
        socketPath: dockerHost.replace("unix://", ""),
      };
    }
  }

  // Windows 默认使用 named pipe
  if (process.platform === "win32") {
    return {
      socketPath: process.env.DOCKER_SOCKET || "//./pipe/docker_engine",
    };
  }

  // Linux/macOS 默认使用 unix socket
  return {
    socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
  };
};

// 创建 Docker 客户端实例
const dockerConfig = getDockerConfig();
const docker = new Docker(dockerConfig);

/**
 * 测试 Docker 连接并获取信息
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
const testConnection = async () => {
  try {
    const info = await docker.info();
    console.log("[Docker] 连接成功");
    console.log(`[Docker] 服务器版本: ${info.ServerVersion}`);
    console.log(`[Docker] 操作系统: ${info.OperatingSystem}`);
    console.log(`[Docker] 容器数量: ${info.Containers}`);
    console.log(`[Docker] 镜像数量: ${info.Images}`);
    return {
      success: true,
      data: {
        serverVersion: info.ServerVersion,
        os: info.OperatingSystem,
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        driver: info.Driver,
        memoryLimit: info.MemoryLimit,
        cpus: info.NCPU,
        memTotal: info.MemTotal,
      },
    };
  } catch (error) {
    console.error("[Docker] 连接失败:", error.message);
    recordErrorLog(error, "docker.testConnection");
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * 获取 Docker 版本信息
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
const getVersion = async () => {
  try {
    const version = await docker.version();
    return {
      success: true,
      data: version,
    };
  } catch (error) {
    recordErrorLog(error, "docker.getVersion");
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * 检查 Docker 是否可用
 * @returns {Promise<boolean>}
 */
const isAvailable = async () => {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  docker,
  dockerConfig,
  testConnection,
  getVersion,
  isAvailable,
};

