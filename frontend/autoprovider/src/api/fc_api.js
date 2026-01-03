// Python文件解析服务的配置（独立端口5000）
const pythonBaseUrl =
  import.meta.env.VITE_PYTHON_API_BASE_URL || "http://localhost:5000";
const pythonAPIversion = import.meta.env.VITE_PYTHON_API_VERSION || "/api/v1";

// 构建Python服务URL的辅助函数
const buildPythonUrl = (path) => {
  return `${pythonBaseUrl}${pythonAPIversion}${path}`;
};

// FcAPI 配置（功能 API）
// 未来可以在这里添加更多的功能接口
const FcAPI = {
  inter: {
    upload_and_parse: buildPythonUrl("/inter/upload_and_parse"),
    unbound_sources: buildPythonUrl("/inter/unbound_sources"),
    cancel_source: buildPythonUrl("/inter/cancel_source"),
    bind_sources: buildPythonUrl("/inter/bind_sources"),
  },
};

export default FcAPI;
