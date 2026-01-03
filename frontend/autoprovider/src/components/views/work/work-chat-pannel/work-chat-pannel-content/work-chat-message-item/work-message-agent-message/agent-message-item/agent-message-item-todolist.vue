<template>
  <div class="agent-message-item-todolist">
    <div class="agent-message-item-todolist__accordion">
      <button class="agent-message-item-todolist__trigger" @click="toggleOpen">
        <ListTodo class="agent-message-item-todolist__icon" />
        <span class="agent-message-item-todolist__summary">
          {{ t("work.chat.agentMessageItem.todolist.summary") }}
          <span
            v-if="todoItems.length > 0"
            class="agent-message-item-todolist__count"
          >
            ({{ completedCount }}/{{ todoItems.length }})
          </span>
        </span>
        <ChevronDown
          class="agent-message-item-todolist__chevron"
          :class="{ 'agent-message-item-todolist__chevron--open': isOpen }"
        />
      </button>
      <div v-show="isOpen" class="agent-message-item-todolist__content">
        <div
          v-if="todoItems.length === 0"
          class="agent-message-item-todolist__empty"
        >
          {{ t("work.chat.agentMessageItem.todolist.empty") }}
        </div>
        <div
          v-for="(item, index) in todoItems"
          :key="index"
          class="agent-message-item-todolist__item"
          :class="{
            'agent-message-item-todolist__item--done': item.isDone,
          }"
        >
          <div class="agent-message-item-todolist__checkbox">
            <CheckSquare
              v-if="item.isDone"
              class="agent-message-item-todolist__check-icon agent-message-item-todolist__check-icon--checked"
            />
            <Square v-else class="agent-message-item-todolist__check-icon" />
          </div>
          <span
            class="agent-message-item-todolist__item-text"
            :class="{
              'agent-message-item-todolist__item-text--done': item.isDone,
            }"
          >
            {{ item.title }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ListTodo, ChevronDown, CheckSquare, Square } from "lucide-vue-next";
import { decodeHtmlEntities } from "@/utils/messageParse/characterParsing";

interface TodoItem {
  title: string;
  isDone: boolean;
}

interface Props {
  content: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

console.log("=== [TodoList组件] 组件初始化 ===");
console.log("[TodoList组件] Props:", props);

// 解析 todo 列表内容
const todoItems = computed<TodoItem[]>(() => {
  console.log("\n=== [TodoList组件] 开始解析 todoItems ===");
  console.log("[TodoList组件] content 是否存在:", !!props.content);
  console.log("[TodoList组件] content 类型:", typeof props.content);
  console.log("[TodoList组件] content 长度:", props.content?.length);

  if (!props.content) {
    console.warn("[TodoList组件] ❌ content 为空，返回空数组");
    return [];
  }

  console.log("[TodoList组件] 📝 原始 content:", props.content);
  console.log(
    "[TodoList组件] 📝 content 前50个字符:",
    props.content.substring(0, 50)
  );

  try {
    // 先解码 HTML 实体（处理历史记录中的转义字符）
    let decodedContent = decodeHtmlEntities(props.content);
    console.log("[TodoList组件] 🔓 解码后 content:", decodedContent);

    // 处理中文引号/弯引号，替换为标准双引号
    decodedContent = decodedContent.replace(/[“”]/g, '"');
    console.log("[TodoList组件] 🔄 替换引号后 content:", decodedContent);
    console.log(
      "[TodoList组件] 🔓 处理后前50个字符:",
      decodedContent.substring(0, 50)
    );

    // 尝试解析 JSON 格式的内容
    const parsed = JSON.parse(decodedContent);
    console.log("[TodoList组件] ✅ JSON 解析成功！");
    console.log(
      "[TodoList组件] 📦 解析后的数据类型:",
      Array.isArray(parsed) ? "数组" : typeof parsed
    );
    console.log("[TodoList组件] 📦 解析后的数据:", parsed);

    // 如果是数组，直接返回
    if (Array.isArray(parsed)) {
      console.log("[TodoList组件] 🎯 检测到数组，长度:", parsed.length);
      const items = parsed.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          "title" in item &&
          "isDone" in item
      );
      console.log("[TodoList组件] ✨ 过滤后的 items 长度:", items.length);
      console.log("[TodoList组件] ✨ 过滤后的 items:", items);

      if (items.length === 0) {
        console.warn("[TodoList组件] ⚠️ 过滤后为空数组！检查数据格式");
        console.warn("[TodoList组件] 原始数组第一项:", parsed[0]);
      }

      return items;
    }

    // 如果是对象，检查是否有 todos 或 items 字段
    if (typeof parsed === "object" && parsed !== null) {
      console.log("[TodoList组件] 🎯 检测到对象");
      if (Array.isArray(parsed.todos)) {
        console.log(
          "[TodoList组件] ✅ 使用 parsed.todos，长度:",
          parsed.todos.length
        );
        return parsed.todos;
      }
      if (Array.isArray(parsed.items)) {
        console.log(
          "[TodoList组件] ✅ 使用 parsed.items，长度:",
          parsed.items.length
        );
        return parsed.items;
      }
    }

    console.warn("[TodoList组件] ⚠️ 未找到有效的 todo 数组");
    console.warn("[TodoList组件] parsed 的 keys:", Object.keys(parsed || {}));
    return [];
  } catch (error) {
    console.error("[TodoList组件] ❌ 解析内容失败!");
    console.error("[TodoList组件] 错误信息:", error);
    console.error("[TodoList组件] 错误堆栈:", (error as Error).stack);
    console.error("[TodoList组件] 失败的原始内容:", props.content);
    return [];
  }
});

