/**
 * Docker 容器控制模块
 * 用于管理 Docker 容器的创建、删除、启动、停止等操作
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const recordErrorLog = require("../../recordErrorLog");

/**
 * 执行 Docker 命令
 * @private
 */
async function execDockerCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      encoding: "utf-8",
      timeout: options.timeout || 60000, // 默认60秒超时
      maxBuffer: options.maxBuffer || 10 * 1024 * 1024, // 10MB
      cwd: options.cwd,
      env: options.env,
      shell: options.shell,
    });
    return {
      success: true,
      output: (stdout || "").trim(),
      error: stderr ? stderr.toString().trim() : null,
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout ? error.stdout.toString().trim() : "",
      error: error.stderr ? error.stderr.toString().trim() : error.message,
      exitCode:
        typeof error.code === "number"
          ? error.code
          : typeof error.status === "number"
          ? error.status
          : undefined,
    };
  }
}

/**
 * 列出所有容器
 * @param {Object} params - 参数对象
 * @param {boolean} params.all - 是否包含已停止的容器，默认 false
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function listContainers(params = {}) {
  try {
    const allFlag = params.all ? "-a" : "";
    const command = `docker ps ${allFlag} --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"`;

    const result = await execDockerCommand(command);

    if (!result.success) {
      return {
        status: 1,
        message: "获取容器列表失败",
        data: {
          error: result.error || "执行 docker ps 命令失败",
        },
      };
    }

    // 解析输出
    const lines = result.output.split("\n").filter((line) => line.trim());
    const containers = lines.map((line) => {
      const parts = line.split("\t");
      return {
        id: parts[0] || "",
        name: parts[1] || "",
        image: parts[2] || "",
        status: parts[3] || "",
        ports: parts[4] || "",
      };
    });

    return {
      status: 0,
      message: "获取容器列表成功",
      data: {
        containers,
        count: containers.length,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - listContainers");
    return {
      status: 1,
      message: "获取容器列表失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 获取容器详细信息
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function getContainerInfo(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "获取容器信息失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    const command = `docker inspect ${params.containerId}`;
    const result = await execDockerCommand(command);

    if (!result.success) {
      return {
        status: 1,
        message: "获取容器信息失败",
        data: {
          error: result.error || "容器不存在或无法访问",
        },
      };
    }

    const info = JSON.parse(result.output);
    return {
      status: 0,
      message: "获取容器信息成功",
      data: {
        container: info[0] || info,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - getContainerInfo");
    return {
      status: 1,
      message: "获取容器信息失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 创建容器
 * @param {Object} params - 参数对象
 * @param {string} params.image - 镜像名称（必需）
 * @param {string} params.name - 容器名称（必需）
 * @param {Array} params.ports - 端口映射数组，格式: ["host:container", "8080:3000"]
 * @param {Array} params.env - 环境变量数组，格式: ["KEY=value", "NODE_ENV=production"]
 * @param {string} params.workingDir - 工作目录
 * @param {string} params.command - 启动命令
 * @param {boolean} params.detach - 是否后台运行，默认 true
 * @param {boolean} params.autoRemove - 容器停止后自动删除，默认 false
 * @param {Object} params.volumes - 卷映射对象，格式: {"/host/path": "/container/path"}
 * @param {string} params.network - 网络名称
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function createContainer(params = {}) {
  try {
    // 参数验证
    if (!params.image) {
      return {
        status: 1,
        message: "创建容器失败",
        data: {
          error: "镜像名称不能为空",
        },
      };
    }

    if (!params.name) {
      return {
        status: 1,
        message: "创建容器失败",
        data: {
          error: "容器名称不能为空",
        },
      };
    }

    // 构建 docker run 命令
    let command = "docker run";

    // 后台运行
    if (params.detach !== false) {
      command += " -d";
    }

    // 自动删除
    if (params.autoRemove) {
      command += " --rm";
    }

    // 容器名称
    command += ` --name ${params.name}`;

    // 端口映射
    if (params.ports && Array.isArray(params.ports)) {
      params.ports.forEach((port) => {
        command += ` -p ${port}`;
      });
    }

    // 环境变量
    if (params.env && Array.isArray(params.env)) {
      params.env.forEach((env) => {
        command += ` -e "${env}"`;
      });
    }

    // 工作目录
    if (params.workingDir) {
      command += ` -w ${params.workingDir}`;
    }

    // 卷映射
    if (params.volumes && typeof params.volumes === "object") {
      Object.entries(params.volumes).forEach(([host, container]) => {
        command += ` -v ${host}:${container}`;
      });
    }

    // 网络
    if (params.network) {
      command += ` --network ${params.network}`;
    }

    // 镜像
    command += ` ${params.image}`;

    // 启动命令
    if (params.command) {
      command += ` ${params.command}`;
    }

    const result = await execDockerCommand(command, { timeout: 120000 });

    if (!result.success) {
      return {
        status: 1,
        message: "创建容器失败",
        data: {
          error: result.error || "执行 docker run 命令失败",
        },
      };
    }

    const containerId = result.output.trim();

    return {
      status: 0,
      message: "创建容器成功",
      data: {
        containerId,
        name: params.name,
        image: params.image,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - createContainer");
    return {
      status: 1,
      message: "创建容器失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 删除容器
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @param {boolean} params.force - 是否强制删除运行中的容器，默认 false
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function removeContainer(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "删除容器失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    const forceFlag = params.force ? "-f" : "";
    const command = `docker rm ${forceFlag} ${params.containerId}`;

    const result = await execDockerCommand(command);

    if (!result.success) {
      return {
        status: 1,
        message: "删除容器失败",
        data: {
          error: result.error || "容器不存在或正在运行（需要先停止）",
        },
      };
    }

    return {
      status: 0,
      message: "删除容器成功",
      data: {
        containerId: params.containerId,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - removeContainer");
    return {
      status: 1,
      message: "删除容器失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 启动容器
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function startContainer(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "启动容器失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    const command = `docker start ${params.containerId}`;
    const result = await execDockerCommand(command);

    if (!result.success) {
      return {
        status: 1,
        message: "启动容器失败",
        data: {
          error: result.error || "容器不存在或无法启动",
        },
      };
    }

    return {
      status: 0,
      message: "启动容器成功",
      data: {
        containerId: params.containerId,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - startContainer");
    return {
      status: 1,
      message: "启动容器失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 停止容器
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @param {number} params.timeout - 停止超时时间（秒），默认 10
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function stopContainer(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "停止容器失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    const timeout = params.timeout || 10;
    const command = `docker stop -t ${timeout} ${params.containerId}`;
    const result = await execDockerCommand(command);

    if (!result.success) {
      return {
        status: 1,
        message: "停止容器失败",
        data: {
          error: result.error || "容器不存在或无法停止",
        },
      };
    }

    return {
      status: 0,
      message: "停止容器成功",
      data: {
        containerId: params.containerId,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - stopContainer");
    return {
      status: 1,
      message: "停止容器失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 重启容器
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @param {number} params.timeout - 停止超时时间（秒），默认 10
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function restartContainer(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "重启容器失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    const timeout = params.timeout || 10;
    const command = `docker restart -t ${timeout} ${params.containerId}`;
    const result = await execDockerCommand(command);

    if (!result.success) {
      return {
        status: 1,
        message: "重启容器失败",
        data: {
          error: result.error || "容器不存在或无法重启",
        },
      };
    }

    return {
      status: 0,
      message: "重启容器成功",
      data: {
        containerId: params.containerId,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - restartContainer");
    return {
      status: 1,
      message: "重启容器失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 查看容器日志
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @param {number} params.tail - 显示最后N行，默认 100
 * @param {boolean} params.follow - 是否实时跟踪日志，默认 false
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function getContainerLogs(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "获取容器日志失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    const tail = params.tail || 100;
    const followFlag = params.follow ? "-f" : "";
    const command = `docker logs --tail ${tail} ${followFlag} ${params.containerId}`;

    const result = await execDockerCommand(command, {
      timeout: params.follow ? 0 : 30000, // 实时跟踪时不设置超时
    });

    if (!result.success) {
      return {
        status: 1,
        message: "获取容器日志失败",
        data: {
          error: result.error || "容器不存在或无法获取日志",
        },
      };
    }

    return {
      status: 0,
      message: "获取容器日志成功",
      data: {
        containerId: params.containerId,
        logs: result.output,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - getContainerLogs");
    return {
      status: 1,
      message: "获取容器日志失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 在容器中执行命令
 * @param {Object} params - 参数对象
 * @param {string} params.containerId - 容器ID或名称（必需）
 * @param {string} params.command - 要执行的命令（必需）
 * @param {boolean} params.interactive - 是否交互式执行，默认 false
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function execContainerCommand(params = {}) {
  try {
    if (!params.containerId) {
      return {
        status: 1,
        message: "执行容器命令失败",
        data: {
          error: "容器ID或名称不能为空",
        },
      };
    }

    if (!params.command) {
      return {
        status: 1,
        message: "执行容器命令失败",
        data: {
          error: "命令不能为空",
        },
      };
    }

    const interactiveFlag = params.interactive ? "-it" : "";
    const command = `docker exec ${interactiveFlag} ${params.containerId} ${params.command}`;

    const result = await execDockerCommand(command, { timeout: 60000 });

    if (!result.success) {
      return {
        status: 1,
        message: "执行容器命令失败",
        data: {
          error: result.error || "命令执行失败",
          exitCode: result.exitCode,
        },
      };
    }

    return {
      status: 0,
      message: "执行容器命令成功",
      data: {
        containerId: params.containerId,
        command: params.command,
        output: result.output,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - execContainerCommand");
    return {
      status: 1,
      message: "执行容器命令失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 构建 Docker 镜像
 * @param {Object} params - 参数对象
 * @param {string} params.tag - 镜像标签（必需）
 * @param {string} params.contextPath - 构建上下文路径（必需）
 * @param {string} params.dockerfile - Dockerfile 路径（可选）
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function buildImage(params = {}) {
  try {
    if (!params.tag) {
      return {
        status: 1,
        message: "构建镜像失败",
        data: {
          error: "镜像标签不能为空",
        },
      };
    }

    if (!params.contextPath) {
      return {
        status: 1,
        message: "构建镜像失败",
        data: {
          error: "构建上下文路径不能为空",
        },
      };
    }

    // 调试：显示构建目录内容
    console.log(`[DOCKER BUILD] 📁 构建目录: ${params.contextPath}`);
    const lsResult = await execDockerCommand(`ls -la "${params.contextPath}"`, {
      timeout: 10000,
    });
    if (lsResult.success) {
      console.log(`[DOCKER BUILD] 📂 目录内容:\n${lsResult.output}`);
    }

    // 检查 Dockerfile 是否存在
    const dockerfilePath =
      params.dockerfile || `${params.contextPath}/Dockerfile`;
    const catResult = await execDockerCommand(`cat "${dockerfilePath}"`, {
      timeout: 10000,
    });
    if (catResult.success) {
      console.log(
        `[DOCKER BUILD] 📄 Dockerfile 内容:\n${catResult.output.substring(
          0,
          500
        )}...`
      );
    } else {
      console.log(`[DOCKER BUILD] ⚠️ 无法读取 Dockerfile: ${catResult.error}`);
    }

    // 使用 --progress=plain 显示详细构建日志
    let command = `docker build --progress=plain -t "${params.tag}"`;
    if (params.dockerfile) {
      command += ` -f "${params.dockerfile}"`;
    }
    command += ` "${params.contextPath}"`;

    // CRITICAL: 将 stderr 重定向到 stdout，因为 docker build 的日志输 出在 stderr
    command += ` 2>&1`;

    console.log(`[DOCKER BUILD] 🔨 执行命令: ${command}`);
    const result = await execDockerCommand(command, { timeout: 600000 }); // 10分钟超时

    if (!result.success) {
      console.log(`[DOCKER BUILD] ❌ 构建失败!`);
      console.log(`[DOCKER BUILD] 错误输出:\n${result.error}`);
      console.log(`[DOCKER BUILD] 标准输出:\n${result.output}`);
      return {
        status: 1,
        message: "构建镜像失败",
        data: {
          error: result.error || "构建命令执行失败",
          output: result.output,
        },
      };
    }

    // 显示构建输出（包含我们在 Dockerfile 中添加的调试信息）
    console.log(`[DOCKER BUILD] ✅ 构建成功!`);
    console.log(
      `[DOCKER BUILD] 构建输出（最后500字符）:\n${result.output.slice(-500)}`
    );

    return {
      status: 0,
      message: "构建镜像成功",
      data: {
        tag: params.tag,
        output: result.output,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - buildImage");
    return {
      status: 1,
      message: "构建镜像失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

/**
 * 推送 Docker 镜像（带重试机制）
 * @param {Object} params - 参数对象
 * @param {string} params.tag - 镜像标签（必需）
 * @param {number} params.maxRetries - 最大重试次数，默认 3
 * @returns {Promise<{status: number, message: string, data: object}>}
 */
