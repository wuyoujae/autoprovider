<template>
  <div class="work-chat-pannel">
    <!-- Chat Pannel Head -->
    <WorkChatPannelHead
      :session_list="session_list"
      :project_id="project_id"
      @create-conversation="handle_create_conversation"
      @session-created="handle_session_created"
      @session-change="handle_session_change"
    />

    <!-- Chat Content Area -->
    <WorkChatPannelContent ref="content_ref" :is-sending="is_sending" />

    <!-- Chat Prompt Area -->
    <div class="work-chat-pannel__prompt-container">
      <WorkChatPannelPrompt
        :session_id="current_session_id"
        :is_sending="is_sending"
        @send-message="handle_send_message"
        @stop-session="handle_stop_session"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import WorkChatPannelHead from "./work-chat-pannel-head/work-chat-pannel-head.vue";
import WorkChatPannelContent from "./work-chat-pannel-content/work-chat-pannel-content.vue";
import WorkChatPannelPrompt from "./work-chat-pannel-prompt/work-chat-pannel-prompt.vue";
import { useUserStore } from "@/stores/user";
import request from "@/api/request";
// @ts-ignore - nw_api.js 没有类型声明
import NwAPI from "@/api/nw_api";
import {
  parseMessage,
  parseAndExtractTagContent,
} from "@/utils/messageParse/messageParser";
import { matchMessageComponent } from "@/utils/messageParse/messageRenderMatch";
import type { ParsedMessageItem } from "@/utils/messageParse/messageParser";

// 会话列表接口类型
interface Session {
  session_id: string;
  project_id: string;
  session_title: string;
  session_status: number;
  create_time: string;
}

