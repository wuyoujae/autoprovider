import NwAPI from "./nw_api";
import FcAPI from "./fc_api";
import axios from "axios";
import message from "@/utils/message";
import { useUserStore } from "@/stores/user";

const getToken = () => {
  return localStorage.getItem("token");
};

// 未登录提示防重复标记
let isShowingUnauthorizedMessage = false;

// 处理登录过期，延迟2秒后重定向到登录页
const handleTokenExpired = () => {
  const userStore = useUserStore();
  userStore.clearUserToken();

  // 防重复提示：如果已经在显示未登录消息，则不重复显示
  if (!isShowingUnauthorizedMessage) {
    isShowingUnauthorizedMessage = true;
    message.warning("登录已过期，请重新登录", {
      title: "登录过期",
      onClose: () => {
        isShowingUnauthorizedMessage = false;
      },
    });

    // 延迟2秒后重定向到登录页
    setTimeout(() => {
      isShowingUnauthorizedMessage = false;
      window.location.replace("/login");
    }, 2000);
  }
};

// 处理无效的token，延迟2秒后重定向到登录页
const handleInvalidToken = () => {
  const userStore = useUserStore();
  // 清除所有token信息
  userStore.clearUserToken();

  // 防重复提示：如果已经在显示未登录消息，则不重复显示
  if (!isShowingUnauthorizedMessage) {
    isShowingUnauthorizedMessage = true;
    message.warning("无效的登录信息", {
      title: "登录失效",
      onClose: () => {
        isShowingUnauthorizedMessage = false;
      },
    });

    // 延迟2秒后重定向到登录页
    setTimeout(() => {
      isShowingUnauthorizedMessage = false;
      window.location.replace("/login");
    }, 2000);
  }
};

// 解析路径，如 'userinfo.login' => '/userinfo/login'
function resolveApiPath(path) {
  const keys = path.split(".");
  let endpoint = keys.reduce((acc, key) => acc?.[key], NwAPI);
  if (!endpoint) {
    endpoint = keys.reduce((acc, key) => acc?.[key], FcAPI);
  }
  if (!endpoint) {
    throw new Error(`无效的 API 路径：${path}`);
  }
  return endpoint;
}

// 创建 axios 实例
const instance = axios.create({
  // baseURL: "/",
  // 默认配置
  timeout: 10000000,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 如果是FormData，删除Content-Type让浏览器自动设置
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 成功响应处理
    const responseData = response.data;
    const config = response.config;

    // 根据后端接口文档的响应格式处理
    if (responseData && responseData.status !== undefined) {
      if (responseData.status === 0) {
        // 成功情况 (status = 0)
        // 只有在配置中明确要求显示成功消息时才显示
        if (responseData.message && config.showSuccessMessage) {
          message.requestSuccess(responseData.message);
        }
        // 直接返回 data 字段的内容
        return responseData.data;
      } else if (responseData.status === 1) {
        // 失败情况 (status = 1)
        const errorMessage = responseData.message || "操作失败";

        // 检查是否为token过期的错误
        if (errorMessage === "token已过期") {
          handleTokenExpired();
          return Promise.reject(new Error(errorMessage));
        }

        // 检查是否为无效的token错误
        if (errorMessage === "无效的token") {
          handleInvalidToken();
          return Promise.reject(new Error(errorMessage));
        }

        // 只有在配置中明确要求显示错误消息时才显示（默认显示错误消息）
        if (config.showErrorMessage !== false) {
          message.requestError(errorMessage);
        }
        // 终止请求，抛出错误
        return Promise.reject(new Error(errorMessage));
      }
    }

    // 如果响应格式不符合预期，直接返回原始数据
    return responseData;
  },
  (error) => {
    // 检查是否为主动取消的请求
    if (axios.isCancel(error) || error.message === "canceled") {
      return Promise.reject(error);
    }

    // 网络错误或HTTP状态码错误处理
    console.error("请求错误:", error);

    const config = error.config;
    const showErrorMessage = config?.showErrorMessage !== false;

    if (error.response) {
      // 服务器响应了错误状态码
      const { status, data } = error.response;

      // 如果服务器返回的错误也符合接口文档格式
      if (data && data.status === 1 && data.message) {
        // 检查是否为token过期的错误
        if (data.message === "token已过期") {
          handleTokenExpired();
          return Promise.reject(new Error(data.message));
        }

        // 检查是否为无效的token错误
        if (data.message === "无效的token") {
          handleInvalidToken();
          return Promise.reject(new Error(data.message));
        }

        if (showErrorMessage) {
          message.requestError(data.message);
        }
        return Promise.reject(new Error(data.message));
      }

      // 处理HTTP状态码错误
      if (showErrorMessage) {
        switch (status) {
          case 400:
            message.requestError("请求参数错误");
            break;
          case 401:
            // 401错误也可能表示token过期
            handleTokenExpired();
            break;
          case 403:
            message.forbidden("权限不足，无法执行此操作");
            break;
          case 404:
            message.requestError("请求的资源不存在");
            break;
          case 422:
            message.requestError("数据验证失败");
            break;
          case 429:
            message.warning("请求过于频繁，请稍后再试");
            break;
          case 500:
            message.serverError("服务器内部错误");
            break;
          case 502:
          case 503:
          case 504:
            message.serverError("服务器暂时不可用，请稍后重试");
            break;
          default:
            message.requestError(`请求失败 (${status})`);
        }
      }
    } else if (error.request) {
      // 网络错误
      if (showErrorMessage) {
        message.networkError("网络连接失败，请检查网络设置");
      }
    } else {
      // 其他错误
      if (showErrorMessage) {
        message.requestError(error.message || "请求失败，请稍后重试");
      }
    }

    return Promise.reject(error);
  }
);

// 封装 request 方法
const request = (options) => {
  const {
    url,
    method = "get",
    data = null,
    params = null,
    showSuccessMessage = false, // 默认不显示成功消息
    showErrorMessage = true, // 默认显示错误消息
    ...restOptions
  } = options;
  // 解析真实的 URL
  const resolvedUrl = resolveApiPath(url);

  // 返回 axios 请求的 Promise
  return instance({
    url: resolvedUrl,
    method,
    data, // 请求体数据（POST 等）
    params, // 查询参数（GET 等）
    showSuccessMessage, // 传递给拦截器
    showErrorMessage, // 传递给拦截器
    ...restOptions,
  });
};

export default request;
