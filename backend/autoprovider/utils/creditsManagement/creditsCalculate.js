const recordErrorLog = require("../recordErrorLog");

// ==================== 配置常量 ====================
// 这些常量可以根据实际业务需求调整

/**
 * 每百万输入token的成本价格（单位：元）
 */
const INPUT_TOKEN_PRICE_PER_MILLION = 2.1;

/**
 * 每百万输出token的成本价格（单位：元）
 */
const OUTPUT_TOKEN_PRICE_PER_MILLION = 8.4;

/**
 * 利润指数：用户每消耗100万token，平台需要赚取的利润（单位：元）
 * 这个利润是在成本之外额外收取的
 */
const PROFIT_MARGIN_PER_MILLION = 3;

const MILLION = 1_000_000;

// ==================== 辅助方法 ====================

/**
 * 校验 token 数量是否合法
 * @param {number} value - token 数量
 * @param {string} name - 参数名称
 */
function assertValidTokenValue(value, name) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new Error(`${name} 必须是非负数`);
  }
}

/**
 * 计算平台 token 的价格信息
 *
 * 平台 token 价格 = [ (input/(input+output)) × 输入价格 + (output/(input+output)) × 输出价格 ] + 利润指数
 *
 * @param {number} inputTokens - 输入 token 数量
 * @param {number} outputTokens - 输出 token 数量
 * @returns {{
 *   totalTokens: number,
 *   platformTokenPricePerMillion: number,
 *   platformTokenPricePerToken: number,
 *   creditsPerYuan: number
 * }}
 */
function calculatePlatformTokenPricing(inputTokens, outputTokens) {
  const totalTokens = inputTokens + outputTokens;

  if (totalTokens === 0) {
    return {
      totalTokens,
      platformTokenPricePerMillion: 0,
      platformTokenPricePerToken: 0,
      creditsPerYuan: 0,
    };
  }

  const inputRatio = inputTokens / totalTokens;
  const outputRatio = outputTokens / totalTokens;

  const weightedCostPerMillion =
    inputRatio * INPUT_TOKEN_PRICE_PER_MILLION +
    outputRatio * OUTPUT_TOKEN_PRICE_PER_MILLION;

  const platformTokenPricePerMillion =
    weightedCostPerMillion + PROFIT_MARGIN_PER_MILLION;

  const platformTokenPricePerToken = platformTokenPricePerMillion / MILLION;

  const creditsPerYuan =
    platformTokenPricePerToken === 0 ? 0 : 1 / platformTokenPricePerToken;

  return {
    totalTokens,
    platformTokenPricePerMillion,
    platformTokenPricePerToken,
    creditsPerYuan,
  };
}

// ==================== 核心计算方法 ====================

/**
 * 计算 token 消耗对应的积分数量
 *
 * 消耗积分 = ceil(输入 token + 输出 token)
 *
 * @param {number} inputTokens - 输入 token 数量
 * @param {number} outputTokens - 输出 token 数量
 * @returns {number} 需要消耗的积分数量（向上取整）
 */
function creditsCalculate(inputTokens, outputTokens) {
  try {
    assertValidTokenValue(inputTokens, "输入 token 数量");
    assertValidTokenValue(outputTokens, "输出 token 数量");

    const totalTokens = inputTokens + outputTokens;

    if (totalTokens === 0) {
      return 0;
    }

    return Math.ceil(totalTokens);
  } catch (error) {
    recordErrorLog(error, "creditsCalculate");
    throw error;
  }
}

/**
 * 获取当前的定价配置信息
 * @returns {Object} 包含所有定价配置的对象
 */
function getPricingConfig() {
  return {
    inputTokenPricePerMillion: INPUT_TOKEN_PRICE_PER_MILLION,
    outputTokenPricePerMillion: OUTPUT_TOKEN_PRICE_PER_MILLION,
    profitMarginPerMillion: PROFIT_MARGIN_PER_MILLION,
  };
}

/**
 * 计算 token 的详细费用明细
 * @param {number} inputTokens - 输入 token 数量
 * @param {number} outputTokens - 输出 token 数量
 * @returns {Object} 详细的费用明细
 */
function getDetailedCostBreakdown(inputTokens, outputTokens) {
  try {
    assertValidTokenValue(inputTokens, "输入 token 数量");
    assertValidTokenValue(outputTokens, "输出 token 数量");

    const {
      totalTokens,
      platformTokenPricePerMillion,
      platformTokenPricePerToken,
      creditsPerYuan,
    } = calculatePlatformTokenPricing(inputTokens, outputTokens);

    const totalFeeInYuan =
      (totalTokens / MILLION) * platformTokenPricePerMillion;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      platformTokenPricePerMillion: Number(
        platformTokenPricePerMillion.toFixed(6)
      ),
      platformTokenPricePerToken: Number(
        platformTokenPricePerToken.toFixed(12)
      ),
      creditsPerYuan: Number(creditsPerYuan.toFixed(6)),
      totalFeeInYuan: Number(totalFeeInYuan.toFixed(6)),
      credits: creditsCalculate(inputTokens, outputTokens),
    };
  } catch (error) {
    recordErrorLog(error, "getDetailedCostBreakdown");
    throw error;
  }
}

module.exports = {
  creditsCalculate,
  getPricingConfig,
  getDetailedCostBreakdown,
  calculatePlatformTokenPricing,
  // 导出常量供外部使用（如果需要）
  INPUT_TOKEN_PRICE_PER_MILLION,
  OUTPUT_TOKEN_PRICE_PER_MILLION,
  PROFIT_MARGIN_PER_MILLION,
};
