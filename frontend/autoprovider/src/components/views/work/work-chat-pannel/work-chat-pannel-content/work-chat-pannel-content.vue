<template>
  <div class="work-chat-pannel-content">
    <div class="work-chat-pannel-content__container">
      <!-- 消息列表 -->
      <div ref="messagesContainer" class="work-chat-pannel-content__messages">
        <!-- 根据 messages 数组渲染消息 -->
        <template v-for="(message, index) in messages" :key="message.id">
          <WorkMessageUserMessage
            v-if="message.role === 'user'"
            :content="message.content"
            :source_lists="message.source_lists || []"
          />
          <WorkMessageAgentMessage
            v-else-if="message.role === 'assistant'"
            :content="message.content"
            :message-items="message.messageItems || []"
            :is-last="index === messages.length - 1"
            :is-sending="props.isSending"
          />
        </template>

        <!-- 空状态 -->
        <div
          v-if="messages.length === 0"
          class="work-chat-pannel-content__empty"
        >
          <div class="work-chat-pannel-content__empty-content">
            <img
              :src="logo"
              alt="AutoProvider Logo"
              class="work-chat-pannel-content__empty-logo"
            />
            <p class="work-chat-pannel-content__empty-text">
              今天你有什么想法要实现呢！
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import WorkMessageUserMessage from "./work-chat-message-item/work-message-user-message.vue";
import WorkMessageAgentMessage from "./work-chat-message-item/work-message-agent-message/work-message-agent-message.vue";
import logo from "@/static/logo.png";
import { parseMessage } from "@/utils/messageParse/messageParser";

const { t } = useI18n();

// ========== 内存保护配置 ==========
const MAX_MESSAGES = 200; // 最大消息条数
const MAX_MESSAGE_ITEMS_PER_MESSAGE = 100; // 每条消息最大消息项数
const MAX_CONTENT_LENGTH = 64 * 1024; // 单条内容最大长度：64KB

interface Props {
  isSending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSending: false,
});

// 消息容器引用
const messagesContainer = ref<HTMLElement | null>(null);

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 组件挂载时滚动到底部
onMounted(() => {
  scrollToBottom();
});

// 消息项类型
interface MessageItem {
  type: string;
  content: string;
  id: string;
}

// 消息列表
const messages = ref<
  Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
    messageItems?: MessageItem[];
    source_lists?: Array<{
      source_id: string;
      source_name: string;
      source_type: string;
    }>;
    work_id?: string; // 关联的 work_id，用于裁剪控制
  }>
>([]);

// ========== Work 裁剪控制 ==========
// work 顺序队列（按时间顺序，最旧的在前）
const workOrder = ref<string[]>([]);

// 当前进行中的 SSE work 标识
const CURRENT_SSE_WORK_ID = "__current_sse_work__";

// 默认可见的已完成 work 数量
const DEFAULT_VISIBLE_COMPLETED_WORKS = 2;

// 清空消息列表
const clear_messages = () => {
  messages.value = [];
  workOrder.value = [];
  // 清空后滚动到顶部
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = 0;
    }
  });
};

/**
 * 裁剪旧的 work 消息以控制内存
 * @param isSseActive 当前是否有 SSE 进行中
 * @param currentSseWorkId 当前进行中的 SSE work_id（可选，默认使用 CURRENT_SSE_WORK_ID）
 */
