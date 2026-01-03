<template>
  <div class="work-message-agent-message">
    <!-- Logo -->
    <div class="work-message-agent-message__logo">
      <img
        :src="logoUrl"
        alt="Logo"
        class="work-message-agent-message__logo-img"
      />
    </div>

    <!-- 消息内容 -->
    <div class="work-message-agent-message__content">
      <component
        v-for="(item, index) in renderQueue"
        :key="`${item.type}-${item.id}-${index}`"
        :is="getComponentForType(item.type)"
        :content="item.content"
      />
    </div>

    <!-- 回撤按钮 -->
    <button
      v-if="showUndoButton"
      class="work-message-agent-message__undo-button"
      @click="handle_undo"
    >
      <Undo2 class="work-message-agent-message__undo-icon" />
      <span class="work-message-agent-message__undo-text">
        {{ t("work.chat.agentMessageItem.undo.button") }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Undo2 } from "lucide-vue-next";
import AgentMessageItemWords from "./agent-message-item/agent-message-item-words.vue";
import AgentMessageItemThrough from "./agent-message-item/agent-message-item-through.vue";
import AgentMessageItemCreate from "./agent-message-item/agent-message-item-create.vue";
import AgentMessageItemRead from "./agent-message-item/agent-message-item-read.vue";
import AgentMessageItemDelect from "./agent-message-item/agent-message-item-delect.vue";
import AgentMessageItemEdit from "./agent-message-item/agent-message-item-edit.vue";
import AgentMessageItemRan from "./agent-message-item/agent-message-item-ran.vue";
import AgentMessageItemSearch from "./agent-message-item/agent-message-item-search.vue";
import AgentMessageItemLinter from "./agent-message-item/agent-message-item-linter.vue";
import AgentMessageItemLoading from "./agent-message-item/agent-message-item-loading.vue";
import AgentMessageItemTodolist from "./agent-message-item/agent-message-item-todolist.vue";
import AgentMessageItemCreditsInfo from "./agent-message-item/agent-message-item-creditsinfo.vue";
import AgentMessageItemSql from "./agent-message-item/agent-message-item-sql.vue";
import AgentMessageItemDeploy from "./agent-message-item/agent-message-item-deploy.vue";
import AgentMessageItemWebsearch from "./agent-message-item/agent-message-item-websearch.vue";
import AgentMessageItemGrep from "./agent-message-item/agent-message-item-grep.vue";
import logoUrl from "@/static/logo.png";
import { parseMessage } from "@/utils/messageParse/messageParser";

interface MessageItem {
  type: string;
  content: string;
  id: string;
}

interface Props {
  content?: string;
  messageItems?: MessageItem[];
  isLast?: boolean;
  isSending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
  messageItems: () => [],
  isLast: false,
  isSending: false,
});

const { t } = useI18n();

// 控制回撤按钮显示
const showUndoButton = computed(() => {
  // 如果是最后一条消息，且正在发送中，则隐藏
  if (props.isLast && props.isSending) {
    return false;
  }
  // 其他情况都显示
  return true;
});

// 组件映射
const componentMap: Record<string, any> = {
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
  creditsinfo: AgentMessageItemCreditsInfo,
  deploy: AgentMessageItemDeploy,
  websearch: AgentMessageItemWebsearch,
  web_search: AgentMessageItemWebsearch,
  grep_file: AgentMessageItemGrep,
  grepfile: AgentMessageItemGrep,
};

// 根据类型获取对应组件
const getComponentForType = (type: string) => {
  return componentMap[type] || AgentMessageItemWords;
};

// 处理回撤操作
const handle_undo = () => {
  console.log("Undo this action");
  // TODO: Implement undo logic
};

// 渲染队列：存储所有需要渲染的消息项
const renderQueue = ref<MessageItem[]>([]);

