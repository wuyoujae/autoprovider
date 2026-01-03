// 从环境变量读取配置
const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
const APIversion = import.meta.env.VITE_API_VERSION || "/api/v1";

// 构建完整 URL 的辅助函数
const buildUrl = (path) => {
  return baseUrl ? `${baseUrl}${APIversion}${path}` : `${APIversion}${path}`;
};

// API 配置
const NwAPI = {
  userinfo: {
    login: buildUrl("/userinfo/login"),
    getuserinfo: buildUrl("/userinfo/getuserinfo"),
    getusertokenhistory: buildUrl("/userinfo/getusertokenhistory"),
  },
  uservec: {
    register: buildUrl("/uservec/register"),
  },
  projectinfo: {
    getuserprojectlist: buildUrl("/projectinfo/getuserprojectlist"),
    createproject: buildUrl("/projectinfo/createproject"),
    deleteproject: buildUrl("/projectinfo/deleteproject"),
    getprojecturl: buildUrl("/projectinfo/getprojecturl"),
  },
  session: {
    createSession: buildUrl("/session/createSession"),
    getSessionList: buildUrl("/session/getSessionList"),
    agentChat: buildUrl("/session/agentChat"),
    getSessionDialogs: buildUrl("/session/getSessionDialogs"),
    getSessionOperations: buildUrl("/session/getSessionOperations"),
    reconnectSession: buildUrl("/session/reconnectSession"),
    terminateSession: buildUrl("/session/terminateSession"),
  },
  workinfo: {
    getprojectfiletree: buildUrl("/workinfo/getprojectfiletree"),
    getfilecontent: buildUrl("/workinfo/getfilecontent"),
    getprojectdbstructure: buildUrl("/workinfo/getprojectdbstructure"),
    gettabledata: buildUrl("/workinfo/gettabledata"),
    gettokenusage: buildUrl("/workinfo/gettokenusage"),
    getenv: buildUrl("/workinfo/getenv"),
    saveenv: buildUrl("/workinfo/saveenv"),
  },
  systeminfo: {
    getlatestadv: buildUrl("/systeminfo/latestadv"),
  },
  rules: {
    createrules: buildUrl("/rules/createrules"),
    saverules: buildUrl("/rules/saverules"),
    getrules: buildUrl("/rules/getrules"),
    deleterules: buildUrl("/rules/deleterules"),
  },
  llmconfig: {
    get: buildUrl("/llmconfig/get"),
    save: buildUrl("/llmconfig/save"),
  },
  changelog: {
    getList: buildUrl("/changelog/getList"),
    getDetail: buildUrl("/changelog/getDetail"),
  },
};

export default NwAPI;