// 计算已完成的任务数量
const completedCount = computed(() => {
  const count = todoItems.value.filter((item) => item.isDone).length;
  console.log(
    "[TodoList组件] 📊 已完成任务数:",
    count,
    "/",
    todoItems.value.length
  );
  return count;
});

// 折叠/展开状态
const isOpen = ref(false);

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  console.log("[TodoList组件] 🔄 切换展开状态:", isOpen.value);
};

// 组件挂载时输出信息
onMounted(() => {
  console.log("\n=== [TodoList组件] 组件已挂载 ===");
  console.log("[TodoList组件] 最终 todoItems 长度:", todoItems.value.length);
  console.log("[TodoList组件] 最终 todoItems:", todoItems.value);
});

// 监听 content 变化
watch(
  () => props.content,
  (newContent, oldContent) => {
    console.log("\n=== [TodoList组件] Content 发生变化 ===");
    console.log("[TodoList组件] 旧值:", oldContent);
    console.log("[TodoList组件] 新值:", newContent);
  }
);

// 监听 todoItems 变化
watch(todoItems, (newItems, oldItems) => {
  console.log("\n=== [TodoList组件] TodoItems 发生变化 ===");
  console.log("[TodoList组件] 旧值长度:", oldItems?.length);
  console.log("[TodoList组件] 新值长度:", newItems?.length);
  console.log("[TodoList组件] 新值:", newItems);
});
</script>

<style lang="scss" scoped>
.agent-message-item-todolist {
  width: 100%;
  display: flex;
  flex-direction: column;
  user-select: none;

  &__accordion {
    width: 100%;
    background: transparent;
    overflow: hidden;
  }

  &__trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.5rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      color: rgba(255, 255, 255, 0.9);

      .agent-message-item-todolist__summary {
        color: rgba(255, 255, 255, 0.9);
      }
    }

    @media (max-width: 768px) {
      padding: 0.6875rem 0.4375rem;
      font-size: 0.8125rem;
      gap: 0.625rem;
    }

    @media (max-width: 480px) {
      padding: 0.625rem 0.375rem;
      font-size: 0.75rem;
      gap: 0.5rem;
    }
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    color: rgba(254, 238, 222, 0.7);
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 0.9375rem;
      height: 0.9375rem;
    }

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__summary {
    flex: 1;
    text-align: left;
    color: rgba(255, 255, 255, 0.6);
  }

  &__count {
    margin-left: 0.375rem;
    color: rgba(254, 238, 222, 0.8);
    font-weight: 600;
  }

  &__chevron {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s ease;
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.6);

    &--open {
      transform: rotate(180deg);
    }

    @media (max-width: 768px) {
      width: 0.9375rem;
      height: 0.9375rem;
    }

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__content {
    min-height: 2rem;
    max-height: 31.25rem;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5rem 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    @media (max-width: 768px) {
      max-height: 25rem;
      padding: 0.4375rem 0.4375rem 0.6875rem;
      gap: 0.4375rem;
    }

    @media (max-width: 480px) {
      max-height: 18.75rem;
      padding: 0.375rem 0.375rem 0.625rem;
      gap: 0.375rem;
    }

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  &__empty {
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    padding: 1rem 0;

    @media (max-width: 768px) {
      font-size: 0.8125rem;
      padding: 0.875rem 0;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
      padding: 0.75rem 0;
    }
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background: rgba(255, 255, 255, 0.02);
    transition: background 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    &--done {
      opacity: 0.7;
    }

    @media (max-width: 768px) {
      padding: 0.4375rem;
      gap: 0.5625rem;
    }

    @media (max-width: 480px) {
      padding: 0.375rem;
      gap: 0.5rem;
    }
  }

  &__checkbox {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 0.125rem;
  }

  &__check-icon {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.4);

    &--checked {
      color: rgba(254, 238, 222, 0.8);
    }

    @media (max-width: 768px) {
      width: 0.9375rem;
      height: 0.9375rem;
    }

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__item-text {
    flex: 1;
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.8);
    word-wrap: break-word;
    word-break: break-word;

    &--done {
      text-decoration: line-through;
      color: rgba(255, 255, 255, 0.5);
    }

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }
}
</style>