// 监听 messageItems prop 的变化，将新消息添加到队列或更新现有消息
watch(
  () => props.messageItems,
  (newItems, oldItems) => {
    if (newItems && newItems.length > 0) {
      // 创建新项的 ID 集合，用于检测哪些项应该被移除
      const newItemIds = new Set(newItems.map((item) => item.id));

      console.log(`[渲染队列] messageItems 变化，新项数量: ${newItems.length}`);
      console.log(
        `[渲染队列] 当前 renderQueue 数量: ${renderQueue.value.length}`
      );
      console.log(`[渲染队列] 新项 IDs:`, Array.from(newItemIds));
      console.log(
        `[渲染队列] 当前 renderQueue IDs:`,
        renderQueue.value.map((item) => item.id)
      );

      // 移除不再存在于 newItems 中的项
      const itemsToRemove: string[] = [];
      renderQueue.value = renderQueue.value.filter((item) => {
        const shouldKeep = newItemIds.has(item.id);
        if (!shouldKeep) {
          itemsToRemove.push(item.id);
          console.log(`[渲染队列] 移除项: id=${item.id}, type=${item.type}`);
        }
        return shouldKeep;
      });

      if (itemsToRemove.length > 0) {
        console.log(`[渲染队列] 共移除 ${itemsToRemove.length} 个项`);
      }

      // 添加或更新项
      newItems.forEach((item) => {
        const existingItem = renderQueue.value.find(
          (existing) => existing.id === item.id
        );

        if (existingItem) {
          // 如果已存在，更新内容（用于流式更新，特别是 through 组件）
          existingItem.content = item.content;
          console.log(`[渲染队列] 更新项: id=${item.id}, type=${item.type}`);
        } else {
          // 这是一个新消息项，添加到渲染队列
          renderQueue.value.push({ ...item });
          console.log(`[渲染队列] 添加新项: id=${item.id}, type=${item.type}`);
        }
      });

      console.log(
        `[渲染队列] 处理后 renderQueue 数量: ${renderQueue.value.length}`
      );
      console.log(
        `[渲染队列] 处理后 renderQueue:`,
        renderQueue.value.map((item) => ({ type: item.type, id: item.id }))
      );
    } else if (newItems && newItems.length === 0) {
      // 如果 messageItems 为空，清空渲染队列
      console.log(`[渲染队列] messageItems 为空，清空 renderQueue`);
      renderQueue.value = [];
    }
  },
  { deep: true, immediate: true }
);

// 兼容旧格式：如果提供了 content，解析它并添加到队列
const parsedItems = computed(() => {
  if (props.content) {
    const parsedMessages = parseMessage(props.content);
    return parsedMessages.map((item, index) => ({
      type: item.label,
      content: item.content,
      id: `parsed-${index}-${Date.now()}`,
    }));
  }
  return [];
});

// 初始化时，如果有 content，将解析后的项添加到队列
watch(
  () => props.content,
  (newContent) => {
    if (newContent && parsedItems.value.length > 0) {
      // 只在队列为空时添加，避免重复
      if (renderQueue.value.length === 0) {
        renderQueue.value = [...parsedItems.value];
      }
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.work-message-agent-message {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;

  @media (max-width: 768px) {
    gap: 0.875rem;
  }

  @media (max-width: 480px) {
    gap: 0.75rem;
  }

  &__logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    user-select: none;
  }

  &__logo-img {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
    display: block;

    @media (max-width: 768px) {
      width: 1.875rem;
      height: 1.875rem;
    }

    @media (max-width: 480px) {
      width: 1.75rem;
      height: 1.75rem;
    }
  }

  &__content {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    @media (max-width: 768px) {
      gap: 0.875rem;
    }

    @media (max-width: 480px) {
      gap: 0.75rem;
    }
  }

  &__undo-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    cursor: pointer;
    transition: all 0.3s ease;
    align-self: flex-end;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(254, 238, 222, 0.3);
      color: #feeede;
    }

    &:active {
      transform: translateY(1px);
    }

    @media (max-width: 768px) {
      padding: 0.4375rem 0.875rem;
      font-size: 0.8125rem;
      gap: 0.4375rem;
    }

    @media (max-width: 480px) {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      gap: 0.375rem;
    }
  }

  &__undo-icon {
    width: 1rem;
    height: 1rem;

    @media (max-width: 768px) {
      width: 0.9375rem;
      height: 0.9375rem;
    }

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__undo-text {
    white-space: nowrap;
  }
}
</style>
