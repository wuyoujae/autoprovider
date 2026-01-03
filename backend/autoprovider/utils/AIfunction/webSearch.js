const axios = require("axios");
const recordErrorLog = require("../recordErrorLog");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");

const API_BASE = process.env.METASO_API_BASE || "https://metaso.cn/api/v1";
const API_KEY =
  process.env.METASO_API_KEY ||
  process.env.METASO_TOKEN ||
  process.env.METASO_SEARCH_KEY ||
  "mk-85B261BDFEE76D6D39472BE0E8AF1DCB";

const normalizeSearchType = (value) => {
  if (!value || typeof value !== "string") return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === "search" || lowered === "web") return "web_search";
  if (lowered === "reader" || lowered === "read") return "web_reader";
  if (lowered === "qa" || lowered === "ask") return "chat";
  if (["web_search", "web_reader", "chat"].includes(lowered)) return lowered;
  return null;
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

const baseHeaders = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

const callSearch = async (searchContent) => {
  const data = {
    q: searchContent,
    scope: "webpage",
    includeSummary: false,
    size: 1,
    includeRawContent: false,
    conciseSnippet: false,
  };
  const res = await axios.post(`${API_BASE}/search`, data, {
    headers: {
      ...baseHeaders,
      Accept: "application/json",
    },
    maxBodyLength: Infinity,
  });
  return res.data;
};

const callReader = async (url) => {
  const data = { url };
  const res = await axios.post(`${API_BASE}/reader`, data, {
    headers: {
      ...baseHeaders,
      Accept: "text/plain",
    },
    maxBodyLength: Infinity,
  });
  return res.data;
};

const callChat = async (question) => {
  const data = {
    model: "fast",
    stream: false, // 关闭流式，减少返回结果规模
    messages: [{ role: "user", content: question }],
  };

  const res = await axios({
    method: "post",
    url: `${API_BASE}/chat/completions`,
    headers: {
      ...baseHeaders,
      Accept: "application/json",
    },
    data,
    responseType: "json",
    maxBodyLength: Infinity,
  });

  const choice = res?.data?.choices?.[0];
  const answer = choice?.message?.content || "";
  return { answer };
};

/**
 * webSearch 统一入口（直接调用 HTTP 接口）
 * @param {Object} payload
 * @param {string} payload.search_content - 查询内容/URL/问题
 * @param {string} payload.search_type - web_search | web_reader | chat
 * @param {Object} [payload.search_theme] - 预留参数，当前未用
 */
async function webSearch(payload = {}, infoObject = {}) {
  try {
    const searchContent = payload.search_content;
    const searchType = normalizeSearchType(payload.search_type);

    if (!searchContent || typeof searchContent !== "string") {
      return {
        status: 1,
        message: "websearch fail",
        data: { error: "search_content 不能为空，且必须为字符串" },
      };
    }

    if (!searchType) {
      return {
        status: 1,
        message: "websearch fail",
        data: {
          error: "search_type 不合法，可选：web_search、web_reader、chat",
        },
      };
    }

    // 前置通知
    try {
      if (searchType === "web_reader") {
        await chatToFrontend(
          `开始阅读链接：${searchContent}`,
          "web_search",
          infoObject
        );
      } else {
        await chatToFrontend("开始搜索相关信息", "web_search", infoObject);
      }
    } catch (e) {
      recordErrorLog(e, "webSearch chatToFrontend start");
    }

    let responseData;
    let tool = "";

    if (searchType === "web_search") {
      tool = "search";
      responseData = await callSearch(searchContent);
    } else if (searchType === "web_reader") {
      if (!isValidUrl(searchContent)) {
        return {
          status: 1,
          message: "websearch fail",
          data: { error: "url 格式不合法" },
        };
      }
      tool = "reader";
      responseData = await callReader(searchContent);
    } else if (searchType === "chat") {
      tool = "chat";
      responseData = await callChat(searchContent);
    }

    // 精简返回：仅保留必要字段
    let data;
    if (tool === "search") {
      data = {
        search_content: searchContent,
        webpages: responseData?.webpages || [],
      };
    } else if (tool === "reader") {
      data = {
        search_content: searchContent,
        content: responseData,
      };
    } else if (tool === "chat") {
      data = {
        search_content: searchContent,
        answer: responseData?.answer || "",
      };
    }

    // 完成通知（仅成功时发送）
    try {
      if (tool === "reader") {
        await chatToFrontend("阅读完成", "web_search", infoObject);
      } else {
        await chatToFrontend("搜索完成", "web_search", infoObject);
      }
    } catch (e) {
      recordErrorLog(e, "webSearch chatToFrontend done");
    }

    return {
      status: 0,
      message: "websearch success",
      data,
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in webSearch");
    return {
      status: 1,
      message: "websearch fail",
      data: { error: error?.message || "系统错误，请暂停工作" },
    };
  }
}

module.exports = webSearch;
// 暴露内部方法便于测试
module.exports._test = {
  normalizeSearchType,
  callSearch,
  callReader,
  callChat,
};