async function pushImage(params = {}) {
  const maxRetries = params.maxRetries || 3;
  const retryDelay = 5000; // 5秒

  try {
    if (!params.tag) {
      return {
        status: 1,
        message: "推送镜像失败",
        data: {
          error: "镜像标签不能为空",
        },
      };
    }

    const command = `docker push ${params.tag}`;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `[DOCKER] 推送镜像 (尝试 ${attempt}/${maxRetries}): ${params.tag}`
      );

      const result = await execDockerCommand(command, { timeout: 300000 }); // 5分钟超时

      if (result.success) {
        return {
          status: 0,
          message: "推送镜像成功",
          data: {
            tag: params.tag,
            output: result.output,
            attempts: attempt,
          },
        };
      }

      lastError = result.error || "推送命令执行失败";
      console.log(`[DOCKER] ❌ 推送失败: ${lastError}`);

      // 检查是否是网络错误，如果是则重试
      const isNetworkError =
        lastError.includes("EOF") ||
        lastError.includes("timeout") ||
        lastError.includes("connection");

      if (isNetworkError && attempt < maxRetries) {
        console.log(`[DOCKER] ⏳ ${retryDelay / 1000}秒后重试...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else if (!isNetworkError) {
        // 非网络错误，直接返回
        break;
      }
    }

    return {
      status: 1,
      message: "推送镜像失败",
      data: {
        error: lastError,
        attempts: maxRetries,
      },
    };
  } catch (error) {
    recordErrorLog(error, "dockerContral - pushImage");
    return {
      status: 1,
      message: "推送镜像失败",
      data: {
        error: error.message || "未知错误",
      },
    };
  }
}

module.exports = {
  listContainers,
  getContainerInfo,
  createContainer,
  removeContainer,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  execContainerCommand,
  buildImage,
  pushImage,
};
