const fs = require("fs").promises;
const { message2token } = require("../combyChatHistory");

// 与 Agent.js 保持一致（优先新版本，缺失则回退）
const promptCandidates = [
  process.env.AGENT_PROMPT_FILE,
  "agent/prompt0.7.md",
  "agent/prompt0.6.md",
  "agent/prompt0.5.md",
].filter(Boolean);
const functionsCandidates = [
  process.env.AGENT_FUNCTIONS_FILE,
  "agent/Agentfunction_v2.json",
  "agent/Agentfunction.json",
].filter(Boolean);

let cachedPreToken = null;

async function calcPreToken() {
  if (cachedPreToken !== null) return cachedPreToken;
  try {
    const tryReadText = async (paths) => {
      let lastErr = null;
      for (const p of paths) {
        try {
          return await fs.readFile(p, "utf-8");
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("No readable file candidates");
    };

    const systemPrompt = await tryReadText(promptCandidates);
    const agentFunctions = JSON.parse(await tryReadText(functionsCandidates));

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
