const { exec } = require("child_process");
const { promisify } = require("util");
const iconv = require("iconv-lite");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const combyFilePath = require("../systemAgentLoop/utils/combyFilePath");
const recordErrorLog = require("../recordErrorLog");
const bashOperationVec = require("../systemAgentLoop/bashOperationVec");
const decodeHtmlEntities = require("../systemAgentLoop/utils/decodeHtmlEntities");
const chatToFrontend = require("./functionChatToFrontend/chatToFrontend");
const getProjectsBasePath = require("../getProjectsBasePath");

// 将 exec 转换为 Promise 版本
const execAsync = promisify(exec);

const PROJECTS_BASE_PATH = getProjectsBasePath(); // 项目存放的基础路径（支持环境变量）
/**
 * 执行多个 bash 命令
 * @param {Object} payload - 函数参数对象
 * @param {Array} payload.commands - 命令数组，每个命令包含 working_directory 和 instruction
 * @param {Object} infoObject - 包含项目信息的对象
 * @returns {Promise<{status: number, message: string, data: object}>} 返回操作结果
 */
async function bashOperation(payload = {}, infoObject = {}) {
  try {
    const DEFAULT_SUGGESTION = "请检查命令和参数是否正确";

    let commandOperationPath = PROJECTS_BASE_PATH + "/" + infoObject.projectId;
    const buildFailResult = ({
      index,
      workingDirectory = "",
      instruction = "",
      reason,
      suggestion = DEFAULT_SUGGESTION,
      exitCode = 1,
      output = "",
      outputType = "stderr",
    }) => ({
      command: {
        working_directory: workingDirectory,
        instruction,
        result: `执行结果：execute fail【${reason}】`,
        exit_code: exitCode,
        output,
        output_type: outputType,
      },
      detail: {
        command_index: index,
        reason,
        suggestion,
      },
    });

    const trimOutput = (value) =>
      typeof value === "string" && value.trim() ? value.trim() : "";

    // 参数验证
    if (!infoObject.projectId) {
      return {
        status: 1,
        message: "bashoperation run fail",
        data: {
          error: "平台系统问题出错，请暂停工作",
        },
      };
    }

    // 从 payload 中获取 commands 参数
    let commands = payload?.commands;

    // 容错处理：如果 AI 错误地将数组序列化为字符串，尝试解析
    if (typeof commands === "string") {
      try {
        commands = JSON.parse(commands);
        console.log("[bashOperation] 已自动解析字符串形式的 commands 数组");
      } catch (parseError) {
        return {
          status: 1,
          message: "bashoperation fail",
          data: {
            error: "commands 参数格式错误，无法解析为数组",
          },
        };
      }
    }

    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      return {
        status: 1,
        message: "bashoperation fail",
        data: {
          error: "commands 参数不能为空，必须是数组",
        },
      };
    }

    // 存储执行结果
    const commandResults = [];
    const failedDetails = [];
    let successfulCommands = 0;
    let failedCommands = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmdObj = commands[i];

      // 验证命令对象格式
      if (!cmdObj || typeof cmdObj !== "object") {
        const { command, detail } = buildFailResult({
          index: i,
          reason: "命令对象格式错误",
          suggestion: "请检查函数参数格式是否正确",
        });
        commandResults.push(command);
        failedDetails.push(detail);
        failedCommands += 1;
        continue;
      }

      // 获取工作目录和指令
      const workingDirectory = cmdObj.working_directory;
      const instruction = cmdObj.instruction;

      // 参数验证
      if (!workingDirectory || typeof workingDirectory !== "string") {
        const { command, detail } = buildFailResult({
          index: i,
          reason: "working_directory 不能为空",
          suggestion: "请提供有效的工作目录路径",
        });
        commandResults.push(command);
        failedDetails.push(detail);
        failedCommands += 1;
        continue;
      }

      if (!instruction || typeof instruction !== "string") {
        const { command, detail } = buildFailResult({
          index: i,
          workingDirectory,
          reason: "instruction 不能为空",
          suggestion: "请提供需要执行的命令",
        });
        commandResults.push(command);
        failedDetails.push(detail);
        failedCommands += 1;
        continue;
      }

      // 解码
      let decodedWorkDir = decodeHtmlEntities(workingDirectory);
      const command = decodeHtmlEntities(instruction).trim();

      // 兼容不同平台/不同调用风格：将 "/xxx" 这种绝对样式的工作目录转换为相对目录
      // 否则在 Windows 下 path.join(base, "/app") 可能导致丢失 basePath
      decodedWorkDir = String(decodedWorkDir).replace(/\\/g, "/");
      decodedWorkDir = decodedWorkDir.replace(/^\/+/, ""); // 去掉开头的 /
      if (!decodedWorkDir) decodedWorkDir = "."; // 根目录

      // 使用 commandOperationPath + decodedWorkDir 组合完整的项目路径
      const absoluteWorkDir = path.join(commandOperationPath, decodedWorkDir);

      // 检查目录是否存在（使用异步方法）
      let dirExists = false;
      let stat = null;
      try {
        stat = await fs.stat(absoluteWorkDir);
        dirExists = true;
      } catch (statError) {
        dirExists = false;
      }

      if (!dirExists) {
        const { command, detail } = buildFailResult({
          index: i,
          workingDirectory: decodedWorkDir,
          instruction: command,
          reason: "工作目录不存在",
          suggestion: "请检查工作目录路径是否正确",
          output: `执行路径不存在: ${absoluteWorkDir}`,
        });
        commandResults.push(command);
        failedDetails.push(detail);
        failedCommands += 1;
        continue;
      }

      // 检查是否是目录
      if (!stat.isDirectory()) {
        const { command, detail } = buildFailResult({
          index: i,
          workingDirectory: decodedWorkDir,
          instruction: command,
          reason: "执行路径不是目录",
          suggestion: "请提供有效的目录路径",
          output: `执行路径不是目录: ${absoluteWorkDir}`,
        });
        commandResults.push(command);
        failedDetails.push(detail);
        failedCommands += 1;
        continue;
      }

      chatToFrontend(command, "bash_operation", infoObject);

      try {
        // 使用 bashOperationVec 验证命令
        const isAllowed = bashOperationVec(command);

        if (!isAllowed) {
          const { command: failCommand, detail } = buildFailResult({
            index: i,
            workingDirectory: decodedWorkDir,
            instruction: command,
            reason: "危险操作被阻止",
            suggestion: "请使用安全的操作命令",
            output: `命令未通过安全验证，命令: ${command}，执行路径: ${absoluteWorkDir}`,
          });
          commandResults.push(failCommand);
          failedDetails.push(detail);
          failedCommands += 1;
          continue;
        }

        // 命令通过验证，执行命令（使用异步执行，不阻塞事件循环）
        try {
          // 异步执行命令
          const { stdout, stderr } = await execAsync(command, {
            encoding: "buffer",
            timeout: 300000, // 5分钟超时
            cwd: absoluteWorkDir,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });

          // 成功执行
          commandResults.push({
            working_directory: decodedWorkDir,
            instruction: command,
            result: "执行结果：execute success",
            exit_code: 0,
            output: trimOutput(iconv.decode(stdout, "cp936")) || "命令执行成功",
            output_type: "stdout",
          });
          successfulCommands += 1;
        } catch (execError) {
          // 命令执行失败
          const stdoutBuf = execError.stdout;
          const stderrBuf = execError.stderr;

          // 优先使用 stderr，如果没有则使用 stdout，最后使用 message
          let outputContent = "";
          let outputType = "stdout";

          // 尝试解码
          if (stderrBuf && stderrBuf.length > 0) {
            outputContent = iconv.decode(stderrBuf, "cp936");
            outputType = "stderr";
          } else if (stdoutBuf && stdoutBuf.length > 0) {
            outputContent = iconv.decode(stdoutBuf, "cp936");
          } else {
            outputContent = execError.message;
          }

          // exec 异步版本的错误使用 code 表示退出码
          const exitCode =
            typeof execError.code === "number" ? execError.code : 1;

          let reason = "命令执行失败";
          let suggestion = DEFAULT_SUGGESTION;

          if (exitCode === 127) {
            reason = "命令不存在";
            suggestion = "请检查命令拼写或是否已安装相关工具";
          } else if (exitCode === 126) {
            reason = "命令无法执行";
            suggestion = "请检查执行权限或脚本可执行状态";
          }

          const { command: failCommand, detail } = buildFailResult({
            index: i,
            workingDirectory: decodedWorkDir,
            instruction: command,
            reason,
            suggestion,
            exitCode,
            output: trimOutput(outputContent) || execError.message,
            outputType,
          });
          commandResults.push(failCommand);
          failedDetails.push(detail);
          failedCommands += 1;
        }
      } catch (vecError) {
        // bashOperationVec 验证过程出错
        recordErrorLog(vecError, `bashOperation - validate command ${i + 1}`);
        const { command: failCommand, detail } = buildFailResult({
          index: i,
          workingDirectory: decodedWorkDir,
          instruction: command,
          reason: "安全验证系统异常",
          suggestion: "请稍后重试或联系管理员",
          output: "系统验证过程出错，请重新调用方法",
        });
        commandResults.push(failCommand);
        failedDetails.push(detail);
        failedCommands += 1;
      }
    }

    const totalCommands = commandResults.length;
    const summary = {
      total_commands: totalCommands,
      successful_commands: successfulCommands,
      failed_commands: failedCommands,
      success_rate:
        totalCommands === 0
          ? "0%"
          : `${Math.round((successfulCommands / totalCommands) * 100)}%`,
      failed_details: failedDetails,
    };

    let status = 0;
    let message = "所有命令执行成功";

    if (failedCommands > 0 && successfulCommands > 0) {
      status = 1;
      message = "部分命令执行失败";
    } else if (failedCommands === totalCommands) {
      status = 1;
      message = "所有命令执行失败";
    }

    return {
      status,
      message,
      data: {
        commands: commandResults,
        summary,
      },
    };
  } catch (error) {
    recordErrorLog(error, "AgentFunction in bash operation");
    return {
      status: 1,
      message: "bashoperation fail",
      data: {
        error: "系统错误请停止工作",
      },
    };
  }
}

module.exports = bashOperation;
