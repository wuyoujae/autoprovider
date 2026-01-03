/**
 * 操作历史匹配处理
 * 将后端操作记录转换为前端需要的 XML 标签格式
 * @param {Array} dialogs - 对话记录数组
 * @returns {Promise<Array>} 返回处理后的对话记录数组
 */
async function operationHistoryMatch(dialogs) {
  if (!Array.isArray(dialogs)) {
    return dialogs;
  }

  // 方法名到前端标签名的映射表
  const methodToTagMap = {
    chatToUser: "words",
    reasoners: "through",
    createFile: "create",
    readFile: "read",
    delectFile: "delect",
    deleteFile: "delect",
    bashOperation: "ran",
    fileSearch: "search",
    webSearch: "search",
    linter: "linter",
    deploy: "deploy",
    createTodoList: "createtodolist",
    doneTodo: "donetodo",
    editFile: "edit",
    sqlOperation: "sqlOperation",
  };

  // 转换函数映射表（每个方法对应一个转换函数）
  const transformFunctions = {
    /**
     * 转换 chatToUser 操作
     * 输入: {content: "..."}
     * 输出: <words>...</words>
     */
    chatToUser: (payload) => {
      if (!payload || typeof payload !== "object") {
        return "";
      }
      const content = payload.content || "";
      return `<words>${escapeXml(content)}</words>`;
    },

    /**
     * 转换 reasoners 操作
     * 输入: {content: "..."}
     * 输出: <through>...</through>
     */
    reasoners: (payload) => {
      if (!payload || typeof payload !== "object") {
        return "";
      }
      const content = payload.content || "";
      return `<through>${escapeXml(content)}</through>`;
    },

    /**
     * 转换 createTodoList 操作
     * 输入: {todos: [{title: "...", isDone: false}, ...]} 或 {items: [...]}
     * 输出: <createtodolist>[{"title":"...","isDone":false},...]</createtodolist>
     */
    createTodoList: (payload) => {
      if (!payload || typeof payload !== "object") {
        return "";
      }

      // 支持 todos 或 items 字段
      const todoItems = payload.todos || payload.items || [];

      if (!Array.isArray(todoItems) || todoItems.length === 0) {
        return "";
      }

      // 将 todo 列表转换为 JSON 字符串，并转义 XML 字符
      const jsonString = JSON.stringify(todoItems);
      return `<createtodolist>${escapeXml(jsonString)}</createtodolist>`;
    },

    /**
     * 转换 createFile 操作
     * 输入: {fileName: "/path/file.vue"} 或 "/path/file.vue"
     * 输出: <create>{"path":"/path/file.vue","type":"file"}</create>
     */
    createFile: (payload) => {
      const fileNames = extractFilePaths(payload);
      if (fileNames.length === 0) {
        return "";
      }

      return fileNames
        .map((fileName) => {
          const isFolder = fileName.endsWith(".floder");
          const normalizedPath = isFolder ? fileName.slice(0, -7) : fileName;
          const displayPath = normalizeDisplayPath(normalizedPath);

          const payloadJson = JSON.stringify({
            path: displayPath,
            type: isFolder ? "folder" : "file",
          });

          return `<create>${escapeXml(payloadJson)}</create>`;
        })
        .join("");
    },

    /**
     * 转换 delectFile 操作
     * 输入: {fileName: "/path/file.vue"} 或 "/path/file.vue"
     * 输出: <delect>{"path":"/path/file.vue","type":"file"}</delect>
     */
    delectFile: (payload) => {
      const fileNames = extractFilePaths(payload);
      if (fileNames.length === 0) {
        return "";
      }

      return fileNames
        .map((fileName) => {
          const isFolder = fileName.endsWith(".floder");
          const normalizedPath = isFolder ? fileName.slice(0, -7) : fileName;
          const displayPath = normalizeDisplayPath(normalizedPath);

          const payloadJson = JSON.stringify({
            path: displayPath,
            type: isFolder ? "folder" : "file",
          });

          return `<delect>${escapeXml(payloadJson)}</delect>`;
        })
        .join("");
    },
    deleteFile: (payload) => {
      return transformFunctions.delectFile(payload);
    },

    /**
     * 转换 readFile 操作
     * 输入: {fileName: "/path/to/file.vue"} 或 "/path/to/file.vue"
     * 输出: <read>/path/to/file.vue</read>
     */
    readFile: (payload) => {
      const fileNames = extractFilePaths(payload);
      if (fileNames.length === 0) {
        return "";
      }

      return fileNames
        .map((fileName) => {
          const normalizedFilePath = normalizeDisplayPath(fileName);
          return `<read>${escapeXml(normalizedFilePath)}</read>`;
        })
        .join("");
    },

    /**
     * 转换 editFile 操作
     * 输入: {fileName: "/path/file.vue"} 或 "/path/file.vue"
     * 输出: <edit>{"path":"/path/file.vue","type":"file"}</edit>
     */
    editFile: (payload) => {
      const fileNames = extractFilePaths(payload, {
        includeNestedKeys: ["edit"],
      });
      if (fileNames.length === 0) {
        return "";
      }

      return fileNames
        .map((fileName) => {
          const normalizedPath = normalizeDisplayPath(fileName);
          const payloadJson = JSON.stringify({
            path: normalizedPath,
            type: "file",
          });

          return `<edit>${escapeXml(payloadJson)}</edit>`;
        })
        .join("");
    },

    /**
     * 转换 sqlOperation 操作
     * 输入: 任意 payload（仅用于提示）
     * 输出: <sqlOperation>正在进行 SQL 操作</sqlOperation>
     */
    sqlOperation: () => {
      return "<sqlOperation>正在进行 SQL 操作</sqlOperation>";
    },

    /**
     * 转换 bashOperation 操作
     * 输入: {bash: {bashInstruct: "npm install element-plus --save"}} 或 {bashInstruct: "..."}
     * 输出: <ran>npm install element-plus --save</ran>
     */
    bashOperation: (payload) => {
      if (!payload || typeof payload !== "object") {
        return "";
      }

      // 支持两种结构：
      // 1. {bash: {bashInstruct: "..."}}
      // 2. {bashInstruct: "..."}
      let bashInstruct = "";
      if (payload.bash && typeof payload.bash === "object") {
        bashInstruct = payload.bash.bashInstruct || "";
      } else if (payload.bashInstruct) {
        bashInstruct = payload.bashInstruct;
      }

      if (!bashInstruct || typeof bashInstruct !== "string") {
        return "";
      }

      return `<ran>${escapeXml(bashInstruct)}</ran>`;
    },

    // TODO: 后续添加其他方法的转换函数
    // fileSearch: (payload) => { ... },
    // webSearch: (payload) => { ... },
    // linter: (payload) => { ... },
    // deploy: (payload) => { ... },
    // doneTodo: (payload) => { ... },
    // ...
  };

  // 处理后的 dialogs 数组
  const processedDialogs = dialogs.map((dialog) => {
    // 只处理 AI 消息
    if (dialog.role_type !== "ai" || !dialog.content) {
      return dialog;
    }

    // 如果 content 不是对象，直接返回
    if (typeof dialog.content !== "object" || dialog.content === null) {
      return dialog;
    }

    // 将 content 对象转换为 XML 标签字符串
    const xmlTags = [];
    const contentObj = dialog.content;

    // 遍历 content 对象中的每个操作
    for (const [methodName, payload] of Object.entries(contentObj)) {
      // 获取对应的标签名
      const tagName = methodToTagMap[methodName];
      if (!tagName) {
        // 如果找不到映射，跳过该操作
        console.warn(
          `[operationHistoryMatch] 未找到方法 ${methodName} 的标签映射`
        );
        continue;
      }

      // 获取对应的转换函数
      const transformFn = transformFunctions[methodName];
      if (!transformFn) {
        // 如果转换函数不存在，跳过该操作
        console.warn(
          `[operationHistoryMatch] 方法 ${methodName} 的转换函数尚未实现`
        );
        continue;
      }

      // 执行转换
      try {
        const xmlTag = transformFn(payload);
        if (xmlTag) {
          xmlTags.push(xmlTag);
        }
      } catch (error) {
        console.error(
          `[operationHistoryMatch] 转换方法 ${methodName} 时出错:`,
          error
        );
      }
    }

    // 将所有 XML 标签拼接起来，替换原来的 content
    return {
      ...dialog,
      content: xmlTags.join(""),
    };
  });

  return processedDialogs;
}

