/**
 * Dokploy API 客户端
 * 用于与 Dokploy 服务进行交互
 */

const https = require("https");
const http = require("http");

class DokployClient {
  /**
   * 初始化 Dokploy 客户端
   * @param {Object} config - 配置对象
   * @param {string} config.baseUrl - Dokploy 服务地址 (例如: http://165.154.23.73:3000)
   * @param {string} config.apiKey - API 密钥
   */
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.DOKPLOY_BASE_URL || "";
    this.apiKey = config.apiKey || process.env.DOKPLOY_API_KEY || "";

    if (!this.baseUrl) {
      throw new Error("Dokploy baseUrl 未配置");
    }
    if (!this.apiKey) {
      throw new Error("Dokploy API key 未配置");
    }

    // 移除末尾的斜杠
    this.baseUrl = this.baseUrl.replace(/\/$/, "");
    this.apiEndpoint = `${this.baseUrl}/api`;
  }

  /**
   * 延迟函数
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 发送 HTTP 请求（带重试机制）
   * @private
   */
  async _request(
    method,
    endpoint,
    data = null,
    queryParams = null,
    retryCount = 0
  ) {
    const maxRetries = 3;
    const retryDelay = 2000; // 2秒

    try {
      return await this._doRequest(method, endpoint, data, queryParams);
    } catch (error) {
      // 如果是网络错误且还有重试次数，则重试
      const isNetworkError =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNREFUSED" ||
        error.message === "请求超时";

      if (isNetworkError && retryCount < maxRetries) {
        console.log(
          `[DOKPLOY API] ⚠️ 网络错误，${retryDelay / 1000}秒后重试 (${
            retryCount + 1
          }/${maxRetries})...`
        );
        await this._delay(retryDelay);
        return this._request(
          method,
          endpoint,
          data,
          queryParams,
          retryCount + 1
        );
      }

      throw error;
    }
  }

  /**
   * 实际发送 HTTP 请求
   * @private
   */
  async _doRequest(method, endpoint, data = null, queryParams = null) {
    return new Promise((resolve, reject) => {
      // 构建查询字符串
      let url = `${this.apiEndpoint}${endpoint}`;
      if (queryParams) {
        const queryString = new URLSearchParams(queryParams).toString();
        url += `?${queryString}`;
      }

      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === "https:";
      const httpModule = isHttps ? https : http;

      // 清理 API Key（确保没有多余的空格或换行符）
      const cleanedApiKey = this.apiKey.trim().replace(/\r?\n/g, "");

      // 准备请求数据
      let postData = null;
      if (
        data &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        postData = JSON.stringify(data);
      }

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          "x-api-key": cleanedApiKey, // Dokploy API 使用 x-api-key header，不是 Authorization
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30秒超时
      };

      // 如果有 POST 数据，设置 Content-Length
      if (postData) {
        options.headers["Content-Length"] = Buffer.byteLength(postData);
      }

      console.log(`[DOKPLOY API] ${method} ${url}`);

      const req = httpModule.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            const parsedData =
              responseData.length > 0 ? JSON.parse(responseData) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`[DOKPLOY API] ✅ 响应成功 (${res.statusCode})`);
              resolve({
                status: res.statusCode,
                data: parsedData,
              });
            } else {
              console.log(
                `[DOKPLOY API] ❌ 响应失败 (${res.statusCode}): ${
                  parsedData.message || responseData.substring(0, 200)
                }`
              );
              reject({
                status: res.statusCode,
                message: parsedData.message || "请求失败",
                data: parsedData,
                rawResponse: responseData,
                url: url,
              });
            }
          } catch (error) {
            console.log(`[DOKPLOY API] ❌ 响应解析失败: ${error.message}`);
            reject({
              status: res.statusCode,
              message: "响应解析失败",
              error: error.message,
              rawData: responseData,
              url: url,
            });
          }
        });
      });

      req.on("error", (error) => {
        console.log(`[DOKPLOY API] ❌ 请求失败: ${error.message}`);
        reject({
          status: 0,
          message: "网络请求失败",
          error: error.message,
          code: error.code,
          url: url,
        });
      });

      req.on("timeout", () => {
        console.log(`[DOKPLOY API] ❌ 请求超时: ${url}`);
        req.destroy();
        reject({
          status: 0,
          message: "请求超时",
          error: "Request timeout after 30s",
          url: url,
        });
      });

      if (postData) {
        req.write(postData);
      }

      req.end();
    });
  }

  // ==================== Application APIs ====================

  /**
   * 创建应用
   * @param {Object} params
   * @param {string} params.name - 应用名称 (必需)
   * @param {string} params.appName - 应用标识名
   * @param {string} params.description - 应用描述
   * @param {string} params.environmentId - 环境ID (必需)
   * @param {string} params.serverId - 服务器ID
   */
  async createApplication(params) {
    return this._request("POST", "/application.create", params);
  }

  /**
   * 获取应用信息
   * @param {string} applicationId - 应用ID
   */
  async getApplication(applicationId) {
    return this._request("GET", "/application.one", null, { applicationId });
  }

  /**
   * 部署应用
   * @param {Object} params
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.title - 部署标题
   * @param {string} params.description - 部署描述
   */
  async deployApplication(params) {
    return this._request("POST", "/application.deploy", params);
  }

  /**
   * 重新部署应用
   * @param {Object} params
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.title - 部署标题
   * @param {string} params.description - 部署描述
   */
  async redeployApplication(params) {
    return this._request("POST", "/application.redeploy", params);
  }

  /**
   * 启动应用
   * @param {string} applicationId - 应用ID
   */
  async startApplication(applicationId) {
    return this._request("POST", "/application.start", { applicationId });
  }

  /**
   * 停止应用
   * @param {string} applicationId - 应用ID
   */
  async stopApplication(applicationId) {
    return this._request("POST", "/application.stop", { applicationId });
  }

  /**
   * 删除应用
   * @param {string} applicationId - 应用ID
   */
  async deleteApplication(applicationId) {
    return this._request("POST", "/application.delete", { applicationId });
  }

  /**
   * 保存应用环境变量
   * @param {Object} params
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.env - 环境变量 (JSON 字符串)
   * @param {string} params.buildArgs - 构建参数 (JSON 字符串)
   * @param {string} params.buildSecrets - 构建密钥 (JSON 字符串)
   */
  async saveEnvironment(params) {
    return this._request("POST", "/application.saveEnvironment", params);
  }

  /**
   * 保存构建类型配置
   * @param {Object} params
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.buildType - 构建类型: "dockerfile" | "heroku_buildpacks" | "paketo_buildpacks" | "nixpacks" | "static" | "railpack"
   * @param {string} params.dockerfile - Dockerfile 内容
   * @param {string} params.dockerContextPath - Docker 上下文路径
   * @param {string} params.dockerBuildStage - Docker 构建阶段
   * @param {string} params.publishDirectory - 发布目录 (静态应用)
   * @param {boolean} params.isStaticSpa - 是否为静态 SPA
   */
  async saveBuildType(params) {
    return this._request("POST", "/application.saveBuildType", params);
  }

  /**
   * 保存 GitHub Provider 配置
   * @param {Object} params
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.repository - GitHub 仓库
   * @param {string} params.branch - 分支名称
   * @param {string} params.githubId - GitHub Provider ID
   */
  async saveGithubProvider(params) {
    return this._request("POST", "/application.saveGithubProvider", params);
  }

  /**
   * 保存 Docker Provider 配置
   * @param {Object} params
   * @param {string} params.dockerImage - Docker 镜像地址 (必需，如 docker.io/autoprovider/xxx:latest)
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.username - Docker Registry 用户名 (可选)
   * @param {string} params.password - Docker Registry 密码 (可选)
   * @param {string} params.registryUrl - Docker Registry URL (可选)
   */
  async saveDockerProvider(params) {
    return this._request("POST", "/application.saveDockerProvider", params);
  }

  /**
   * 更新应用配置
   * @param {Object} params - 应用配置对象
   */
  async updateApplication(params) {
    return this._request("POST", "/application.update", params);
  }

  /**
   * 取消部署
   * @param {string} applicationId - 应用ID
   */
  async cancelDeployment(applicationId) {
    return this._request("POST", "/application.cancelDeployment", {
      applicationId,
    });
  }

  /**
   * 移动应用到其他环境
   * @param {Object} params
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.targetEnvironmentId - 目标环境ID (必需)
   */
  async moveApplication(params) {
    return this._request("POST", "/application.move", params);
  }

  // ==================== Domain APIs ====================

  /**
   * 生成域名
   * @param {string} appName - 应用名称
   * @returns {{status:number,data:{domain:string}}} 生成的域名
   */
  async generateDomain(appName) {
    //dokploy的traefik无法使用，现在使用自定义域名
    // 域名格式：appName.project.autoprovider.cloud
    const domain = `${appName}.project.autoprovider.cloud`;
    return {
      status: 200,
      data: {
        domain,
        host: domain,
      },
    };
  }

  /**
   * 创建域名配置
   * @param {Object} params
   * @param {string} params.host - 域名 (必需)
   * @param {string} params.applicationId - 应用ID (必需)
   * @param {string} params.path - 路径 (可选)
   * @param {number} params.port - 端口 (可选)
   * @param {boolean} params.https - 是否启用 HTTPS (可选)
   */
  async createDomain(params) {
    return this._request("POST", "/domain.create", params);
  }

  // ==================== 其他常用 API ====================

  /**
   * 获取应用监控信息
   * @param {string} appName - 应用名称
   */
  async getAppMonitoring(appName) {
    return this._request("GET", "/application.readAppMonitoring", null, {
      appName,
    });
  }

  /**
   * 刷新应用 Token
   * @param {string} applicationId - 应用ID
   */
  async refreshToken(applicationId) {
    return this._request("POST", "/application.refreshToken", {
      applicationId,
    });
  }

  // ==================== Project APIs ====================

  /**
   * 创建项目
   * @param {Object} params
   * @param {string} params.name - 项目名称 (必需)
   * @param {string} params.description - 项目描述
   * @param {string} params.env - 环境变量 (JSON 字符串，必需)
   */
  async createProject(params) {
    return this._request("POST", "/project.create", params);
  }

  /**
   * 获取项目信息
   * @param {string} projectId - 项目ID
   */
  async getProject(projectId) {
    return this._request("GET", "/project.one", null, { projectId });
  }

  /**
   * 获取所有项目
   */
  async getAllProjects() {
    return this._request("GET", "/project.all");
  }

  /**
   * 更新项目
   * @param {Object} params
   * @param {string} params.projectId - 项目ID (必需)
   * @param {string} params.name - 项目名称
   * @param {string} params.description - 项目描述
   * @param {string} params.env - 环境变量 (JSON 字符串)
   */
  async updateProject(params) {
    return this._request("POST", "/project.update", params);
  }

  /**
   * 删除项目
   * @param {string} projectId - 项目ID
   */
  async removeProject(projectId) {
    return this._request("POST", "/project.remove", { projectId });
  }

  /**
   * 复制项目
   * @param {Object} params
   * @param {string} params.sourceEnvironmentId - 源环境ID (必需)
   * @param {string} params.name - 新项目名称 (必需)
   * @param {string} params.description - 项目描述
   * @param {boolean} params.includeServices - 是否包含服务
   * @param {Array} params.selectedServices - 选中的服务列表
   */
  async duplicateProject(params) {
    return this._request("POST", "/project.duplicate", params);
  }

  // ==================== Environment APIs ====================

  /**
   * 创建环境
   * @param {Object} params
   * @param {string} params.name - 环境名称 (必需)
   * @param {string} params.description - 环境描述
   * @param {string} params.projectId - 项目ID (必需)
   */
  async createEnvironment(params) {
    return this._request("POST", "/environment.create", params);
  }

  /**
   * 获取环境信息
   * @param {string} environmentId - 环境ID
   */
  async getEnvironment(environmentId) {
    return this._request("GET", "/environment.one", null, { environmentId });
  }

  /**
   * 根据项目ID获取环境列表
   * @param {string} projectId - 项目ID
   */
  async getEnvironmentsByProjectId(projectId) {
    return this._request("GET", "/environment.byProjectId", null, {
      projectId,
    });
  }

  /**
   * 更新环境
   * @param {Object} params
   * @param {string} params.environmentId - 环境ID (必需)
   * @param {string} params.name - 环境名称
   * @param {string} params.description - 环境描述
   * @param {string} params.env - 环境变量 (JSON 字符串)
   */
  async updateEnvironment(params) {
    return this._request("POST", "/environment.update", params);
  }

  /**
   * 删除环境
   * @param {string} environmentId - 环境ID
   */
  async removeEnvironment(environmentId) {
    return this._request("POST", "/environment.remove", { environmentId });
  }

  /**
   * 复制环境
   * @param {Object} params
   * @param {string} params.environmentId - 源环境ID (必需)
   * @param {string} params.name - 新环境名称 (必需)
   * @param {string} params.description - 环境描述
   */
  async duplicateEnvironment(params) {
    return this._request("POST", "/environment.duplicate", params);
  }

  // ==================== MySQL APIs ====================

  /**
   * 创建 MySQL 服务
   * @param {Object} params
   * @param {string} params.name - 服务名称 (必需)
   * @param {string} params.appName - 应用名称 (必需)
   * @param {string} params.environmentId - 环境ID (必需)
   * @param {string} params.databaseName - 数据库名称 (必需)
   * @param {string} params.databaseUser - 数据库用户 (必需)
   * @param {string} params.databasePassword - 数据库密码 (必需)
   * @param {string} params.databaseRootPassword - Root 密码 (必需)
   * @param {string} params.dockerImage - Docker 镜像 (可选)
   * @param {string} params.description - 描述 (可选)
   * @param {string} params.serverId - 服务器ID (可选)
   */
  async createMySQL(params) {
    return this._request("POST", "/mysql.create", params);
  }

  /**
   * 获取 MySQL 服务信息
   * @param {string} mysqlId - MySQL 服务ID
   */
  async getMySQL(mysqlId) {
    return this._request("GET", "/mysql.one", null, { mysqlId });
  }

  /**
   * 部署 MySQL 服务
   * @param {string} mysqlId - MySQL 服务ID
   */
  async deployMySQL(mysqlId) {
    return this._request("POST", "/mysql.deploy", { mysqlId });
  }

  /**
   * 删除 MySQL 服务
   * @param {string} mysqlId - MySQL 服务ID
   */
  async removeMySQL(mysqlId) {
    return this._request("POST", "/mysql.remove", { mysqlId });
  }

  // ==================== PostgreSQL APIs ====================

  /**
   * 删除 PostgreSQL 服务
   * @param {string} postgresId - PostgreSQL 服务ID
   */
  async removePostgres(postgresId) {
    return this._request("POST", "/postgres.remove", { postgresId });
  }

  // ==================== Redis APIs ====================

  /**
   * 删除 Redis 服务
   * @param {string} redisId - Redis 服务ID
   */
  async removeRedis(redisId) {
    return this._request("POST", "/redis.remove", { redisId });
  }

  // ==================== MongoDB APIs ====================

  /**
   * 删除 MongoDB 服务
   * @param {string} mongoId - MongoDB 服务ID
   */
  async removeMongo(mongoId) {
    return this._request("POST", "/mongo.remove", { mongoId });
  }

  // ==================== MariaDB APIs ====================

  /**
   * 删除 MariaDB 服务
   * @param {string} mariadbId - MariaDB 服务ID
   */
  async removeMariadb(mariadbId) {
    return this._request("POST", "/mariadb.remove", { mariadbId });
  }

  // ==================== Compose APIs ====================

  /**
   * 删除 Compose 服务
   * @param {string} composeId - Compose 服务ID
   */
  async removeCompose(composeId) {
    return this._request("POST", "/compose.delete", { composeId });
  }

  // ==================== 批量删除项目资源 ====================

  /**
   * 删除项目下的所有资源（applications、databases、compose 等）
   * 必须在删除项目之前调用此方法清理所有资源
   * @param {string} projectId - Dokploy 项目ID
   * @returns {Promise<{success: boolean, details: Array}>} 删除结果
   */
  async removeAllProjectResources(projectId) {
    const details = [];

    // 1. 获取项目详情
    let projectData;
    try {
      const response = await this.getProject(projectId);
      projectData = response.data;
    } catch (error) {
      return {
        success: false,
        details: [
          {
            type: "project_fetch",
            status: "failed",
            detail: error.message || "获取项目信息失败",
          },
        ],
      };
    }

    if (!projectData || !projectData.environments) {
      return {
        success: true,
        details: [
          { type: "project_fetch", status: "skipped", detail: "项目无环境数据" },
        ],
      };
    }

    // 2. 遍历所有环境，删除资源
    for (const env of projectData.environments) {
      const envName = env.name || env.environmentId;

      // 删除 Applications
      if (env.applications && env.applications.length > 0) {
        for (const app of env.applications) {
          try {
            await this.deleteApplication(app.applicationId);
            details.push({
              type: "application",
              id: app.applicationId,
              name: app.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "application",
              id: app.applicationId,
              name: app.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }

      // 删除 MySQL
      if (env.mysql && env.mysql.length > 0) {
        for (const db of env.mysql) {
          try {
            await this.removeMySQL(db.mysqlId);
            details.push({
              type: "mysql",
              id: db.mysqlId,
              name: db.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "mysql",
              id: db.mysqlId,
              name: db.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }

      // 删除 PostgreSQL
      if (env.postgres && env.postgres.length > 0) {
        for (const db of env.postgres) {
          try {
            await this.removePostgres(db.postgresId);
            details.push({
              type: "postgres",
              id: db.postgresId,
              name: db.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "postgres",
              id: db.postgresId,
              name: db.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }

      // 删除 Redis
      if (env.redis && env.redis.length > 0) {
        for (const db of env.redis) {
          try {
            await this.removeRedis(db.redisId);
            details.push({
              type: "redis",
              id: db.redisId,
              name: db.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "redis",
              id: db.redisId,
              name: db.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }

      // 删除 MongoDB
      if (env.mongo && env.mongo.length > 0) {
        for (const db of env.mongo) {
          try {
            await this.removeMongo(db.mongoId);
            details.push({
              type: "mongo",
              id: db.mongoId,
              name: db.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "mongo",
              id: db.mongoId,
              name: db.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }

      // 删除 MariaDB
      if (env.mariadb && env.mariadb.length > 0) {
        for (const db of env.mariadb) {
          try {
            await this.removeMariadb(db.mariadbId);
            details.push({
              type: "mariadb",
              id: db.mariadbId,
              name: db.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "mariadb",
              id: db.mariadbId,
              name: db.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }

      // 删除 Compose
      if (env.compose && env.compose.length > 0) {
        for (const comp of env.compose) {
          try {
            await this.removeCompose(comp.composeId);
            details.push({
              type: "compose",
              id: comp.composeId,
              name: comp.name,
              env: envName,
              status: "success",
            });
          } catch (error) {
            details.push({
              type: "compose",
              id: comp.composeId,
              name: comp.name,
              env: envName,
              status: "failed",
              detail: error.message,
            });
          }
        }
      }
    }

    // 判断是否全部成功
    const hasFailure = details.some((d) => d.status === "failed");

    return {
      success: !hasFailure,
      details,
    };
  }
}

module.exports = DokployClient;
