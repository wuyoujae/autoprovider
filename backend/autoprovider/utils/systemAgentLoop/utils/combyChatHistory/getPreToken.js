const fs = require("fs").promises;
const { message2token } = require("../combyChatHistory");

// 与 Agent.js 保持一致
const systemPromptPath = "agent/prompt0.3.md";
const agentFunctionsPath = "agent/Agentfunction.json";

let cachedPreToken = null;

async function calcPreToken() {
  if (cachedPreToken !== null) return cachedPreToken;
  try {
    const systemPrompt = await fs.readFile(systemPromptPath, "utf-8");
    const agentFunctions = JSON.parse(
      await fs.readFile(agentFunctionsPath, "utf-8")
    );

    const systemPromptToken = message2token(systemPrompt);
    const agentFunctionsToken = message2token(JSON.stringify(agentFunctions));
    cachedPreToken = systemPromptToken + agentFunctionsToken;
    return cachedPreToken;
  } catch (error) {
    console.error("Error calculating pre-tokens:", error);
    // 返回一个估算值，避免返回 0 导致显示异常
    cachedPreToken = 15000;
    return cachedPreToken;
  }
}

module.exports = { calcPreToken };