const pruneOldWorks = (
  isSseActive: boolean,
  currentSseWorkId: string = CURRENT_SSE_WORK_ID
) => {
  // 计算需要保留的 work 数量
  // - SSE 活跃：保留进行中的 work + 1 条已完成 work
  // - SSE 不活跃：保留 2 条已完成 work
  const maxCompletedWorks = isSseActive ? 1 : DEFAULT_VISIBLE_COMPLETED_WORKS;

  // 获取所有已完成的 work_id
  // 当 SSE 活跃时，排除当前进行中的占位；SSE 不活跃则计入占位以便被裁剪
  const completedWorkIds = workOrder.value.filter((id) => {
    if (isSseActive && (id === currentSseWorkId || id === CURRENT_SSE_WORK_ID)) {
      return false;
    }
    return true;
  });

  // 处理没有 work_id 的旧消息（兼容历史数据）：按最早优先移除
  const legacyMessages = messages.value.filter((m) => !m.work_id);
  const legacyCount = legacyMessages.length;
  let legacyToRemove = 0;
  const totalCompletedWithLegacy = completedWorkIds.length + legacyCount;
  if (totalCompletedWithLegacy > maxCompletedWorks) {
    legacyToRemove = Math.min(
      legacyCount,
      totalCompletedWithLegacy - maxCompletedWorks
    );
  }

  // 需要删除的 work_id
  const worksToRemove =
    completedWorkIds.length > maxCompletedWorks
      ? completedWorkIds.slice(0, completedWorkIds.length - maxCompletedWorks)
      : [];

  if (worksToRemove.length === 0) {
    return;
  }

  console.log(
    `[WorkPrune] SSE活跃=${isSseActive}, currentSse=${currentSseWorkId}, completed=${completedWorkIds.length}, legacy=${legacyCount}, removeWorks=${worksToRemove}, removeLegacy=${legacyToRemove}`
  );

  // 从 messages 中移除属于这些 work 的消息
  const worksToRemoveSet = new Set(worksToRemove);
  const originalLength = messages.value.length;

  // 先移除 legacy（无 work_id）的旧消息
  if (legacyToRemove > 0) {
    let removedLegacy = 0;
    messages.value = messages.value.filter((msg) => {
      if (!msg.work_id && removedLegacy < legacyToRemove) {
        removedLegacy++;
        return false;
      }
      return true;
    });
  }

  // 再移除需要删除的 work 消息
  messages.value = messages.value.filter((msg) => {
    if (!msg.work_id) return true; // 其余 legacy 保留（未超限）
    return !worksToRemoveSet.has(msg.work_id);
  });

  // 从 workOrder 中移除
  workOrder.value = workOrder.value.filter((id) => !worksToRemoveSet.has(id));

  console.log(
    `[WorkPrune] 消息数量: ${originalLength} -> ${messages.value.length}, 剩余 work: ${workOrder.value.length}, workOrder=${JSON.stringify(workOrder.value)}`
  );
};

// 清理超限的旧消息
const trim_old_messages = () => {
  if (messages.value.length > MAX_MESSAGES) {
    const removeCount = messages.value.length - MAX_MESSAGES;
    messages.value.splice(0, removeCount);
    console.log(`[内存保护] 消息数超限，移除最旧的 ${removeCount} 条消息`);
  }
};

// 截断过长的内容
const truncate_content = (content: string): string => {
  if (content.length > MAX_CONTENT_LENGTH) {
    console.warn(
      `[内存保护] 内容长度 ${content.length} 超过上限 ${MAX_CONTENT_LENGTH}，截断尾部保留`
    );
    return content.slice(-MAX_CONTENT_LENGTH);
  }
  return content;
};

// 添加消息
const add_message = (message: {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  messageItems?: MessageItem[];
  source_lists?: Array<{
    source_id: string;
    source_name: string;
    source_type: string;
  }>;
  work_id?: string; // 关联的 work_id
}) => {
  const message_id =
    message.id ||
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 截断过长的内容
  const safe_content = truncate_content(message.content);

  // 处理 work_id：如果提供了 work_id 且不在 workOrder 中，添加到队列
  if (message.work_id && !workOrder.value.includes(message.work_id)) {
    workOrder.value.push(message.work_id);
  }

  messages.value.push({
    id: message_id,
    role: message.role,
    content: safe_content,
    timestamp: message.timestamp || new Date().toISOString(),
    messageItems: message.messageItems || [],
    source_lists: message.source_lists || [],
    work_id: message.work_id,
  });

  // 清理超限的旧消息
  trim_old_messages();

  // 添加消息后滚动到底部
  scrollToBottom();
};

// 更新最后一条消息（用于流式更新）
const update_last_message = (content: string) => {
  if (messages.value.length > 0) {
    const last_message = messages.value[messages.value.length - 1];
    if (last_message && last_message.role === "assistant") {
      // 截断过长的内容
      last_message.content = truncate_content(content);
      scrollToBottom();
    }
  }
};

// 根据索引更新消息内容
const update_message_by_index = (
  index: number,
  content: string,
  messageItems?: MessageItem[]
) => {
  if (index >= 0 && index < messages.value.length) {
    const message = messages.value[index];
    if (message) {
      // 截断过长的内容
      message.content = truncate_content(content);
      if (messageItems !== undefined) {
        message.messageItems = messageItems;
      }
      scrollToBottom();
    }
  }
};