/**
 * 转义 XML 特殊字符
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeXml(text) {
  if (typeof text !== "string") {
    return String(text);
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const DEFAULT_CANDIDATE_KEYS = [
  "fileName",
  "file_path",
  "path",
  "fullPath",
  "targetPath",
  "file",
  "relativePath",
];

const DEFAULT_NESTED_KEYS = ["create", "delete", "target"];

function normalizeDisplayPath(filePath) {
  if (typeof filePath !== "string") {
    return "";
  }
  const replaced = filePath.replace(/\\/g, "/");
  return replaced.startsWith("/") ? replaced : `/${replaced}`;
}

function extractFilePaths(payload, options = {}) {
  const collected = [];
  const seen = new Set();

  const candidateKeys = options.candidateKeys || DEFAULT_CANDIDATE_KEYS;
  const nestedKeys = options.includeNestedKeys
    ? [...new Set([...DEFAULT_NESTED_KEYS, ...options.includeNestedKeys])]
    : DEFAULT_NESTED_KEYS;

  const collect = (value) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "string") {
      if (!seen.has(value)) {
        collected.push(value);
        seen.add(value);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    for (const key of candidateKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        collect(value[key]);
      }
    }

    for (const key of nestedKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        collect(value[key]);
      }
    }
  };

  collect(payload);

  return collected;
}

/**
 * 从 payload 中提取文件路径，兼容多层嵌套结构
 * @param {any} payload
 * @param {{ includeNestedKeys?: string[] }} options
 * @returns {string}
 */
function extractFilePath(payload, options = {}) {
  const paths = extractFilePaths(payload, options);
  return paths.length > 0 ? paths[0] : "";
}

module.exports = operationHistoryMatch;
