/**
 * Lint 适配表：按技术栈提供默认的 lint 命令
 * 后续新增技术栈时只需在此处添加条目并注册 type。
 */
const lintCompatibilityTable = {
  // Next.js / React / Node TypeScript 默认使用 ESLint
  nextjs: {
    description: "Next.js 默认使用 ESLint，对 TS/TSX 做全量扫描",
    defaultCommand:
      "npx eslint . --ext .js,.jsx,.ts,.tsx --cache=false --format json",
    // 可用于探测是否适用的关键文件
    detectFiles: ["package.json", "next.config.js"],
  },
};

module.exports = lintCompatibilityTable;