interface Props {
  session_list?: Session[];
  project_id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  session_list: () => [],
  project_id: "",
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const user_store = useUserStore();

// 内容区引用
const content_ref = ref<InstanceType<typeof WorkChatPannelContent> | null>(
  null
);

// 当前 SSE 连接控制器
let current_abort_controller: AbortController | null = null;

// 当前 SSE 流读取器（用于资源回收）
let current_reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

// ========== SSE 连接健康检测配置 ==========
const SSE_HEARTBEAT_TIMEOUT = 45000; // 心跳超时：45秒（后端每20秒发一次心跳，给予余量）
const SSE_MAX_RECONNECT_ATTEMPTS = 3; // 最大自动重连次数
const SSE_RECONNECT_DELAY = 3000; // 重连延迟：3秒

// 心跳超时定时器
let heartbeat_timeout_timer: number | null = null;
// 重连延迟定时器
let reconnect_delay_timer: number | null = null;
// 首条消息发送延迟定时器
let first_message_timer: number | null = null;
// 当前重连尝试次数
let reconnect_attempts = 0;
// 是否正在重连中
let is_reconnecting = false;

// 当前正在接收的消息内容（用于流式更新）
let current_message_content = "";

// ========== Work 裁剪控制 ==========
// 当前进行中的 SSE work 标识（常量）
const CURRENT_SSE_WORK_ID = "__current_sse_work__";

// 当前消息的类型和内容（用于不同类型的消息）
interface CurrentMessageState {
  type: "agentChatResponseFlag" | "agent-thinking" | "chat-to-user" | null;
  wordsContent: string; // words 类型的内容
  thinkingContent: string; // thinking 类型的内容
  messageIndex: number; // 当前消息在列表中的索引
  currentThroughItemId: string | null; // 当前正在进行的 through 组件 ID
  currentWordsItemId: string | null; // 当前正在进行的 words 组件 ID
}

let current_message_state: CurrentMessageState = {
  type: null,
  wordsContent: "",
  thinkingContent: "",
  messageIndex: -1,
  currentThroughItemId: null,
  currentWordsItemId: null,
};

// 用于累积流式数据的缓冲区
let thinking_buffer = ""; // agent-thinking 事件的缓冲区
let chat_to_user_buffer = ""; // chat-to-user 事件的缓冲区
let message_parser_buffer = ""; // 用于 parseMessage 的通用缓冲区

// ========== 缓冲区保护配置 ==========
const BUFFER_MAX_SIZE = 32 * 1024; // 缓冲区最大大小：32KB

/**
 * 安全地追加到缓冲区，超过上限时截断旧内容
 * @param buffer 当前缓冲区内容
 * @param data 要追加的数据
 * @param addNewline 是否在非空缓冲区前添加换行
 * @returns 新的缓冲区内容
 */
const safeAppendBuffer = (
  buffer: string,
  data: string,
  addNewline = false
): string => {
  let newBuffer = buffer;
  if (addNewline && newBuffer.length > 0) {
    newBuffer += "\n";
  }
  newBuffer += data;

  // 超过上限时，保留后半部分
  if (newBuffer.length > BUFFER_MAX_SIZE) {
    console.warn(
      `[缓冲区保护] 缓冲区超过 ${BUFFER_MAX_SIZE} 字节，截断旧内容`
    );
    newBuffer = newBuffer.slice(-BUFFER_MAX_SIZE / 2);
  }

  return newBuffer;
};

// 消息队列：待渲染的消息队列
const messageQueue: ParsedMessageItem[] = [];

// Loading 定时器相关
let loading_timer: number | null = null; // loading 定时器
let current_loading_item_ids: string[] = []; // 当前所有 loading 消息项的 ID 数组
let current_loading_message_index: number | null = null; // 记录 loading 所在消息的索引

// 启动 loading 定时器
const start_loading_timer = () => {
  // 清除之前的定时器
  if (loading_timer !== null) {
    clearTimeout(loading_timer);
    loading_timer = null;
  }

  // 如果当前有 through 或 words 组件在流式更新，不显示 loading
  if (
    current_message_state.currentThroughItemId ||
    current_message_state.currentWordsItemId
  ) {
    return;
  }

  // 1秒后显示 loading
  loading_timer = window.setTimeout(() => {
    // 再次检查是否有 through 或 words 组件在流式更新
    if (
      current_message_state.currentThroughItemId ||
      current_message_state.currentWordsItemId
    ) {
      return;
    }

    // 检查是否有当前消息索引
    if (current_message_state.messageIndex >= 0 && content_ref.value) {
      // 创建 loading 消息项
      const loadingItem = {
        type: "loading",
        content: "",
        id: `msg-item-loading-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      // 添加到消息的 messageItems 中
      content_ref.value.add_message_item_to_index(
        current_message_state.messageIndex,
        loadingItem
      );

      // 记录 loading 消息项 ID 到数组
      current_loading_item_ids.push(loadingItem.id);
      current_loading_message_index = current_message_state.messageIndex;
      console.log(
        `[Loading 定时器] 添加 loading 项: id=${loadingItem.id}, 当前 loading IDs:`,
        current_loading_item_ids
      );
    }
    loading_timer = null;
  }, 1000);
};

// 清除所有 loading
const clear_loading = () => {
  console.log(
    `[清除 Loading] 开始清除 loading, 当前 loading IDs:`,
    current_loading_item_ids
  );

  // 清除定时器
  if (loading_timer !== null) {
    console.log(`[清除 Loading] 清除定时器`);
    clearTimeout(loading_timer);
    loading_timer = null;
  }

  // 移除所有 loading 消息项
  if (
    content_ref.value &&
    current_loading_item_ids.length > 0 &&
    (current_loading_message_index !== null ||
      current_message_state.messageIndex >= 0)
  ) {
    // 保存引用，避免在 forEach 中 TypeScript 无法推断
    const contentRef = content_ref.value;
    const messageIndex =
      current_loading_message_index ?? current_message_state.messageIndex;

    console.log(
      `[清除 Loading] 准备移除 ${current_loading_item_ids.length} 个 loading 项`
    );

    // 遍历所有 loading ID，逐个移除
    current_loading_item_ids.forEach((loadingId) => {
      console.log(`[清除 Loading] 移除 loading 项: id=${loadingId}`);
      contentRef.remove_message_item_by_id(messageIndex, loadingId);
    });
    // 清空数组
    current_loading_item_ids = [];
    current_loading_message_index = null;
    console.log(`[清除 Loading] 清除完成，loading IDs 已清空`);
  } else {
    if (current_loading_item_ids.length === 0) {
      current_loading_message_index = null;
    }
    console.log(
      `[清除 Loading] 跳过清除: content_ref=${!!content_ref.value}, messageIndex=${
        current_message_state.messageIndex
      }, loadingIds长度=${current_loading_item_ids.length}`
    );
  }
};

// ========== 心跳超时检测 ==========
/**
 * 重置心跳超时定时器
 * 每次收到数据时调用，超时未收到数据则触发重连
 */
const resetHeartbeatTimer = () => {
  // 清除旧的定时器
  if (heartbeat_timeout_timer !== null) {
    clearTimeout(heartbeat_timeout_timer);
    heartbeat_timeout_timer = null;
  }

  // 如果没有在发送状态，不需要心跳检测
  if (!is_sending.value) return;

  // 设置新的超时定时器
  heartbeat_timeout_timer = window.setTimeout(() => {
    console.warn(
      `[SSE 心跳] 超过 ${SSE_HEARTBEAT_TIMEOUT / 1000}s 未收到数据，触发重连`
    );
    handleConnectionLost();
  }, SSE_HEARTBEAT_TIMEOUT);
};

/**
 * 清除心跳超时定时器
 */
const clearHeartbeatTimer = () => {
  if (heartbeat_timeout_timer !== null) {
    clearTimeout(heartbeat_timeout_timer);
    heartbeat_timeout_timer = null;
  }
};

/**
 * 处理连接丢失，尝试自动重连
 */
const handleConnectionLost = async () => {
  // 如果已经在重连中，跳过
  if (is_reconnecting) return;

  // 清理当前连接
  await cleanupCurrentConnection();

  // 检查是否还有重连次数
  if (reconnect_attempts >= SSE_MAX_RECONNECT_ATTEMPTS) {
    console.error(
      `[SSE 重连] 已达最大重连次数 ${SSE_MAX_RECONNECT_ATTEMPTS}，停止重连`
    );
    is_sending.value = false;
    reconnect_attempts = 0;
    // 可以在这里添加用户提示
    if (content_ref.value && current_message_state.messageIndex >= 0) {
      const errorItem = {
        type: "words",
        content: "连接已断开，请重新发送消息",
        id: `msg-item-error-${Date.now()}`,
      };
      content_ref.value.add_message_item_to_index(
        current_message_state.messageIndex,
        errorItem
      );
    }
    return;
  }

  is_reconnecting = true;
  reconnect_attempts++;
  console.log(
    `[SSE 重连] 第 ${reconnect_attempts}/${SSE_MAX_RECONNECT_ATTEMPTS} 次重连，${
      SSE_RECONNECT_DELAY / 1000
    }s 后执行`
  );

  // 延迟后重连（保存定时器引用以便清理）
  await new Promise<void>((resolve) => {
    reconnect_delay_timer = window.setTimeout(() => {
      reconnect_delay_timer = null;
      resolve();
    }, SSE_RECONNECT_DELAY);
  });

  is_reconnecting = false;

  // 执行重连
  if (current_session_id.value && is_sending.value) {
    await reconnect_session(current_session_id.value);
  }
};

/**
 * 清理当前 SSE 连接（释放资源）
 */
const cleanupCurrentConnection = async () => {
  // 清除心跳定时器
  clearHeartbeatTimer();

  // 清除重连延迟定时器
  if (reconnect_delay_timer !== null) {
    clearTimeout(reconnect_delay_timer);
    reconnect_delay_timer = null;
  }

  // 释放 reader
  if (current_reader) {
    try {
      await current_reader.cancel();
      current_reader.releaseLock();
    } catch (e) {
      // 忽略已关闭的错误
    }
    current_reader = null;
  }

  // 中止请求
  if (current_abort_controller) {
    current_abort_controller.abort();
    current_abort_controller = null;
  }
};

// 标记是否已经发送过第一条消息，防止重复发送
let has_sent_first_message = false;

// 当前选中的会话 ID
const current_session_id = ref<string>("");

// 是否正在发送消息
const is_sending = ref(false);

// 获取会话操作记录
const fetch_session_operations = async (session_id: string, isSseActive: boolean = false) => {
  const user_id = user_store.user_info?.user_id;
  if (!session_id || !user_id) {
    console.warn(
      "[WorkChatPannel] 无法获取会话操作记录，缺少 session_id 或 user_id"
    );
    return;
  }

  try {
    const result = await request({
      url: "session.getSessionOperations",
      method: "post",
      data: {
        user_id,
        session_id,
      },
      showErrorMessage: false,
    });
    console.log("[WorkChatPannel] 获取到会话操作记录:", result);

    if (content_ref.value) {
      if (result?.works && Array.isArray(result.works)) {
        // 传入 isSseActive 参数，控制加载后的裁剪策略
        content_ref.value.set_history_works(result.works, isSseActive);
      } else {
        content_ref.value.clear_messages();
      }
    }
  } catch (error) {
    console.error("[WorkChatPannel] 获取会话操作记录失败:", error);
  }
};

// Emits
const emit = defineEmits<{
  "session-created": [sessionId: string];
  "refresh-session-list": [];
  "session-change": [sessionId: string];
}>();

// Handle create conversation
const handle_create_conversation = async () => {
  // 清空内容区
  if (content_ref.value) {
    content_ref.value.clear_messages();
  }
  // 断开当前 SSE 连接并清理资源
  await cleanupCurrentConnection();
  // 重置重连计数
  reconnect_attempts = 0;
  // 重置状态和缓冲区
  current_message_state = {
    type: null,
    wordsContent: "",
    thinkingContent: "",
    messageIndex: -1,
    currentThroughItemId: null,
    currentWordsItemId: null,
  };
  current_message_content = "";
  thinking_buffer = "";
  chat_to_user_buffer = "";
  message_parser_buffer = "";
  messageQueue.length = 0; // 清空消息队列
  // 清除 loading
  clear_loading();
};

// Handle session created
const handle_session_created = (sessionId: string) => {
  // 触发刷新会话列表事件
  emit("refresh-session-list");
  // session-change 事件已经在 work-chat-pannel-head 中触发了，这里不需要重复触发
};

// Handle session change
const handle_session_change = async (sessionId: string) => {
  current_session_id.value = sessionId;
  emit("session-change", sessionId);
  await fetch_session_operations(sessionId);
  // 尝试重连
  reconnect_session(sessionId);
};

// 处理 SSE 响应流
const process_sse_response = async (response: Response) => {
  // 读取 SSE 流
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法获取响应流");
  }

  // 保存 reader 引用，用于资源回收
  current_reader = reader;

  const decoder = new TextDecoder();
  let buffer = "";
  let current_event = "message"; // 默认事件类型

  // 重置重连计数（成功建立连接）
  reconnect_attempts = 0;

  // 启动心跳检测
  resetHeartbeatTimer();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("[SSE] 流正常结束");
        break;
      }

      // 收到数据，重置心跳定时器
      resetHeartbeatTimer();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留最后不完整的行

      for (const line of lines) {
        // 跳过心跳注释（以 : 开头）
        if (line.startsWith(":")) {
          continue;
        }
      // 处理事件类型
      if (line.startsWith("event: ")) {
        current_event = line.slice(7).trim();
        continue;
      }

      // 处理数据
      if (line.startsWith("data: ")) {
        const data = line.slice(6); // 移除 "data: " 前缀

        // 跳过注释行和空行
        if (data.trim() === "" || data.startsWith(":")) {
          continue;
        }

        // ========== 使用 parseMessage 解析器 ==========
        // 累积 data 到缓冲区（因为标签可能跨多个 data 行）
        // 注意：对于 agentChatResponseFlag 事件，如果内容不包含标签，不累积到缓冲区
        // 因为 agentChatResponseFlag 的内容会被直接处理，不需要解析
        if (current_event !== "agentChatResponseFlag" || data.includes("<")) {
          // 使用安全追加函数，防止缓冲区无限增长
          message_parser_buffer = safeAppendBuffer(
            message_parser_buffer,
            data,
            true
          );
        }

        // 尝试解析缓冲区中的标签
        const parsedItems = parseMessage(message_parser_buffer);

        // 将解析到的完整标签添加到消息队列
        if (parsedItems.length > 0) {
          // 计算已解析的完整标签的总长度，更新缓冲区
          let lastProcessedIndex = 0;
          for (const item of parsedItems) {
            const openTag = `<${item.label}>`;
            const closeTag = `</${item.label}>`;
            const openIndex = message_parser_buffer.indexOf(
              openTag,
              lastProcessedIndex
            );
            if (openIndex !== -1) {
              const closeIndex = message_parser_buffer.indexOf(
                closeTag,
                openIndex + openTag.length
              );
              if (closeIndex !== -1) {
                lastProcessedIndex = closeIndex + closeTag.length;
                // 添加到消息队列
                messageQueue.push(item);
              }
            }
          }
          // 保留未处理的部分
          message_parser_buffer =
            message_parser_buffer.substring(lastProcessedIndex);
        }

        // 处理消息队列：按顺序匹配组件并发送到 work-message-agent-message
        // 如果有新消息项要处理，先清除 loading（因为即将有新内容）
        if (messageQueue.length > 0) {
          console.log(
            `[消息队列] 检测到 ${messageQueue.length} 个新消息项，准备清除 loading`
          );
          clear_loading();
        }

        // 记录是否需要启动 loading 定时器（在处理完所有消息项后）
        let shouldStartLoadingAfterQueue = false;

        while (messageQueue.length > 0) {
          const item = messageQueue.shift();
          if (item) {
            const matched = matchMessageComponent(item);
            console.log(
              `[消息队列] 匹配到新的消息显示组件：${
                matched.componentName
              }, label=${item.label}, content=${item.content.substring(0, 50)}`
            );

            // 特殊处理 through 组件：流式更新
            if (item.label === "through") {
              // 检查是否是 OVERFLAG（结束标志）
              const isOverFlag = item.content.trim() === "OVERFLAG";

              if (content_ref.value) {
                // 确保有当前消息索引
                if (current_message_state.messageIndex >= 0) {
                  // 如果已经有正在进行的 through 组件，更新它的内容
                  if (current_message_state.currentThroughItemId) {
                    if (isOverFlag) {
                      // 遇到 OVERFLAG，标记 through 组件完成
                      // 获取当前内容，添加 OVERFLAG 标志
                      const currentContent =
                        content_ref.value.get_message_item_content(
                          current_message_state.messageIndex,
                          current_message_state.currentThroughItemId
                        );
                      // through 组件期望的格式：duration|content|OVERFLAG
                      // 如果当前内容还没有 duration，添加 0
                      let finalContent = currentContent;
                      if (!currentContent.includes("|")) {
                        finalContent = `0|${currentContent}|OVERFLAG`;
                      } else {
                        finalContent = `${currentContent}|OVERFLAG`;
                      }
                      content_ref.value.update_message_item_content(
                        current_message_state.messageIndex,
                        current_message_state.currentThroughItemId,
                        finalContent
                      );
                      // 清空当前 through 组件 ID，允许下一个组件
                      current_message_state.currentThroughItemId = null;
                      // 标记需要在队列处理完后启动 loading 定时器
                      shouldStartLoadingAfterQueue = true;
                    } else {
                      // 追加内容到现有的 through 组件
                      const currentContent =
                        content_ref.value.get_message_item_content(
                          current_message_state.messageIndex,
                          current_message_state.currentThroughItemId
                        );
                      // 如果当前内容有 duration|content 格式，只更新 content 部分
                      let newContent = "";
                      if (currentContent.includes("|")) {
                        const parts = currentContent.split("|");
                        const duration = parts[0] || "0";
                        const existingContent = parts.slice(1).join("|");
                        newContent = `${duration}|${existingContent}${item.content}`;
                      } else {
                        // 如果没有格式，添加 duration
                        newContent = `0|${currentContent}${item.content}`;
                      }
                      content_ref.value.update_message_item_content(
                        current_message_state.messageIndex,
                        current_message_state.currentThroughItemId,
                        newContent
                      );
                      // through 组件在流式更新，不显示 loading
                    }
                  } else {
                    // 没有正在进行的 through 组件，创建新的
                    // through 组件期望的格式：duration|content
                    const formattedContent = isOverFlag
                      ? `0||OVERFLAG`
                      : `0|${item.content}`;
                    const messageItem = {
                      type: item.label,
                      content: formattedContent,
                      id: `msg-item-through-${Date.now()}-${Math.random()
                        .toString(36)
                        .substr(2, 9)}`,
                    };

                    // 添加到消息的 messageItems 中
                    content_ref.value.add_message_item_to_index(
                      current_message_state.messageIndex,
                      messageItem
                    );

                    // 如果不是 OVERFLAG，记录当前 through 组件 ID
                    if (!isOverFlag) {
                      current_message_state.currentThroughItemId =
                        messageItem.id;
                      // through 组件开始流式更新，不显示 loading
                    } else {
                      // 如果是 OVERFLAG，标记需要在队列处理完后启动 loading 定时器
                      shouldStartLoadingAfterQueue = true;
                    }
                  }
                } else {
                  // 如果没有当前消息，创建一个新的 assistant 消息
                  // through 组件期望的格式：duration|content
                  const formattedContent = isOverFlag
                    ? `0||OVERFLAG`
                    : `0|${item.content}`;
                  const messageItem = {
                    type: item.label,
                    content: formattedContent,
                    id: `msg-item-through-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                  };

                  content_ref.value.add_message({
                    role: "assistant",
                    content: "",
                    messageItems: [messageItem],
                    work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
                  });

                  // 更新当前消息状态
                  current_message_state.messageIndex =
                    content_ref.value.messages.length - 1;

                  // 如果不是 OVERFLAG，记录当前 through 组件 ID
                  if (!isOverFlag) {
                    current_message_state.currentThroughItemId = messageItem.id;
                    // through 组件开始流式更新，不显示 loading
                  } else {
                    // 如果是 OVERFLAG，标记需要在队列处理完后启动 loading 定时器
                    shouldStartLoadingAfterQueue = true;
                  }
                }
              }
            } else if (item.label === "words") {
              // 特殊处理 words 组件：流式更新
              // 检查是否是 OVERFLAG（结束标志）
              const isOverFlag = item.content.trim() === "OVERFLAG";

              if (content_ref.value) {
                // 确保有当前消息索引
                if (current_message_state.messageIndex >= 0) {
                  // 如果已经有正在进行的 words 组件，更新它的内容
                  if (current_message_state.currentWordsItemId) {
                    if (isOverFlag) {
                      // 遇到 OVERFLAG，标记 words 组件完成
                      // 获取当前内容，添加 OVERFLAG 标志
                      const currentContent =
                        content_ref.value.get_message_item_content(
                          current_message_state.messageIndex,
                          current_message_state.currentWordsItemId
                        );
                      // words 组件期望的格式：content|OVERFLAG 或直接 contentOVERFLAG
                      const finalContent = `${currentContent}OVERFLAG`;
                      content_ref.value.update_message_item_content(
                        current_message_state.messageIndex,
                        current_message_state.currentWordsItemId,
                        finalContent
                      );
                      // 清空当前 words 组件 ID，允许下一个组件
                      current_message_state.currentWordsItemId = null;
                      // 标记需要在队列处理完后启动 loading 定时器
                      shouldStartLoadingAfterQueue = true;
                    } else {
                      // 追加内容到现有的 words 组件
                      const currentContent =
                        content_ref.value.get_message_item_content(
                          current_message_state.messageIndex,
                          current_message_state.currentWordsItemId
                        );
                      // 移除可能存在的 OVERFLAG（如果存在）
                      const cleanCurrentContent = currentContent.replace(
                        /OVERFLAG$/,
                        ""
                      );
                      // 追加新内容
                      const newContent = cleanCurrentContent + item.content;
                      content_ref.value.update_message_item_content(
                        current_message_state.messageIndex,
                        current_message_state.currentWordsItemId,
                        newContent
                      );
                      // words 组件在流式更新，不显示 loading
                    }
                  } else {
                    // 没有正在进行的 words 组件，创建新的
                    const formattedContent = isOverFlag
                      ? "OVERFLAG"
                      : item.content;
                    const messageItem = {
                      type: item.label,
                      content: formattedContent,
                      id: `msg-item-words-${Date.now()}-${Math.random()
                        .toString(36)
                        .substr(2, 9)}`,
                    };

                    // 添加到消息的 messageItems 中
                    content_ref.value.add_message_item_to_index(
                      current_message_state.messageIndex,
                      messageItem
                    );

                    // 如果不是 OVERFLAG，记录当前 words 组件 ID
                    if (!isOverFlag) {
                      current_message_state.currentWordsItemId = messageItem.id;
                      // words 组件开始流式更新，不显示 loading
                    } else {
                      // 如果是 OVERFLAG，标记需要在队列处理完后启动 loading 定时器
                      shouldStartLoadingAfterQueue = true;
                    }
                  }
                } else {
                  // 如果没有当前消息，创建一个新的 assistant 消息
                  const formattedContent = isOverFlag
                    ? "OVERFLAG"
                    : item.content;
                  const messageItem = {
                    type: item.label,
                    content: formattedContent,
                    id: `msg-item-words-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                  };

                  content_ref.value.add_message({
                    role: "assistant",
                    content: "",
                    messageItems: [messageItem],
                    work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
                  });

                  // 更新当前消息状态
                  current_message_state.messageIndex =
                    content_ref.value.messages.length - 1;

                  // 如果不是 OVERFLAG，记录当前 words 组件 ID
                  if (!isOverFlag) {
                    current_message_state.currentWordsItemId = messageItem.id;
                    // words 组件开始流式更新，不显示 loading
                  } else {
                    // 如果是 OVERFLAG，标记需要在队列处理完后启动 loading 定时器
                    shouldStartLoadingAfterQueue = true;
                  }
                }
              }
            } else {
              // 其他非 through、非 words 组件，正常处理
              // 如果有正在进行的 through 或 words 组件，先清空它们
              if (current_message_state.currentThroughItemId) {
                current_message_state.currentThroughItemId = null;
              }
              if (current_message_state.currentWordsItemId) {
                current_message_state.currentWordsItemId = null;
              }

              // 将匹配到的组件消息添加到对应的 assistant 消息中
              if (content_ref.value) {
                // 确保有当前消息索引
                if (current_message_state.messageIndex >= 0) {
                  // 创建消息项
                  const messageItem = {
                    type: item.label,
                    content: item.content,
                    id: `msg-item-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                  };

                  // 添加到消息的 messageItems 中
                  content_ref.value.add_message_item_to_index(
                    current_message_state.messageIndex,
                    messageItem
                  );

                  // 标记需要在队列处理完后启动 loading 定时器
                  shouldStartLoadingAfterQueue = true;
                } else {
                  // 如果没有当前消息，创建一个新的 assistant 消息
                  const messageItem = {
                    type: item.label,
                    content: item.content,
                    id: `msg-item-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                  };

                  content_ref.value.add_message({
                    role: "assistant",
                    content: "",
                    messageItems: [messageItem],
                    work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
                  });

                  // 更新当前消息状态
                  current_message_state.messageIndex =
                    content_ref.value.messages.length - 1;

                  // 标记需要在队列处理完后启动 loading 定时器
                  shouldStartLoadingAfterQueue = true;
                }
              }
            }
          }
        }

        // 处理完所有消息项后，如果需要且没有 through 或 words 组件在流式更新，才启动 loading 定时器
        if (
          shouldStartLoadingAfterQueue &&
          !current_message_state.currentThroughItemId &&
          !current_message_state.currentWordsItemId
        ) {
          start_loading_timer();
        }
        // ========== 解析器处理结束 ==========

        // 根据事件类型处理消息
        if (current_event === "error") {
          // 错误事件，尝试解析 JSON
          try {
            const json_data = JSON.parse(data);
            if (content_ref.value) {
              content_ref.value.update_message_by_index(
                current_message_state.messageIndex,
                `<words>错误: ${json_data.message || "未知错误"}</words>`
              );
            }
          } catch (e) {
            // 如果不是 JSON，直接显示错误文本
            if (content_ref.value) {
              content_ref.value.update_message_by_index(
                current_message_state.messageIndex,
                `<words>错误: ${data}</words>`
              );
            }
          }
        } else if (current_event === "close") {
          // 连接关闭事件
          try {
            const json_data = JSON.parse(data);
            if (json_data.type === "CONNECTION_CLOSED") {
              break;
            }
          } catch (e) {
            break;
          }
        } else if (current_event === "agentChatResponseFlag") {
          // AI 开始思考的标志
          // 如果内容不包含标签，直接创建 words 组件
          // 如果包含标签，会被新的消息队列系统处理
          if (content_ref.value && data.trim()) {
            // 清除 loading（因为即将有新内容）
            clear_loading();

            // 如果内容不包含标签，直接处理
            if (!data.includes("<")) {
              // 如果还没有当前消息，创建一个新的 assistant 消息
              if (current_message_state.messageIndex < 0) {
                const messageItem = {
                  type: "words",
                  content: data.trim(),
                  id: `msg-item-words-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                };
                content_ref.value.add_message({
                  role: "assistant",
                  content: "",
                  messageItems: [messageItem],
                  work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
                });
                current_message_state.messageIndex =
                  content_ref.value.messages.length - 1;

                // 启动 loading 定时器（等待下一个组件）
                start_loading_timer();
              } else {
                // 如果已有消息，添加到现有消息中
                const messageItem = {
                  type: "words",
                  content: data.trim(),
                  id: `msg-item-words-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                };
                content_ref.value.add_message_item_to_index(
                  current_message_state.messageIndex,
                  messageItem
                );

                // 启动 loading 定时器（等待下一个组件）
                start_loading_timer();
              }
            } else {
              // 如果包含标签，只确保有消息索引，让新系统处理
              if (current_message_state.messageIndex < 0) {
                content_ref.value.add_message({
                  role: "assistant",
                  content: "",
                  messageItems: [],
                  work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
                });
                current_message_state.messageIndex =
                  content_ref.value.messages.length - 1;
              }
              // 启动 loading 定时器（等待新系统处理标签）
              start_loading_timer();
            }
            // 更新当前消息状态
            current_message_state.type = "agentChatResponseFlag";
            current_message_state.wordsContent = data.trim();
            current_message_state.thinkingContent = "";
            current_message_state.currentThroughItemId = null;
            current_message_state.currentWordsItemId = null;
          }
        } else if (current_event === "agent-thinking") {
          // 深度思考内容，使用 through 组件
          // 注意：这个事件的内容会被新的消息队列系统处理，所以这里不需要单独处理
          // 只需要更新状态
          if (content_ref.value && data) {
            current_message_state.type = "agent-thinking";
          }
        } else if (current_event === "chat-to-user") {
          // AI 回复给用户的内容，使用 words 组件
          if (content_ref.value && data) {
            // 使用安全追加函数，防止缓冲区无限增长
            chat_to_user_buffer = safeAppendBuffer(
              chat_to_user_buffer,
              data,
              true
            );

            const { items, remaining } = parseAndExtractTagContent(
              chat_to_user_buffer,
              "words"
            );

            // 将解析后的 items 转换为 extracted 数组（保持兼容）
            const extracted = items.map((item) => item.content);

            // 更新缓冲区（保留未处理的部分）
            chat_to_user_buffer = remaining;

            // 处理所有提取到的完整标签内容
            if (extracted.length > 0) {
              for (let i = 0; i < extracted.length; i++) {
                const content = extracted[i];
                if (!content) continue;
                // 移除可能的引号
                let clean_data = content.trim();
                if (
                  (clean_data.startsWith('"') && clean_data.endsWith('"')) ||
                  (clean_data.startsWith("'") && clean_data.endsWith("'"))
                ) {
                  clean_data = clean_data.slice(1, -1);
                }

                // 如果是第一次收到 chat-to-user 事件
                if (current_message_state.type !== "chat-to-user") {
                  // 如果已经有消息，更新它；否则创建新消息
                  if (current_message_state.messageIndex >= 0) {
                    // 在现有消息中添加或更新 words 组件
                    const existing_content =
                      content_ref.value.get_message_content(
                        current_message_state.messageIndex
                      );
                    // 检查是否已有 words 标签
                    if (existing_content.includes("<words>")) {
                      // 先从现有的 words 标签中提取纯文本内容（不包括标签本身）
                      const wordsMatch = existing_content.match(
                        /<words>([\s\S]*?)<\/words>/
                      );
                      const existingWordsContent =
                        wordsMatch && wordsMatch[1] ? wordsMatch[1] : "";

                      // 更新 words 内容（追加新内容）
                      const newWordsContent = existingWordsContent + clean_data;
                      current_message_state.wordsContent = newWordsContent;

                      // 使用 [\s\S]*? 支持跨行匹配，只替换最外层的 words 标签
                      // 使用非贪婪匹配，确保只匹配第一个 words 标签
                      const updated_content = existing_content.replace(
                        /<words>([\s\S]*?)<\/words>/,
                        `<words>${newWordsContent}</words>`
                      );

                      content_ref.value.update_message_by_index(
                        current_message_state.messageIndex,
                        updated_content
                      );
                    } else {
                      // 添加新的 words 标签
                      current_message_state.wordsContent = clean_data;
                      const new_content = `${existing_content}<words>${clean_data}</words>`;
                      content_ref.value.update_message_by_index(
                        current_message_state.messageIndex,
                        new_content
                      );
                    }
                  } else {
                    // 创建新消息
                    const message_content = `<words>${clean_data}</words>`;
                    content_ref.value.add_message({
                      role: "assistant",
                      content: message_content,
                      work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
                    });
                    current_message_state = {
                      type: "chat-to-user",
                      wordsContent: clean_data,
                      thinkingContent: "",
                      messageIndex: content_ref.value.messages.length - 1,
                      currentThroughItemId: null,
                      currentWordsItemId: null,
                    };
                  }
                  current_message_state.type = "chat-to-user";
                } else {
                  // 流式更新 words 内容
                  const existing_content =
                    content_ref.value.get_message_content(
                      current_message_state.messageIndex
                    );

                  // 先从现有的 words 标签中提取纯文本内容（不包括标签本身）
                  const wordsMatch = existing_content.match(
                    /<words>([\s\S]*?)<\/words>/
                  );
                  const existingWordsContent =
                    wordsMatch && wordsMatch[1] ? wordsMatch[1] : "";

                  // 更新 words 内容（追加新内容）
                  const newWordsContent = existingWordsContent + clean_data;
                  current_message_state.wordsContent = newWordsContent;

                  // 使用 [\s\S]*? 支持跨行匹配，只替换最外层的 words 标签
                  const updated_content = existing_content.replace(
                    /<words>([\s\S]*?)<\/words>/,
                    `<words>${newWordsContent}</words>`
                  );

                  content_ref.value.update_message_by_index(
                    current_message_state.messageIndex,
                    updated_content
                  );
                }
              }
            }
          }
        }

        // 根据事件类型处理消息
        if (current_event === "success" || current_event === "message") {
          // 其他成功消息或普通消息（兼容旧格式）
          try {
            // 尝试解析 JSON
            const json_data = JSON.parse(data);

            // 如果是 JSON 格式的成功消息
            if (json_data.status === 0) {
              // 如果消息中有内容，更新消息
              if (json_data.data && typeof json_data.data === "string") {
                current_message_content += json_data.data;
                if (content_ref.value) {
                  content_ref.value.update_last_message(
                    `<words>${current_message_content}</words>`
                  );
                }
              }
            } else if (json_data.status === 1) {
              // JSON 格式的错误消息
              if (content_ref.value) {
                content_ref.value.update_message_by_index(
                  current_message_state.messageIndex,
                  `<words>错误: ${json_data.message || "未知错误"}</words>`
                );
              }
            }
          } catch (e) {
            // 如果不是 JSON，则作为纯文本处理（兼容旧格式）
            if (content_ref.value && data.trim()) {
              current_message_content += data;
              content_ref.value.update_last_message(
                `<words>${current_message_content}</words>`
              );
            }
          }
        }
      }
    }
  }
  } catch (error: any) {
    // 区分用户主动取消和网络错误
    if (error.name === "AbortError") {
      console.log("[SSE] 连接被用户中止");
    } else {
      console.error("[SSE] 读取流时发生错误:", error.message);
      // 网络错误，尝试重连
      handleConnectionLost();
    }
  } finally {
    // 清理资源
    clearHeartbeatTimer();

    // 释放 reader
    if (current_reader) {
      try {
        current_reader.releaseLock();
      } catch (e) {
        // 忽略已释放的错误
      }
      current_reader = null;
    }
  }
};

// 尝试重连会话
const reconnect_session = async (session_id: string) => {
  // 如果正在重连中，跳过
  if (is_reconnecting) return;

  // 断开之前的连接并清理资源
  await cleanupCurrentConnection();

  const user_id = user_store.user_info?.user_id;
  if (!user_id || !session_id) return;

  // 创建新的 AbortController
  current_abort_controller = new AbortController();

  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch(NwAPI.session.reconnectSession, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id,
        session_id,
      }),
      signal: current_abort_controller.signal,
    });

    if (!response.ok) return;

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/event-stream")) {
      console.log("[WorkChatPannel] 重连成功，开始接收消息流");
      is_sending.value = true;

      // 计算初始消息索引：如果最后一条消息是 assistant 的，则接在后面
      let initialMessageIndex = -1;
      if (
        content_ref.value &&
        content_ref.value.messages &&
        content_ref.value.messages.length > 0
      ) {
        const lastMessage: any =
          content_ref.value.messages[content_ref.value.messages.length - 1];
        if (lastMessage.role === "assistant") {
          initialMessageIndex = content_ref.value.messages.length - 1;
          console.log(
            "[WorkChatPannel] 重连将接在最后一条消息后:",
            initialMessageIndex
          );
        }
      }

      // 重置状态
      current_message_state = {
        type: null,
        wordsContent: "",
        thinkingContent: "",
        messageIndex: initialMessageIndex,
        currentThroughItemId: null,
        currentWordsItemId: null,
      };
      current_message_content = "";
      thinking_buffer = "";
      chat_to_user_buffer = "";
      message_parser_buffer = "";
      messageQueue.length = 0;
      clear_loading();

      await process_sse_response(response);
    } else {
      // 可能是 JSON 响应 "last work is done"
      const data = await response.json();
      console.log("[WorkChatPannel] 重连响应:", data);
    }
  } catch (error: any) {
    if (error.name !== "AbortError") {
      console.warn("[WorkChatPannel] 重连会话失败:", error);
    }
  } finally {
    if (is_sending.value) {
      current_abort_controller = null;
      is_sending.value = false;
      clear_loading();
    }
  }
};

// Handle send message from prompt component
const handle_send_message = async (
  prompt: string,
  sourceLists: Array<{
    source_id: string;
    source_name: string;
    source_type: string;
  }>
) => {
  if (!current_session_id.value) {
    return;
  }

  if (is_sending.value) {
    return;
  }

  is_sending.value = true;
  try {
    await send_message_to_agent(current_session_id.value, prompt, sourceLists);
  } finally {
    is_sending.value = false;
  }
};

// Handle stop session
const handle_stop_session = async () => {
  if (!current_session_id.value || !is_sending.value) {
    return;
  }

  console.log("[WorkChatPannel] 终止会话:", current_session_id.value);

  // 1. 断开当前的 SSE 连接并清理资源 (前端侧断开)
  await cleanupCurrentConnection();

  // 重置重连计数
  reconnect_attempts = 0;

  // 2. 调用后端接口通知终止 (后端侧终止)
  const user_id = user_store.user_info?.user_id;
  if (user_id) {
    try {
      await request({
        url: "session.terminateSession",
        method: "post",
        data: {
          user_id,
          session_id: current_session_id.value,
        },
      });
      console.log("[WorkChatPannel] 后端会话已终止");
    } catch (error) {
      console.error("[WorkChatPannel] 终止后端会话失败:", error);
    }
  }

  // 3. 更新状态
  is_sending.value = false;
  clear_loading();

   // 4. 终止后进行裁剪（视为无 SSE 状态）
  if (content_ref.value) {
    console.log("[WorkPrune] stop_session -> pruneOldWorks(false)");
    content_ref.value.pruneOldWorks(false);
  }

  // 4. 如果最后一条消息是 assistant 且是流式消息，可能需要添加中断提示?
  // 目前逻辑是直接断开，用户看到的就是最后接收到的内容
};

// 发送消息到 agentChat 接口
const send_message_to_agent = async (
  session_id: string,
  prompt: string,
  sourceLists: Array<{
    source_id: string;
    source_name: string;
    source_type: string;
  }>
) => {
  const user_id = user_store.user_info?.user_id;
  if (!user_id) {
    is_sending.value = false;
    return;
  }

  if (!prompt || !prompt.trim()) {
    is_sending.value = false;
    return;
  }

  // 先添加用户消息到消息列表，关联当前 SSE work
  if (content_ref.value) {
    content_ref.value.add_message({
      role: "user",
      content: prompt,
      source_lists: sourceLists || [],
      work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
    });

    // SSE 开始前裁剪旧消息（保留 1 条已完成 work + 当前进行中的）
    console.log("[WorkPrune] send_message -> pruneOldWorks(true)");
    content_ref.value.pruneOldWorks(true, CURRENT_SSE_WORK_ID);
  }

  // 重置当前消息状态
  current_message_state = {
    type: null,
    wordsContent: "",
    thinkingContent: "",
    messageIndex: -1,
    currentThroughItemId: null,
    currentWordsItemId: null,
  };
  current_message_content = "";
  // 重置缓冲区
  thinking_buffer = "";
  chat_to_user_buffer = "";
  message_parser_buffer = "";
  messageQueue.length = 0; // 清空消息队列
  // 清除 loading
  clear_loading();

  // 断开之前的连接并清理资源
  await cleanupCurrentConnection();

  // 重置重连计数
  reconnect_attempts = 0;

  // 创建新的 AbortController
  current_abort_controller = new AbortController();

  try {
    // 获取 token
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    // 构建请求 URL
    const api_url = NwAPI.session.agentChat;

    // 使用 fetch 发送 POST 请求，接收 SSE 流
    const response = await fetch(api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: user_id,
        session_id: session_id,
        prompt: prompt,
      }),
      signal: current_abort_controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 检查响应类型是否为 SSE
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/event-stream")) {
      // 尝试解析 JSON 错误信息
      try {
        const data = await response.json();
        // 检查是否是积分不足错误 (status: 1 且 message 包含 "积分不足")
        if (
          data.status === 1 &&
          data.message &&
          data.message.includes("积分不足")
        ) {
          console.log("[WorkChatPannel] 积分不足:", data.message);

          // 添加积分不足的消息组件
          if (content_ref.value) {
            // 如果没有当前消息，创建一个新的 assistant 消息
            const messageItem = {
              type: "creditsinfo",
              content: data.message,
              id: `msg-item-credits-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            };

            content_ref.value.add_message({
              role: "assistant",
              content: "",
              messageItems: [messageItem],
              work_id: CURRENT_SSE_WORK_ID, // 标记为当前进行中的 work
            });

            // 结束当前发送状态
            return;
          }
        }

        // 如果不是积分不足或其他已知错误，抛出通用错误
        throw new Error(data.message || "响应不是 SSE 流且不是已知的错误格式");
      } catch (e: any) {
        // 如果 JSON 解析失败，抛出原始错误
        throw new Error(
          "响应不是 SSE 流，且无法解析为 JSON: " + (e.message || "未知错误")
        );
      }
    }

