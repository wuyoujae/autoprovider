/**
 * 消息解析器
 * 用于解析SSE返回的标签格式消息
 *
 * 示例：
 * 输入: "<through>回复</through>"
 * 输出: { label: "through", content: "回复" }
 *
 * 输入: "<words>你好！我是Autoprovider 1.0</words>"
 * 输出: { label: "words", content: "你好！我是Autoprovider 1.0" }
 */

export interface ParsedMessageItem {
  label: string;
  content: string;
}

/**
 * 解析单个标签内容
 * 处理SSE返回的标签格式消息，支持跨行标签匹配
 *
 * @param data - SSE返回的data内容，可能包含标签，标签可能跨多行
 * @returns 解析后的消息项数组
 *
 * 处理逻辑：
 * 1. 查找开始标签，例如 <word>
 * 2. 记录标签名作为 label
 * 3. 从开始标签后查找对应的结束标签 </word>
 * 4. 提取开始标签和结束标签之间的所有内容（包括换行符）
 * 5. 继续查找下一个标签
 */
export function parseMessage(data: string): ParsedMessageItem[] {
  console.log("\n=== [MessageParser] parseMessage 开始解析 ===");
  console.log("[MessageParser] 输入数据长度:", data?.length);
  console.log("[MessageParser] 输入数据前100字符:", data?.substring(0, 100));

  const items: ParsedMessageItem[] = [];

  if (!data || !data.trim()) {
    console.warn("[MessageParser] ⚠️ 数据为空，返回空数组");
    return items;
  }

  let searchIndex = 0;
  let tagCount = 0;

  // 循环查找所有标签
  while (searchIndex < data.length) {
    // 查找开始标签 <tagName>
    const openTagStart = data.indexOf("<", searchIndex);
    if (openTagStart === -1) {
      // 没有找到更多开始标签
      console.log("[MessageParser] 🏁 没有找到更多开始标签");
      break;
    }

    // 查找开始标签的结束位置 >
    const openTagEnd = data.indexOf(">", openTagStart);
    if (openTagEnd === -1) {
      // 开始标签不完整，停止处理
      console.warn("[MessageParser] ⚠️ 开始标签不完整");
      break;
    }

    // 提取标签名（去掉 < 和 >）
    const tagName = data.substring(openTagStart + 1, openTagEnd).trim();
    console.log(`[MessageParser] 🏷️ 发现标签 #${++tagCount}:`, tagName);

    // 验证标签名是否有效（只包含字母、数字、下划线、连字符）
    if (!tagName || !/^[\w-]+$/.test(tagName)) {
      // 无效的标签名，跳过这个位置继续查找
      console.warn("[MessageParser] ❌ 无效的标签名，跳过:", tagName);
      searchIndex = openTagStart + 1;
      continue;
    }

    // 构建结束标签 </tagName>，支持自闭合标签
    const isSelfClosing = tagName.endsWith("/") || tagName === "sqlOperation";
    const closeTag = isSelfClosing ? null : `</${tagName}>`;

    // 从开始标签之后查找结束标签（支持跨行）
    const contentStart = openTagEnd + 1;
    let closeTagStart = -1;
    let content = "";

    if (closeTag === null) {
      closeTagStart = contentStart;
      content = "";
    } else {
      closeTagStart = data.indexOf(closeTag, contentStart);

      if (closeTagStart === -1) {
        // 没有找到结束标签，这个标签不完整，停止处理
        // 保留这个不完整的标签，等待更多数据
        console.warn(`[MessageParser] ⚠️ 标签 ${tagName} 没有找到结束标签`);
        break;
      }

      // 找到了完整的标签，提取内容（包括换行符）
      content = data.substring(contentStart, closeTagStart);
    }
    console.log(`[MessageParser] ✅ 标签 ${tagName} 解析成功`);
    console.log(`[MessageParser] 📦 内容长度:`, content.length);
    console.log(`[MessageParser] 📦 内容前50字符:`, content.substring(0, 50));

    items.push({
      label: tagName,
      content: content,
    });

    // 继续从结束标签之后查找下一个标签
    searchIndex =
      closeTag === null ? closeTagStart : closeTagStart + closeTag.length;
  }

  console.log("[MessageParser] 🎉 解析完成，共找到", items.length, "个标签");
  console.log(
    "[MessageParser] 📋 标签列表:",
    items.map((item) => item.label)
  );

  return items;
}

/**
 * 从缓冲区中提取完整的标签内容
 * 用于处理流式数据，当标签可能被分割时
 *
 * @param buffer - 累积的缓冲区内容
 * @param tagName - 要提取的标签名称
 * @returns 提取到的完整标签内容数组和剩余缓冲区内容
 */
export function extractTagContent(
  buffer: string,
  tagName: string
): { extracted: string[]; remaining: string } {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const extracted: string[] = [];
  let processedIndex = 0;
  let lastIncompleteTagStart = -1;

  // 循环查找所有完整的标签
  while (true) {
    const openIndex = buffer.indexOf(openTag, processedIndex);
    if (openIndex === -1) {
      // 没有找到更多开始标签
      break;
    }

    // 从开始标签之后查找结束标签（支持跨行）
    const contentStart = openIndex + openTag.length;
    const closeIndex = buffer.indexOf(closeTag, contentStart);
    if (closeIndex === -1) {
      // 没有找到结束标签，记录最后一个不完整标签的位置
      lastIncompleteTagStart = openIndex;
      break;
    }

    // 找到了完整的标签，提取内容（包括换行符）
    const content = buffer.substring(contentStart, closeIndex);
    extracted.push(content);

    // 继续从结束标签之后查找
    processedIndex = closeIndex + closeTag.length;
  }

  // 确定剩余部分
  let remaining = "";
  if (lastIncompleteTagStart !== -1) {
    // 如果有不完整的标签，保留从该标签开始到末尾的内容
    remaining = buffer.substring(lastIncompleteTagStart);
  } else if (processedIndex < buffer.length) {
    // 如果所有标签都完整，保留处理位置之后的内容
    remaining = buffer.substring(processedIndex);
  }

  return { extracted, remaining };
}

/**
 * 解析并提取缓冲区中的标签内容
 * 结合 extractTagContent 和 parseMessage 的功能
 *
 * @param buffer - 累积的缓冲区内容
 * @param tagName - 要提取的标签名称
 * @returns 解析后的消息项数组和剩余缓冲区内容
 */
export function parseAndExtractTagContent(
  buffer: string,
  tagName: string
): { items: ParsedMessageItem[]; remaining: string } {
  const { extracted, remaining } = extractTagContent(buffer, tagName);

  const items: ParsedMessageItem[] = extracted.map((content) => ({
    label: tagName,
    content: content,
  }));

  return { items, remaining };
}
