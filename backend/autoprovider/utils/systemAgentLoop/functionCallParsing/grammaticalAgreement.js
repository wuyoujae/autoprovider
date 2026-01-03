const functionCalling = require("./functionCalling");
const autoComplete = require("./autoComplete");

/**
 * 语法匹配函数
 * 用于实时判断AI流式回复中的fullContent是否包含符合规范的function标签
 *
 * @param {string} fullContent - AI流式回复的累积内容
 */

// 定义所有Function标签（根标签）
const FUNCTION_TAGS = [
  "CHAT-TO-USER",
  "CREATE-FILE",
  "DELETE-FILE",
  "EDIT-FILE",
  "READ-FILE",
  "WEB_SEARCH",
  "FILE-SEARCH",
  "SQL-OPERATION",
  "BASH-OPERATION",
  "CREATE-TODOLIST",
  "DONE-TODO",
  "LINTER",
  "DEPLOY",
  "REASONERS",
];

// 定义所有属性标签
const ATTRIBUTE_TAGS = [
  "CONTENT",
  "FILE-NAME",
  "EDIT",
  "EDIT-OPERATION",
  "EDIT-POSITION",
  "FRONT-POSITION",
  "BACK-POSITION",
  "EDIT-CONTENT",
  "SEARCH_CONTENT",
  "SQL",
  "BASH",
  "OPERATION-POSITIOM",
  "BASH-INSTRUCT",
  "TODOLIST",
  "TODOLIST-NAME",
  "TODOCONTENT",
  "TODO",
  "TODO-TITLE",
  "REASON-CONTENT",
];

// 所有标签（Function + 属性）
const ALL_TAGS = [...FUNCTION_TAGS, ...ATTRIBUTE_TAGS];

// 全局状态：标签栈、已处理位置、待执行队列、是否在工作
let tagStack = [];
let processedPosition = 0;
let executionQueue = [];
let isWorking = false;
let isProcessingQueue = false;
let currentFullContent = ""; // 保存当前的完整内容，用于补全
let pendingCompletions = []; // 待处理的补全任务

/**
 * 将标签名转换为驼峰命名
 * @param {string} tagName - 标签名（如 "CHAT-TO-USER"）
 * @returns {string} - 驼峰命名（如 "chatToUser"）
 */
