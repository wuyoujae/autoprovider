/**
 * 文件树解析器
 * 用于解析后端返回的 markdown 格式的文件树字符串
 */

// 解析后的文件树节点类型
export interface FileTreeNode {
  name: string;
  type: "file" | "folder";
  level: number;
  children?: FileTreeNode[];
}

// 后端返回的数据类型
export interface ProjectFileTreeData {
  // 新版（Next.js 单体项目）
  project_tree?: string;
  // 旧版（前后端分离）
  backend_tree?: string;
  frontend_tree?: string;
}

export interface ParsedFileTrees {
  project: FileTreeNode[];
  backend: FileTreeNode[];
  frontend: FileTreeNode[];
}

/**
 * 从 markdown 代码块中提取文件树内容
 * @param markdownStr markdown 格式的字符串，包含 ```file-tree ... ```
 * @returns 提取出的文件树文本内容
 */
function extractFileTreeContent(markdownStr: string): string {
  // 匹配 ```file-tree 开头和 ``` 结尾的内容
  const match = markdownStr.match(/```file-tree\n([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1].trim();
  }
  // 如果没有匹配到，尝试直接返回（可能已经是纯文本）
  return markdownStr.trim();
}

/**
 * 解析单行文件树条目
 * @param line 文件树的一行
 * @returns 解析结果：{ level: 层级, name: 名称, isFolder: 是否为文件夹 }
 */
function parseLine(
  line: string
): { level: number; name: string; isFolder: boolean } | null {
  // 移除行尾的换行符
  const trimmedLine = line.trimEnd();
  if (!trimmedLine) {
    return null;
  }

  // 策略：直接查找 ├── 或 └── 的位置来确定层级
  // 这种方式比逐个解析前缀字符更稳健，尤其是在有 │ 符号混合的情况下
  // 标准格式通常是每 4 个字符一级：
  // Level 0: └── name (index 0)
  // Level 1:     ├── name (index 4)
  // Level 2:     │   ├── name (index 8)

  const symbolIndex = trimmedLine.search(/├──|└──/);

  if (symbolIndex !== -1) {
    // 找到了树形符号
    const level = Math.floor(symbolIndex / 4);

    // 提取名称：从符号结束位置开始截取
    // 符号长度是 3 (├── 或 └──)，通常后面还有一个空格
    let content = trimmedLine.substring(symbolIndex + 3);

    // 去除开头的空格（如果有）
    content = content.trimStart();

    let name = content;
    const isFolder = name.endsWith("/");
    if (isFolder) {
      name = name.slice(0, -1);
    }

    return { level, name, isFolder };
  }

  // 如果没有找到标准符号，可能是根节点只有名称，或者使用了非标准格式
  // 尝试通过缩进长度来判断
  // 匹配开头所有的 空格、tab、│
  const indentMatch = trimmedLine.match(/^[\s│]*/);
  const indentLength = indentMatch ? indentMatch[0].length : 0;

  // 如果这一行除了缩进还有内容
  if (indentLength < trimmedLine.length) {
    const level = Math.floor(indentLength / 4);
    let name = trimmedLine.substring(indentLength).trim();

    // 忽略纯注释行或空行
    if (!name) return null;

    const isFolder = name.endsWith("/");
    if (isFolder) {
      name = name.slice(0, -1);
    }
    return { level, name, isFolder };
  }

  return null;
}

/**
 * 解析文件树文本，构建树形结构
 * @param content 文件树文本内容
 * @returns 解析后的文件树节点数组
 */
function parseFileTreeContent(content: string): FileTreeNode[] {
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const rootNodes: FileTreeNode[] = [];
  const stack: Array<{ node: FileTreeNode; level: number }> = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      continue;
    }

    const { level, name, isFolder } = parsed;
    const node: FileTreeNode = {
      name,
      type: isFolder ? "folder" : "file",
      level,
      children: isFolder ? [] : undefined,
    };

    // 维护栈结构，找到当前节点的父节点
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top && top.level >= level) {
        stack.pop();
      } else {
        break;
      }
    }

    if (stack.length === 0) {
      // 根节点
      rootNodes.push(node);
      if (isFolder) {
        stack.push({ node, level });
      }
    } else {
      // 子节点
      const top = stack[stack.length - 1];
      if (top) {
        const parent = top.node;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);

        // 如果当前节点是文件夹，将其加入栈中
        if (isFolder) {
          stack.push({ node, level });
        }
      }
    }
  }

  return rootNodes;
}

// 如果只有单一顶层目录（通常是 project_id），展开它并重置层级为 0
function flattenSingleRoot(nodes: FileTreeNode[]): FileTreeNode[] {
  if (!nodes || nodes.length !== 1) return nodes;
  const root = nodes[0];
  if (!root || root.type !== "folder" || !root.children) return nodes;

  const adjustLevel = (list: FileTreeNode[], base = 0) => {
    for (const n of list) {
      n.level = base;
      if (n.children && n.children.length > 0) {
        adjustLevel(n.children, base + 1);
      }
    }
  };

  adjustLevel(root.children, 0);
  return root.children;
}

/**
 * 将文件树节点转换为可读的字符串格式（用于调试）
 * @param nodes 文件树节点数组
 * @param prefix 前缀字符串（用于递归）
 * @param isLast 是否为最后一个节点
 * @returns 格式化后的字符串
 */
function formatFileTreeToString(
  nodes: FileTreeNode[],
  prefix: string = "",
  isLast: boolean = true
): string {
  let result = "";

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) {
      continue;
    }

    const isLastNode = i === nodes.length - 1;
    const connector = isLastNode ? "└── " : "├── ";
    const name = node.type === "folder" ? `${node.name}/` : node.name;

    result += prefix + connector + name + "\n";

    if (node.children && node.children.length > 0) {
      const nextPrefix = prefix + (isLastNode ? "    " : "│   ");
      result += formatFileTreeToString(node.children, nextPrefix, isLastNode);
    }
  }

  return result;
}

/**
 * 解析文件树数据
 * @param data 后端返回的文件树数据
 * @returns 解析后的文件树结构
 */
export function parseFileTree(data: ProjectFileTreeData): ParsedFileTrees {
  try {
    // 输出原始数据
    console.log("=== 原始文件树数据 ===");
    console.log("Project Tree (原始):", data.project_tree);
    console.log("Backend Tree (原始):", data.backend_tree);
    console.log("Frontend Tree (原始):", data.frontend_tree);

    const projectContent = extractFileTreeContent(data.project_tree || "");
    const backendContent = extractFileTreeContent(data.backend_tree || "");
    const frontendContent = extractFileTreeContent(data.frontend_tree || "");

    console.log("Project Tree (提取后):", projectContent);
    console.log("Backend Tree (提取后):", backendContent);
    console.log("Frontend Tree (提取后):", frontendContent);

    // 如果有 project_tree（新版单体项目），优先使用它，忽略 backend/frontend
    const hasProject = !!projectContent;

    const project = hasProject
      ? flattenSingleRoot(parseFileTreeContent(projectContent))
      : [];
    const backend = hasProject
      ? []
      : flattenSingleRoot(parseFileTreeContent(backendContent));
    const frontend = hasProject
      ? []
      : flattenSingleRoot(parseFileTreeContent(frontendContent));

    // 输出解析后的格式化结果
    console.log("\n=== 解析后的文件树结构 ===");
    if (project.length > 0) {
      console.log("Project Tree (格式化):");
      console.log(formatFileTreeToString(project));
    }
    if (backend.length > 0) {
      console.log("Backend Tree (格式化):");
      console.log(formatFileTreeToString(backend));
    }
    if (frontend.length > 0) {
      console.log("Frontend Tree (格式化):");
      console.log(formatFileTreeToString(frontend));
    }

    // 输出解析后的对象结构
    console.log("\n=== 解析后的对象结构 ===");
    console.log("Project:", JSON.stringify(project, null, 2));
    console.log("Backend:", JSON.stringify(backend, null, 2));
    console.log("Frontend:", JSON.stringify(frontend, null, 2));

    return {
      project,
      backend,
      frontend,
    };
  } catch (error) {
    console.error("解析文件树失败:", error);
    return {
      project: [],
      backend: [],
      frontend: [],
    };
  }
}