    await process_sse_response(response);
  } catch (error: any) {
    if (error.name !== "AbortError") {
      if (content_ref.value) {
        content_ref.value.update_last_message(
          `发送消息失败: ${error.message || "未知错误"}`
        );
      }
    }
  } finally {
    current_abort_controller = null;
    current_message_content = "";
    current_message_state = {
      type: null,
      wordsContent: "",
      thinkingContent: "",
      messageIndex: -1,
      currentThroughItemId: null,
      currentWordsItemId: null,
    };
    // 清除 loading
    clear_loading();
    is_sending.value = false;

    // SSE 结束后裁剪旧消息（保留 2 条已完成 work）
    if (content_ref.value) {
      console.log("[WorkPrune] sse_finally -> pruneOldWorks(false)");
      content_ref.value.pruneOldWorks(false);
    }
  }
};

// 检测并自动发送第一条消息
const check_and_send_first_message = () => {
  // 如果已经发送过第一条消息，不再重复发送
  if (has_sent_first_message) {
    return;
  }

  const session_id = route.query.sessionId as string;
  const prompt = route.query.prompt as string;
  const sourceListsStr = route.query.sourceLists as string | undefined;
  let sourceLists: Array<{
    source_id: string;
    source_name: string;
    source_type: string;
  }> = [];
  if (sourceListsStr) {
    try {
      sourceLists = JSON.parse(decodeURIComponent(sourceListsStr));
    } catch (e) {
      sourceLists = [];
    }
  }

  if (session_id && prompt) {
    // 设置当前会话 ID
    current_session_id.value = session_id;
    fetch_session_operations(session_id);
    // 标记为已发送，防止重复发送
    has_sent_first_message = true;

    // 清除之前的定时器（如果有）
    if (first_message_timer !== null) {
      clearTimeout(first_message_timer);
      first_message_timer = null;
    }

    // 延迟一下，确保组件已完全加载（保存定时器引用以便清理）
    first_message_timer = window.setTimeout(() => {
      first_message_timer = null;
      is_sending.value = true;
      send_message_to_agent(session_id, prompt, sourceLists).finally(() => {
        is_sending.value = false;
      });
      // 发送后清除 query 参数，避免重复发送
      const new_query = { ...route.query };
      delete new_query.sessionId;
      delete new_query.prompt;
      delete new_query.sourceLists;
      router.replace({
        path: route.path,
        query: new_query,
      });
    }, 500);
  }
};