// 根据索引添加消息项到消息
const add_message_item_to_index = (index: number, item: MessageItem) => {
  if (index >= 0 && index < messages.value.length) {
    const message = messages.value[index];
    if (message) {
      if (!message.messageItems) {
        message.messageItems = [];
      }

      // 检查是否已存在（通过 id）
      const exists = message.messageItems.some(
        (existing) => existing.id === item.id
      );

      if (!exists) {
        // 如果添加的是非 loading 消息项，先清除所有末尾的 loading 项
        if (item.type !== "loading") {
          console.log(
            `[队列操作] 准备添加非 loading 项: type=${
              item.type
            }, content=${item.content.substring(0, 50)}`
          );
          console.log(
            `[队列操作] 添加前的 messageItems 数量: ${message.messageItems.length}`
          );
          console.log(
            `[队列操作] 添加前的 messageItems:`,
            message.messageItems.map((m) => ({ type: m.type, id: m.id }))
          );

          // 从末尾开始，移除所有连续的 loading 项
          while (
            message.messageItems.length > 0 &&
            message.messageItems[message.messageItems.length - 1]?.type ===
              "loading"
          ) {
            const removedItem = message.messageItems.pop();
            if (removedItem) {
              console.log(
                `[队列操作] 移除末尾的 loading 项: id=${removedItem.id}`
              );
            }
          }

          console.log(
            `[队列操作] 清除 loading 后的 messageItems 数量: ${message.messageItems.length}`
          );
        } else {
          console.log(`[队列操作] 添加 loading 项: id=${item.id}`);
        }

        // 截断过长的消息项内容
        const safe_item = {
          ...item,
          content: truncate_content(item.content),
        };

        // 检查消息项数量是否超限
        if (message.messageItems.length >= MAX_MESSAGE_ITEMS_PER_MESSAGE) {
          // 移除最旧的消息项（保留最近的）
          const removeCount =
            message.messageItems.length - MAX_MESSAGE_ITEMS_PER_MESSAGE + 1;
          message.messageItems.splice(0, removeCount);
          console.warn(
            `[内存保护] 消息项数量超限，移除最旧的 ${removeCount} 个消息项`
          );
        }

        // 添加新消息项
        message.messageItems.push(safe_item);
        console.log(
          `[队列操作] 添加后的 messageItems 数量: ${message.messageItems.length}`
        );
        console.log(
          `[队列操作] 添加后的 messageItems:`,
          message.messageItems.map((m) => ({ type: m.type, id: m.id }))
        );

        scrollToBottom();
      } else {
        console.log(
          `[队列操作] 消息项已存在，跳过: id=${item.id}, type=${item.type}`
        );
      }
    }
  }
};

// 根据索引和消息项 ID 更新消息项内容
const update_message_item_content = (
  index: number,
  itemId: string,
  newContent: string
) => {
  if (index >= 0 && index < messages.value.length) {
    const message = messages.value[index];
    if (message && message.messageItems) {
      const item = message.messageItems.find((item) => item.id === itemId);
      if (item) {
        // 截断过长的内容
        item.content = truncate_content(newContent);
        scrollToBottom();
      }
    }
  }
};

// 根据索引和消息项 ID 获取消息项内容
const get_message_item_content = (index: number, itemId: string): string => {
  if (index >= 0 && index < messages.value.length) {
    const message = messages.value[index];
    if (message && message.messageItems) {
      const item = message.messageItems.find((item) => item.id === itemId);
      if (item) {
        return item.content;
      }
    }
  }
  return "";
};

// 根据索引和消息项 ID 移除消息项
const remove_message_item_by_id = (index: number, itemId: string) => {
  if (index >= 0 && index < messages.value.length) {
    const message = messages.value[index];
    if (message && message.messageItems) {
      const itemIndex = message.messageItems.findIndex(
        (item) => item.id === itemId
      );
      if (itemIndex !== -1) {
        message.messageItems.splice(itemIndex, 1);
        scrollToBottom();
      }
    }
  }
};

// 根据索引获取消息内容
const get_message_content = (index: number): string => {
  if (index >= 0 && index < messages.value.length) {
    const message = messages.value[index];
    if (message) {
      return message.content;
    }
  }
  return "";
};

// 暴露方法供父组件调用
interface Operation {
  operation_id: string;
  dialogue_id: string;
  dialogue_index: number;
  operation_index: number | null;
  operation_method: string;
  operation_code: string;
  create_time: string;
}

interface UserMessage {
  dialogue_id: string;
  dialogue_index: number;
  create_time: string;
  user_content: string;
  source_lists?: Array<{
    source_id: string;
    source_name: string;
    source_type: string;
  }>;
}

interface Work {
  work_id: string;
  work_create_time: string;
  user_messages: UserMessage[];
  operations: Operation[];
}

/**
 * 设置历史 work 消息
 * @param works 后端返回的 work 列表
 * @param isSseActive 当前是否有 SSE 进行中（影响裁剪策略）
 */
