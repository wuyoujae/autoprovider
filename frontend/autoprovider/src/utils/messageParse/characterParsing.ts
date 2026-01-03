/**
 * HTML 字符实体解码
 * 将 HTML 转义字符还原为正常字符
 * @param text 包含 HTML 转义字符的文本
 * @returns 解码后的文本
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) {
    return "";
  }

  // 创建一个临时 textarea 元素用于解码
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  const decoded = textarea.value;

  // 手动处理一些常见的 XML 实体
  return decoded
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * 递归解码 HTML 字符实体
 * 某些情况下可能存在多层转义
 * @param text 包含 HTML 转义字符的文本
 * @param maxIterations 最大递归次数，防止无限循环
 * @returns 完全解码后的文本
 */
export function decodeHtmlEntitiesRecursive(
  text: string,
  maxIterations: number = 3
): string {
  if (!text) {
    return "";
  }

  let decoded = text;
  let prevDecoded = "";
  let iterations = 0;

  // 持续解码直到文本不再变化或达到最大迭代次数
  while (decoded !== prevDecoded && iterations < maxIterations) {
    prevDecoded = decoded;
    decoded = decodeHtmlEntities(decoded);
    iterations++;
  }

  return decoded;
}