// 监听 session_list 变化，自动选择第一个会话
watch(
  () => props.session_list,
  (newSessionList) => {
    // 如果有会话列表且当前没有选中会话，默认选择第一个
    if (
      newSessionList &&
      newSessionList.length > 0 &&
      !current_session_id.value
    ) {
      const firstSession = newSessionList[0];
      if (firstSession && firstSession.session_id) {
        current_session_id.value = firstSession.session_id;
        fetch_session_operations(firstSession.session_id);
      }
    }
  },
  { immediate: true }
);

// 组件挂载时检查是否需要自动发送消息
onMounted(() => {
  check_and_send_first_message();
});

// 监听路由变化
watch(
  () => route.query,
  () => {
    check_and_send_first_message();
  },
  { deep: true }
);

// 统一重置所有缓冲区和状态
const resetAllBuffersAndState = () => {
  current_message_content = "";
  thinking_buffer = "";
  chat_to_user_buffer = "";
  message_parser_buffer = "";
  messageQueue.length = 0;
  current_message_state = {
    type: null,
    wordsContent: "",
    thinkingContent: "",
    messageIndex: -1,
    currentThroughItemId: null,
    currentWordsItemId: null,
  };
};

// 组件卸载时断开连接并清理资源
onUnmounted(async () => {
  // 清除首条消息发送定时器
  if (first_message_timer !== null) {
    clearTimeout(first_message_timer);
    first_message_timer = null;
  }

  // 清除重连延迟定时器
  if (reconnect_delay_timer !== null) {
    clearTimeout(reconnect_delay_timer);
    reconnect_delay_timer = null;
  }

  // 清理连接
  await cleanupCurrentConnection();

  // 清除 loading 定时器
  clear_loading();

  // 重置所有缓冲区和状态
  resetAllBuffersAndState();

  // 重置重连计数
  reconnect_attempts = 0;
  is_reconnecting = false;
});
</script>

<style lang="scss" scoped>
.work-chat-pannel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
  flex: 1;

  &__prompt-container {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0 1.5rem 0;
    gap: 0.75rem;

    @media (max-width: 768px) {
      padding: 0.375rem 0 1.25rem 0;
    }

    @media (max-width: 480px) {
      padding: 0.25rem 0 1rem 0;
    }
  }
}
</style>