const set_history_works = (works: Work[] = [], isSseActive: boolean = false) => {
  messages.value = [];
  workOrder.value = [];

  // 按 work 创建时间排序
  const sortedWorks = [...works].sort(
    (a, b) =>
      new Date(a.work_create_time).getTime() -
      new Date(b.work_create_time).getTime()
  );

  sortedWorks.forEach((work) => {
    // 记录 work_id 到顺序队列
    if (!workOrder.value.includes(work.work_id)) {
      workOrder.value.push(work.work_id);
    }

    // 1. 添加用户消息
    // 按 dialogue_index 排序
    const sortedUserMessages = [...work.user_messages].sort(
      (a, b) => a.dialogue_index - b.dialogue_index
    );

    sortedUserMessages.forEach((msg) => {
      add_message({
        id: msg.dialogue_id,
        role: "user",
        content: msg.user_content || "",
        timestamp: msg.create_time,
        source_lists: msg.source_lists || [],
        work_id: work.work_id, // 关联 work_id
      });
    });

    // 2. 添加操作记录 (AI 消息)
    if (work.operations.length > 0) {
      // 按 dialogue_index 和 operation_index 排序
      const sortedOperations = [...work.operations].sort((a, b) => {
        if (a.dialogue_index !== b.dialogue_index) {
          return a.dialogue_index - b.dialogue_index;
        }
        const aIndex = a.operation_index ?? Infinity;
        const bIndex = b.operation_index ?? Infinity;
        return aIndex - bIndex;
      });

      // 所有的 operations 放在同一个 assistant 消息中显示（按 work 分组）
      const messageItems: MessageItem[] = [];

      sortedOperations.forEach((op, idx) => {
        // 解析 operation_code
        const parsedItems = parseMessage(op.operation_code || "");
        const itemsToAdd =
          parsedItems.length > 0
            ? parsedItems
            : op.operation_code
            ? [
                {
                  label: op.operation_method || "words",
                  content: op.operation_code,
                },
              ]
            : [];

        itemsToAdd.forEach((item, itemIdx) => {
          messageItems.push({
            type: item.label,
            content: item.content,
            id: `${op.operation_id}-${idx}-${itemIdx}-${Math.random()
              .toString(36)
              .slice(2, 10)}`,
          });
        });
      });

      if (messageItems.length > 0) {
        add_message({
          id: `work-${work.work_id}-assistant`,
          role: "assistant",
          content: "",
          timestamp: work.work_create_time, // 使用 work 的时间或第一条 operation 的时间
          messageItems: messageItems,
          work_id: work.work_id, // 关联 work_id
        });
      }
    }
  });

  // 加载历史后立即裁剪，只保留最近的 work
  pruneOldWorks(isSseActive);

  scrollToBottom();
};

defineExpose({
  clear_messages,
  add_message,
  update_last_message,
  update_message_by_index,
  get_message_content,
  add_message_item_to_index,
  update_message_item_content,
  get_message_item_content,
  remove_message_item_by_id,
  messages,
  set_history_works,
  trim_old_messages,
  // Work 裁剪相关
  pruneOldWorks,
  workOrder,
  CURRENT_SSE_WORK_ID,
});
</script>

<style lang="scss" scoped>
.work-chat-pannel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;

  @media (max-width: 768px) {
    padding: 1.25rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
  }

  &__container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  &__messages {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    padding-right: 0.5rem;
    padding-bottom: 2rem;

    // 使用mask-image实现底部渐变透明效果，与prompt框形成平滑过渡
    mask-image: linear-gradient(
      to bottom,
      black 0%,
      black calc(100% - 40px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      black calc(100% - 40px),
      transparent 100%
    );

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;

    @media (max-width: 768px) {
      gap: 1.25rem;
      padding-bottom: 1.5rem;
      mask-image: linear-gradient(
        to bottom,
        black 0%,
        black calc(100% - 30px),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        black 0%,
        black calc(100% - 30px),
        transparent 100%
      );
    }

    @media (max-width: 480px) {
      gap: 1rem;
      padding-bottom: 1.25rem;
      mask-image: linear-gradient(
        to bottom,
        black 0%,
        black calc(100% - 25px),
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        black 0%,
        black calc(100% - 25px),
        transparent 100%
      );
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  &__empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  &__empty-logo {
    width: 4rem;
    height: 4rem;
    object-fit: contain;
    user-select: none;

    @media (max-width: 768px) {
      width: 3.5rem;
      height: 3.5rem;
    }

    @media (max-width: 480px) {
      width: 3rem;
      height: 3rem;
    }
  }

  &__empty-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    text-align: center;
    font-family: "Source Serif 4", serif;
    line-height: 1.6;
    user-select: none;
    margin: 0;

    @media (max-width: 768px) {
      font-size: 0.9375rem;
    }

    @media (max-width: 480px) {
      font-size: 0.875rem;
    }
  }
}
</style>