const tagToCamelCase = (tagName) => {
  return tagName
    .toLowerCase()
    .split(/[-_]/)
    .map((word, index) => {
      if (index === 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
};

/**
 * 判断是否为全大写的标签
 * @param {string} tagName - 标签名
 * @returns {boolean}
 */
const isUpperCaseTag = (tagName) => {
  return /^[A-Z0-9_-]+$/.test(tagName);
};

/**
 * 判断标签是否在系统规定的标签列表中
 * @param {string} tagName - 标签名
 * @returns {boolean}
 */
const isValidTag = (tagName) => {
  return ALL_TAGS.includes(tagName);
};

/**
 * 判断是否为Function标签
 * @param {string} tagName - 标签名
 * @returns {boolean}
 */
const isFunctionTag = (tagName) => {
  return FUNCTION_TAGS.includes(tagName);
};

/**
 * 提取标签内容（去除标签本身）
 * @param {string} fullText - 完整文本
 * @param {number} startTagStart - 开始标签的起始位置
 * @param {number} endTagEnd - 结束标签的结束位置
 * @param {string} tagName - 标签名
 * @returns {string} - 标签内容
 */
const extractTagContent = (fullText, startTagStart, endTagEnd, tagName) => {
  const startTagEnd = fullText.indexOf(">", startTagStart) + 1;
  const endTagStart = fullText.lastIndexOf(`</${tagName}>`, endTagEnd);
  return fullText.substring(startTagEnd, endTagStart).trim();
};

/**
 * 处理队列中的function对象
 * @param {Object} infoObject - 对话信息对象
 */
const processExecutionQueue = async (infoObject) => {
  if (isProcessingQueue || executionQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  console.log("\n========== 开始处理待执行队列 ==========");
  console.log("当前队列长度:", executionQueue.length);
  console.log("队列内容:", JSON.stringify(executionQueue, null, 2));

  while (executionQueue.length > 0) {
    const functionObject = executionQueue.shift();
    console.log(
      "\n[执行队列] 取出function对象:",
      JSON.stringify(functionObject, null, 2)
    );
    console.log("[执行队列] 剩余队列长度:", executionQueue.length);

    // 异步调用functionCalling，不阻塞解析
    functionCalling(functionObject, infoObject).catch((error) => {
      console.error("[执行队列] functionCalling执行失败:", error);
    });
  }

  console.log("========== 队列处理完成 ==========\n");
  isProcessingQueue = false;
};

/**
 * 解析标签并构建对象
 * @param {string} fullContent - 完整内容
 * @param {number} startPos - 开始解析的位置
 * @param {Object} infoObject - 对话信息对象
 */
const parseTags = (fullContent, startPos, infoObject) => {
  // 正则匹配开始标签和结束标签（包括小写的function-call）
  const tagRegex = /<(\/?)([A-Za-z0-9_-]+)>/g;
  let match;

  // 从已处理位置开始匹配
  tagRegex.lastIndex = startPos;

  while ((match = tagRegex.exec(fullContent)) !== null) {
    const isClosingTag = match[1] === "/";
    const tagName = match[2];
    const tagStart = match.index;
    const tagEnd = match.index + match[0].length;

    console.log(
      `\n[标签识别] 发现标签: ${
        isClosingTag ? "</" : "<"
      }${tagName}> (位置: ${tagStart}-${tagEnd})`
    );

    // 特殊处理：function-call标签（小写，但需要识别）
    if (tagName.toLowerCase() === "function-call") {
      if (!isClosingTag) {
        // 开始标签：开始工作
        console.log("[状态变化] 识别到 <function-call>，开始工作模式");
        isWorking = true;
        processedPosition = tagEnd;
      } else {
        // 结束标签：结束工作，处理完队列后退出
        console.log("[状态变化] 识别到 </function-call>，结束工作模式");
        isWorking = false;
        processedPosition = tagEnd;
        // 处理剩余的队列
        processExecutionQueue(infoObject);
        break;
      }
      continue;
    }

    // 标准化判断1：是否为全大写的标签（function-call除外）
    if (!isUpperCaseTag(tagName)) {
      console.log(`[标签验证] ❌ 标签 ${tagName} 不是全大写，跳过`);
      continue;
    }

    // 标准化判断2：标签是否在系统规定的标签列表中
    if (!isValidTag(tagName)) {
      console.log(`[标签验证] ❌ 标签 ${tagName} 不在系统标签列表中，跳过`);
      continue;
    }

    console.log(`[标签验证] ✅ 标签 ${tagName} 验证通过`);

    // 如果不在工作状态，跳过
    if (!isWorking) {
      console.log(`[标签验证] ⚠️ 当前不在工作状态，跳过标签 ${tagName}`);
      continue;
    }

    if (!isClosingTag) {
      // 开始标签：入栈
      const isFuncTag = isFunctionTag(tagName);
      console.log(
        `[标签入栈] ${
          isFuncTag ? "Function" : "Attribute"
        }标签 <${tagName}> 入栈`
      );
      console.log(`[标签栈状态] 当前栈深度: ${tagStack.length + 1}`);

      tagStack.push({
        tagName: tagName,
        startPos: tagStart,
        content: "",
        children: [],
      });

      console.log(
        `[标签栈状态] 栈内容: [${tagStack
          .map((item) => item.tagName)
          .join(", ")}]`
      );
      processedPosition = tagEnd;
    } else {
      // 结束标签：出栈并转换对象
      if (tagStack.length === 0) {
        console.log(`[标签出栈] ⚠️ 栈为空，无法出栈标签 </${tagName}>`);
        continue;
      }

      const stackItem = tagStack[tagStack.length - 1];

      // 检查标签是否匹配
      if (stackItem.tagName !== tagName) {
        // 标签不匹配，记录补全任务
        console.log(
          `[标签出栈] ⚠️ 标签不匹配，期望 </${stackItem.tagName}>，实际 </${tagName}>`
        );
        console.log(
          `[autoComplete] 检测到标签不匹配，记录补全任务：期望 </${stackItem.tagName}>`
        );

        // 记录补全任务（将在最终处理时统一执行）
        // 插入位置：在实际标签之前插入期望的标签
        const completionTask = {
          expectedTag: stackItem.tagName,
          actualTag: tagName,
          insertPosition: tagStart, // 在实际标签开始位置之前插入
        };

        // 检查是否已存在相同的补全任务（避免重复）
        const existingTask = pendingCompletions.find(
          (task) =>
            task.expectedTag === completionTask.expectedTag &&
            Math.abs(task.insertPosition - completionTask.insertPosition) < 10 // 允许10个字符的误差
        );

        if (!existingTask) {
          pendingCompletions.push(completionTask);
          console.log(
            `[autoComplete] 已记录补全任务：在位置 ${tagStart} 插入 </${stackItem.tagName}>，将在AI回复完成后统一处理`
          );
        } else {
          console.log(`[autoComplete] 已存在相似的补全任务，跳过重复记录`);
        }

        continue;
      }

      console.log(`[标签出栈] 开始处理 </${tagName}> 标签`);
      console.log(`[标签栈状态] 出栈前栈深度: ${tagStack.length}`);
      console.log(
        `[标签栈状态] 出栈前栈内容: [${tagStack
          .map((item) => item.tagName)
          .join(", ")}]`
      );

      // 提取标签内容（包含嵌套标签的原始文本）
      const rawContent = extractTagContent(
        fullContent,
        stackItem.startPos,
        tagEnd,
        tagName
      );

      console.log(
        `[标签内容] 标签 <${tagName}> 的原始内容长度: ${rawContent.length}`
      );
      if (rawContent.length < 100) {
        console.log(`[标签内容] 原始内容预览: ${rawContent.substring(0, 100)}`);
      }

      // 出栈
      tagStack.pop();
      console.log(`[标签栈状态] 出栈后栈深度: ${tagStack.length}`);
      console.log(
        `[标签栈状态] 出栈后栈内容: [${tagStack
          .map((item) => item.tagName)
          .join(", ")}]`
      );

      // 转换对象
      const camelCaseName = tagToCamelCase(tagName);
      let tagObject = {};

      if (isFunctionTag(tagName)) {
        // Function标签：创建对象，包含子属性
        console.log(`[对象转换] Function标签 <${tagName}> 转换为对象`);
        console.log(`[对象转换] 驼峰命名: ${camelCaseName}`);

        tagObject[camelCaseName] = {};

        // 处理子标签（children）
        if (stackItem.children && stackItem.children.length > 0) {
          console.log(`[对象转换] 发现 ${stackItem.children.length} 个子属性`);
          // 合并所有子属性
          stackItem.children.forEach((child, index) => {
            const childKey = Object.keys(child)[0];
            const childValue = child[childKey];

            // 格式化日志输出
            let logValue;
            if (typeof childValue === "object" && childValue !== null) {
              const jsonStr = JSON.stringify(childValue);
              logValue =
                jsonStr.length > 50
                  ? jsonStr.substring(0, 50) + "..."
                  : jsonStr;
            } else if (
              typeof childValue === "string" &&
              childValue.length > 50
            ) {
              logValue = childValue.substring(0, 50) + "...";
            } else {
              logValue = childValue;
            }

            console.log(
              `[对象转换] 处理子属性 ${index + 1}: ${childKey} = ${logValue}`
            );

            // 处理同名属性：如果已存在同名属性，转换为数组
            if (tagObject[camelCaseName][childKey]) {
              const existingValue = tagObject[camelCaseName][childKey];
              if (Array.isArray(existingValue)) {
                existingValue.push(childValue);
                console.log(
                  `[对象转换] 同名属性 ${childKey} 追加到数组，数组长度: ${existingValue.length}`
                );
              } else {
                tagObject[camelCaseName][childKey] = [
                  existingValue,
                  childValue,
                ];
                console.log(`[对象转换] 同名属性 ${childKey} 转换为数组`);
              }
            } else {
              tagObject[camelCaseName][childKey] = childValue;
            }
          });
        } else {
          console.log(
            `[对象转换] 无子属性，Function标签 <${tagName}> 保持空对象`
          );
          // 如果没有子标签，检查内容是否只是纯文本
          // 对于LINTER和DEPLOY等无参数的function，保持空对象
          if (rawContent) {
            const hasNestedTags = /<[A-Za-z0-9_-]+>/.test(rawContent);
            if (!hasNestedTags && rawContent.trim()) {
              // 如果只有纯文本且没有子标签，可能需要特殊处理
              // 大多数function都需要属性，所以这里保持为空对象
            }
          }
        }

        // 将function对象放入待执行队列
        console.log(`\n[队列更新] Function对象准备入队:`);
        console.log(JSON.stringify(tagObject, null, 2));
        console.log(`[队列更新] 入队前队列长度: ${executionQueue.length}`);

        executionQueue.push(tagObject);

        console.log(`[队列更新] ✅ Function对象已入队`);
        console.log(`[队列更新] 入队后队列长度: ${executionQueue.length}`);
        console.log(
          `[队列更新] 当前队列内容:`,
          executionQueue.map((item) => Object.keys(item)[0]).join(", ")
        );

        // 异步处理队列
        processExecutionQueue(infoObject);
      } else {
        // 属性标签：转换为属性对象
        console.log(`[对象转换] Attribute标签 <${tagName}> 转换为属性对象`);
        console.log(`[对象转换] 驼峰命名: ${camelCaseName}`);

        const attributeObject = {};

        // 如果栈项有children，说明有嵌套标签，需要合并children对象
        if (stackItem.children && stackItem.children.length > 0) {
          console.log(
            `[对象转换] 属性标签有 ${stackItem.children.length} 个嵌套子标签，开始合并嵌套对象`
          );

          // 创建嵌套对象结构
          const nestedObject = {};

          // 合并所有children对象
          stackItem.children.forEach((child, index) => {
            const childKey = Object.keys(child)[0];
            const childValue = child[childKey];

            console.log(
              `[对象转换] 处理嵌套子属性 ${index + 1}: ${childKey} = ${
                typeof childValue === "object"
                  ? JSON.stringify(childValue).substring(0, 50) + "..."
                  : typeof childValue === "string" && childValue.length > 50
                  ? childValue.substring(0, 50) + "..."
                  : childValue
              }`
            );

            // 处理同名属性：如果已存在同名属性，转换为数组
            if (nestedObject[childKey]) {
              const existingValue = nestedObject[childKey];
              if (Array.isArray(existingValue)) {
                existingValue.push(childValue);
                console.log(
                  `[对象转换] 同名嵌套属性 ${childKey} 追加到数组，数组长度: ${existingValue.length}`
                );
              } else {
                nestedObject[childKey] = [existingValue, childValue];
                console.log(`[对象转换] 同名嵌套属性 ${childKey} 转换为数组`);
              }
            } else {
              nestedObject[childKey] = childValue;
            }
          });

          // 提取纯文本内容（去除所有标签后的文本）
          const textContent = rawContent.replace(/<[^>]+>/g, "").trim();

          // 如果既有嵌套对象又有纯文本，将嵌套对象作为主要值，纯文本作为补充
          if (textContent) {
            console.log(
              `[对象转换] 属性标签既有嵌套对象又有纯文本，纯文本长度: ${textContent.length}`
            );
            // 将嵌套对象作为主要值
            attributeObject[camelCaseName] = nestedObject;
          } else {
            // 只有嵌套对象，直接使用
            attributeObject[camelCaseName] = nestedObject;
            console.log(
              `[对象转换] 属性值: ${camelCaseName} = 嵌套对象 (${
                Object.keys(nestedObject).length
              } 个属性)`
            );
          }
        } else {
          // 没有children，只有纯文本内容
          const textContent = rawContent.replace(/<[^>]+>/g, "").trim();
          if (textContent) {
            attributeObject[camelCaseName] = textContent;
            const preview =
              textContent.length > 50
                ? textContent.substring(0, 50) + "..."
                : textContent;
            console.log(`[对象转换] 属性值: ${camelCaseName} = "${preview}"`);
          } else {
            console.log(`[对象转换] ⚠️ 属性标签 <${tagName}> 没有内容`);
          }
        }

        // 将属性添加到父标签的children中
        if (tagStack.length > 0) {
          const parentItem = tagStack[tagStack.length - 1];
          console.log(
            `[对象转换] 将属性添加到父标签 <${parentItem.tagName}> 的children中`
          );

          if (!parentItem.children) {
            parentItem.children = [];
          }

          // 处理同名属性：合并为数组或追加
          const existingChild = parentItem.children.find(
            (child) => Object.keys(child)[0] === camelCaseName
          );

          if (existingChild) {
            // 如果已存在同名属性，转换为数组
            const existingValue = existingChild[camelCaseName];
            if (Array.isArray(existingValue)) {
              existingValue.push(attributeObject[camelCaseName]);
              console.log(
                `[对象转换] 同名属性 ${camelCaseName} 追加到数组，数组长度: ${existingValue.length}`
              );
            } else {
              existingChild[camelCaseName] = [
                existingValue,
                attributeObject[camelCaseName],
              ];
              console.log(`[对象转换] 同名属性 ${camelCaseName} 转换为数组`);
            }
          } else {
            parentItem.children.push(attributeObject);
            console.log(
              `[对象转换] ✅ 属性 ${camelCaseName} 已添加到父标签children，父标签children数量: ${parentItem.children.length}`
            );
          }
        } else {
          console.log(`[对象转换] ⚠️ 栈为空，无法将属性添加到父标签`);
        }
      }

      processedPosition = tagEnd;
    }
  }
};

/**
 * 处理待补全任务
 * @param {string} fullContent - 完整的AI回复内容
 * @param {Object} infoObject - 对话信息对象
 * @returns {Promise<string>} 返回修正后的完整内容
 */
const processPendingCompletions = async (fullContent, infoObject) => {
  if (pendingCompletions.length === 0) {
    return fullContent;
  }

  console.log(`\n[autoComplete] ========== 处理待补全任务 ==========`);
  console.log(`[autoComplete] 待补全任务数量: ${pendingCompletions.length}`);

  let correctedContent = fullContent || "";

  // 按插入位置从后往前排序，避免位置偏移问题
  const sortedCompletions = [...pendingCompletions].sort(
    (a, b) => b.insertPosition - a.insertPosition
  );

  for (const task of sortedCompletions) {
    if (infoObject?.dialogueId && infoObject?.sessionId) {
      const completionResult = await autoComplete({
        fullContent: correctedContent,
        expectedTag: task.expectedTag,
        actualTag: task.actualTag,
        insertPosition: task.insertPosition,
        sessionId: infoObject.sessionId,
        dialogueId: infoObject.dialogueId,
        connection: infoObject.connection,
      });

      if (completionResult.success) {
        correctedContent = completionResult.correctedContent;
        console.log(`[autoComplete] ✅ 已补全标签 </${task.expectedTag}>`);
      }
    } else {
      console.log(
        `[autoComplete] ⚠️ 缺少 dialogueId 或 sessionId，跳过补全任务`
      );
    }
  }

  // 清空待补全任务
  pendingCompletions = [];

  console.log(`[autoComplete] ========== 待补全任务处理完成 ==========\n`);

  return correctedContent;
};

/**
 * 语法匹配主函数
 * @param {string} fullContent - AI流式回复的累积内容
 * @param {Object} infoObject - 对话信息对象
 */
const grammaticalAgreement = (fullContent, infoObject) => {
  // 如果内容为空，直接返回
  if (!fullContent || fullContent.trim() === "") {
    return;
  }

  // 检测是否是新对话的开始（通过比较当前内容长度和已处理位置）
  // 如果 fullContent 的长度小于 processedPosition，说明是新对话开始了
  if (fullContent.length < processedPosition) {
    console.log(`[grammaticalAgreement] 检测到新对话开始，重置解析状态`);
    processedPosition = 0;
    tagStack = [];
    isWorking = false;
    currentFullContent = "";
  }

  // 更新当前完整内容
  currentFullContent = fullContent;

  // 从已处理位置开始解析
  if (processedPosition >= fullContent.length) {
    return;
  }

  const newContentLength = fullContent.length - processedPosition;
  if (newContentLength > 0) {
    console.log(`\n[解析开始] ========== 新一轮解析 ==========`);
    console.log(`[解析开始] 已处理位置: ${processedPosition}`);
    console.log(`[解析开始] 总内容长度: ${fullContent.length}`);
    console.log(`[解析开始] 新内容长度: ${newContentLength}`);
    console.log(`[解析开始] 工作状态: ${isWorking ? "工作中" : "等待中"}`);
  }

  // 解析标签
  parseTags(fullContent, processedPosition, infoObject);

  if (newContentLength > 0) {
    console.log(`[解析结束] ========== 本轮解析完成 ==========\n`);
  }
};

/**
 * 完成解析后的处理（在AI回复完成后调用）
 * 处理待补全任务并重新解析
 * @param {string} fullContent - 完整的AI回复内容
 * @param {Object} infoObject - 对话信息对象
 * @returns {Promise<string>} 返回修正后的完整内容
 */
const finalizeParsing = async (fullContent, infoObject) => {
  console.log(`\n[grammaticalAgreement] ========== 开始最终处理 ==========`);

  // 处理待补全任务
  const correctedContent = await processPendingCompletions(
    fullContent,
    infoObject
  );

  // 如果有修正，重新解析
  if (correctedContent !== fullContent && correctedContent) {
    console.log(
      `[grammaticalAgreement] 检测到内容已修正，重新解析修正后的内容`
    );
    console.log(
      `[grammaticalAgreement] 修正前长度: ${fullContent.length}，修正后: ${correctedContent.length}`
    );

    // 重置状态
    processedPosition = 0;
    isWorking = false;
    tagStack = [];
    currentFullContent = correctedContent;

    // 重新解析修正后的内容
    parseTags(correctedContent, 0, infoObject);
  }

  console.log(`[grammaticalAgreement] ========== 最终处理完成 ==========\n`);

  return correctedContent || fullContent;
};

module.exports = grammaticalAgreement;
module.exports.finalizeParsing = finalizeParsing;
module.exports.resetState = () => {
  tagStack = [];
  processedPosition = 0;
  executionQueue = [];
  isWorking = false;
  isProcessingQueue = false;
  currentFullContent = "";
  pendingCompletions = [];
};
