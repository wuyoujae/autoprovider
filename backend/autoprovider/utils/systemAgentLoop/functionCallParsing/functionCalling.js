const AIfunctions = require("../../AIfunction");
const autoFilePathFix = require("./autoFilePathFix");

/**
 * 功能调用函数
 * 用于执行解析出来的function对象
 * 作为函数分配器，根据function对象的key调用对应的函数
 *
 * @param {Object} functionObject - 解析后的function对象，例如：
 *   { chatToUser: { content: "..." } }
 *   { createFile: { fileName: "..." } }
 * @param {Object} infoObject - 对话信息对象
 * @returns {Promise<void>}
 */

// 维护一个执行队列，确保函数按顺序执行
let executionChain = Promise.resolve();

/**
 * 将function对象转换为函数调用
 * @param {Object} functionObject - function对象
 * @returns {Promise<void>}
 */
const functionCalling = async (functionObject, infoObject) => {
  // 参数验证
  if (!functionObject || typeof functionObject !== "object") {
    console.error("[functionCalling] ❌ 无效的function对象:", functionObject);
    return;
  }

  // 获取function对象的key（应该只有一个key）
  const functionKeys = Object.keys(functionObject);
  if (functionKeys.length === 0) {
    console.error("[functionCalling] ❌ function对象为空");
    return;
  }

  if (functionKeys.length > 1) {
    console.warn(
      "[functionCalling] ⚠️ function对象包含多个key，只使用第一个:",
      functionKeys[0]
    );
  }
  const functionName = functionKeys[0];
  let functionParams = functionObject[functionName];

  console.log(`\n[functionCalling] ========== 开始执行函数 ==========`);
  console.log(`[functionCalling] 函数名: ${functionName}`);
  console.log(
    `[functionCalling] 原始函数参数:`,
    JSON.stringify(functionParams, null, 2)
  );

  // 自动修正文件路径（在调用函数之前）
  functionParams = autoFilePathFix({
    functionParams,
    functionName,
  });

  console.log(
    `[functionCalling] 修正后的函数参数:`,
    JSON.stringify(functionParams, null, 2)
  );

  // 检查函数是否存在
  if (!AIfunctions[functionName]) {
    console.error(
      `[functionCalling] ❌ 函数 ${functionName} 不存在于AIfunction中`
    );
    console.log(`[functionCalling] 可用的函数:`, Object.keys(AIfunctions));
    return;
  }

  //传递infoObject给函数
  const targetFunction = AIfunctions[functionName];

  // 创建 operationInfoObject，用于记录操作到数据库
  // 注意：dialogue_id 暂时为 null，会在 AgentWork 中统一设置
  // 注意：operation_code 使用修正后的参数，确保记录的是正确的路径
  const correctedFunctionObject = {
    [functionName]: functionParams,
  };
  const operationInfoObject = {
    dialogue_id: null, // 将在 AgentWork 中统一设置
    operation_code: JSON.stringify(correctedFunctionObject),
    operation_method: functionName,
    connection: infoObject.connection || null,
  };

  // 将操作对象添加到待记录数组中，等待 AgentWork 统一记录
  if (!infoObject.pendingOperations) {
    infoObject.pendingOperations = [];
  }
  infoObject.pendingOperations.push(operationInfoObject);

  console.log(
    `[functionCalling] 操作已添加到待记录队列，当前队列长度: ${infoObject.pendingOperations.length}`
  );
  console.log(
    `[functionCalling] operationInfoObject:`,
    JSON.stringify(
      {
        operation_code: operationInfoObject.operation_code,
        operation_method: operationInfoObject.operation_method,
        has_connection: !!operationInfoObject.connection,
      },
      null,
      2
    )
  );

  // 将当前函数调用添加到执行链中，确保顺序执行
  executionChain = executionChain
    .then(async () => {
      try {
        console.log(`[functionCalling] 开始调用函数: ${functionName}`);
        const startTime = Date.now();

        // 调用函数，传递参数对象、infoObject 和 operationInfoObject
        const result = await targetFunction(
          functionParams,
          infoObject,
          operationInfoObject
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(
          `[functionCalling] ✅ 函数 ${functionName} 执行成功 (耗时: ${duration}ms)`
        );
        if (result !== undefined) {
          console.log(
            `[functionCalling] 函数返回值:`,
            typeof result === "object"
              ? JSON.stringify(result, null, 2)
              : result
          );
        }
        console.log(`[functionCalling] ========== 函数执行完成 ==========\n`);
      } catch (error) {
        console.error(
          `[functionCalling] ❌ 函数 ${functionName} 执行失败:`,
          error.message
        );
        console.error(`[functionCalling] 错误堆栈:`, error.stack);
        console.log(`[functionCalling] ========== 函数执行失败 ==========\n`);
        // 不抛出错误，继续执行下一个函数
      }
    })
    .catch((error) => {
      console.error(`[functionCalling] ❌ 执行链错误:`, error.message);
    });

  // 等待当前函数执行完成（但不阻塞后续函数的入队）
  await executionChain;
};

module.exports = functionCalling;
