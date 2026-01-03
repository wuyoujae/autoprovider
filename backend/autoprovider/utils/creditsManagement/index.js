/**
 * 积分管理系统
 *
 * 包含两个主要模块：
 * 1. creditsCalculate - 计算token消耗对应的积分数量
 * 2. updateCredits - 更新用户积分并记录历史
 */

const {
  creditsCalculate,
  getPricingConfig,
  getDetailedCostBreakdown,
  calculatePlatformTokenPricing,
  INPUT_TOKEN_PRICE_PER_MILLION,
  OUTPUT_TOKEN_PRICE_PER_MILLION,
  PROFIT_MARGIN_PER_MILLION,
} = require("./creditsCalculate");

const {
  updateCredits,
  batchUpdateCredits,
  getCreditHistory,
  getUserCredits,
} = require("./updateCredits");

module.exports = {
  // 积分计算相关
  creditsCalculate,
  getPricingConfig,
  getDetailedCostBreakdown,
  calculatePlatformTokenPricing,
  INPUT_TOKEN_PRICE_PER_MILLION,
  OUTPUT_TOKEN_PRICE_PER_MILLION,
  PROFIT_MARGIN_PER_MILLION,

  // 积分更新相关
  updateCredits,
  batchUpdateCredits,
  getCreditHistory,
  getUserCredits,
};
