import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

// 创建 markdown-it 实例，配置选项
// 注意：breaks: false 确保列表能正确解析，单个换行符不会变成 <br>
const md = new MarkdownIt({
  html: true, // 启用 HTML 标签
  linkify: true, // 自动识别链接
  typographer: true, // 启用一些语言中性的替换 + 引号美化
  breaks: false, // 不自动转换单个换行符为 <br>，这样列表才能正确解析
});

/**
 * 预处理 Markdown 文本，规范化格式
 * @param text 原始文本
 * @returns 处理后的文本
 */
function preprocessMarkdown(text: string): string {
  // 先处理转义符
  let processed = text
    .replace(/\\n/g, "\n") // \n 转换为换行
    .replace(/\\t/g, "\t") // \t 转换为制表符
    .replace(/\\r/g, "\r") // \r 转换为回车
    .replace(/\\\\/g, "\\") // \\ 转换为 \
    .replace(/\\"/g, '"') // \" 转换为 "
    .replace(/\\'/g, "'"); // \' 转换为 '

  // 规范化行尾，统一为 \n
  processed = processed.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 处理列表：规范化列表格式，确保列表能正确解析
  const lines = processed.split("\n");
  const normalizedLines: string[] = [];
  let inList = false;
  let prevWasListItem = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    const trimmedLine = line.trim();

    // 检测是否是列表项（有序列表：数字. 或无序列表：- 或 *）
    // 支持带缩进的列表项（嵌套列表）
    const orderedListMatch = line.match(/^(\s*)(\d+)\.\s/);
    const unorderedListMatch = line.match(/^(\s*)[-*+]\s/);
    const isListItem = orderedListMatch !== null || unorderedListMatch !== null;

    // 检测是否是缩进内容（列表项的子内容）
    const hasIndent = line.match(/^\s{2,}/) !== null;
    const isIndentedContent = hasIndent && !isListItem && trimmedLine !== "";

    if (isListItem) {
      // 列表项
      if (!inList && normalizedLines.length > 0) {
        // 如果之前不在列表中，检查上一行是否需要空行分隔
        const lastLine = normalizedLines[normalizedLines.length - 1];
        if (lastLine && lastLine.trim() !== "") {
          normalizedLines.push("");
        }
      }
      inList = true;
      prevWasListItem = true;
      normalizedLines.push(line);
    } else if (isIndentedContent && inList) {
      // 列表项的缩进内容（嵌套列表或列表项的子内容）
      normalizedLines.push(line);
      prevWasListItem = false;
    } else if (trimmedLine === "") {
      // 空行
      normalizedLines.push("");
      // 如果连续两个空行，结束列表状态
      const lastLine = normalizedLines[normalizedLines.length - 2];
      if (lastLine === "" && inList) {
        inList = false;
      }
      prevWasListItem = false;
    } else {
      // 普通文本行
      if (inList && prevWasListItem) {
        // 列表结束，添加空行分隔
        normalizedLines.push("");
        inList = false;
      }
      normalizedLines.push(line);
      prevWasListItem = false;
    }
  }

  return normalizedLines.join("\n");
}

/**
 * 渲染 Markdown 为 HTML
 * @param markdown Markdown 文本
 * @returns 安全的 HTML 字符串
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) {
    return "";
  }

  // 预处理文本
  const processedText = preprocessMarkdown(markdown);

  // 使用 markdown-it 渲染
  const html = md.render(processedText);

  // 使用 DOMPurify 清理 HTML，防止 XSS 攻击
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "img",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
  });

  return cleanHtml;
}
