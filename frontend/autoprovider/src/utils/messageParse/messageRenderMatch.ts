import type { Component } from "vue";
import type { ParsedMessageItem } from "./messageParser";
import AgentMessageItemWords from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-words.vue";
import AgentMessageItemThrough from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-through.vue";
import AgentMessageItemCreate from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-create.vue";
import AgentMessageItemRead from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-read.vue";
import AgentMessageItemRan from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-ran.vue";
import AgentMessageItemSearch from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-search.vue";
import AgentMessageItemLinter from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-linter.vue";
import AgentMessageItemLoading from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-loading.vue";
import AgentMessageItemTodolist from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-todolist.vue";
import AgentMessageItemSql from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-sql.vue";
import AgentMessageItemEdit from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-edit.vue";
import AgentMessageItemDelect from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-delect.vue";
import AgentMessageItemDeploy from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-deploy.vue";
import AgentMessageItemGrep from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-grep.vue";
import AgentMessageItemWebsearch from "@/components/views/work/work-chat-pannel/work-chat-pannel-content/work-chat-message-item/work-message-agent-message/agent-message-item/agent-message-item-websearch.vue";
/**
 * 消息组件匹配映射
 * 根据 label 匹配对应的组件
 */
const componentMap: Record<string, Component> = {
  words: AgentMessageItemWords,
  through: AgentMessageItemThrough,
  create: AgentMessageItemCreate,
  read: AgentMessageItemRead,
  delect: AgentMessageItemDelect,
  edit: AgentMessageItemEdit,
  ran: AgentMessageItemRan,
  search: AgentMessageItemSearch,
  linter: AgentMessageItemLinter,
  loading: AgentMessageItemLoading,
  createtodolist: AgentMessageItemTodolist,
  sql: AgentMessageItemSql,
  sqlOperation: AgentMessageItemSql,
  deploy: AgentMessageItemDeploy,
  grep_file: AgentMessageItemGrep,
  grepfile: AgentMessageItemGrep,
  websearch: AgentMessageItemWebsearch,
  web_search: AgentMessageItemWebsearch,
};

/**
 * 组件名称映射
 * 用于获取组件的显示名称
 */
const componentNameMap: Record<string, string> = {
  words: "AgentMessageItemWords",
  through: "AgentMessageItemThrough",
  create: "AgentMessageItemCreate",
  read: "AgentMessageItemRead",
  delect: "AgentMessageItemDelect",
  edit: "AgentMessageItemEdit",
  ran: "AgentMessageItemRan",
  search: "AgentMessageItemSearch",
  linter: "AgentMessageItemLinter",
  loading: "AgentMessageItemLoading",
  createtodolist: "AgentMessageItemTodolist",
  sql: "AgentMessageItemSql",
  sqlOperation: "AgentMessageItemSql",
  deploy: "AgentMessageItemDeploy",
  grep_file: "AgentMessageItemGrep",
  grepfile: "AgentMessageItemGrep",
  websearch: "AgentMessageItemWebsearch",
  web_search: "AgentMessageItemWebsearch",
};

/**
 * 匹配消息组件
 * 根据 ParsedMessageItem 的 label 属性匹配对应的组件
 *
 * @param item - 解析后的消息项
 * @returns 匹配到的组件配置对象，包含组件和 props
 */
export function matchMessageComponent(item: ParsedMessageItem): {
  component: Component;
  componentName: string;
  props: { content: string };
} {
  const { label, content } = item;
  const normalizedLabel = label?.trim().toLowerCase();

  console.log("\n=== [MessageRenderMatch] 开始匹配组件 ===");
  console.log("[MessageRenderMatch] 标签 label:", label);
  console.log("[MessageRenderMatch] 规范化标签:", normalizedLabel);
  console.log("[MessageRenderMatch] 内容长度:", content?.length);
  console.log("[MessageRenderMatch] 内容前50字符:", content?.substring(0, 50));

  // 根据 label 匹配组件，如果没有匹配到则使用默认的 words 组件
  const matchedComponent =
    (normalizedLabel && componentMap[normalizedLabel]) ||
    componentMap[label] ||
    componentMap.words ||
    AgentMessageItemWords;
  const componentName =
    (normalizedLabel && componentNameMap[normalizedLabel]) ||
    componentNameMap[label] ||
    componentNameMap.words ||
    "AgentMessageItemWords";

  console.log("[MessageRenderMatch] 匹配到的组件:", componentName);
  console.log(
    "[MessageRenderMatch] 是否为默认组件:",
    !(normalizedLabel && componentMap[normalizedLabel]) && !componentMap[label]
  );

  if (
    !(normalizedLabel && componentMap[normalizedLabel]) &&
    !componentMap[label]
  ) {
    console.warn(
      "[MessageRenderMatch] ⚠️ 标签",
      label,
      "没有对应的组件，使用默认 words 组件"
    );
    console.warn("[MessageRenderMatch] 可用的标签:", Object.keys(componentMap));
  }

  return {
    component: matchedComponent,
    componentName: componentName,
    props: {
      content: content,
    },
  };
}
