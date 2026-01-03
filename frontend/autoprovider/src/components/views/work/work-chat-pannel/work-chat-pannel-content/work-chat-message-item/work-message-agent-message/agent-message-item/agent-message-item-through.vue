<template>
  <div class="agent-message-item-through">
    <div class="agent-message-item-through__accordion">
      <button class="agent-message-item-through__trigger" @click="toggleOpen">
        <Brain class="agent-message-item-through__icon" />
        <span class="agent-message-item-through__summary">
          {{ t("work.chat.agentMessageItem.through.summary") }}
          <template v-if="!isHistoryMessage"> {{ currentDuration }}s </template>
        </span>
        <ChevronDown
          class="agent-message-item-through__chevron"
          :class="{ 'agent-message-item-through__chevron--open': isOpen }"
        />
      </button>
      <div v-show="isOpen" class="agent-message-item-through__content">
        <div
          class="agent-message-item-through__text"
          v-html="renderedContent"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { Brain, ChevronDown } from "lucide-vue-next";
import { decodeHtmlEntities } from "@/utils/messageParse/characterParsing";
import { renderMarkdown } from "@/utils/markdown";

interface Props {
  content: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

// 调试日志：组件创建
console.log("[Through组件] 组件创建，content:", props.content);
console.log("[Through组件] content 类型:", typeof props.content);
console.log("[Through组件] content 长度:", props.content?.length || 0);

// 检测是否为历史消息（不包含 | 分隔符）
const isHistoryMessage = computed(() => {
  return props.content && !props.content.includes("|");
});

// 解析内容，提取时间、思考内容和结束标志
const parsedData = computed(() => {
  console.log("[Through组件] 解析数据，原始 content:", props.content);

  if (!props.content) {
    console.warn("[Through组件] 警告: content 为空");
    return {
      duration: "0",
      thinkingContent: "",
      isFinished: false,
      isHistory: false,
    };
  }

  // 如果是历史消息（不包含 |），直接使用整个 content 作为思考内容
  if (isHistoryMessage.value) {
    console.log("[Through组件] 检测到历史消息格式");
    return {
      duration: "0",
      thinkingContent: props.content,
      isFinished: true,
      isHistory: true,
    };
  }

  // 实时消息格式：duration|thinking content 或 duration|thinking content|OVERFLAG
  const parts = props.content.split("|");
  const hasOverFlag = parts[parts.length - 1] === "OVERFLAG";
  const result = {
    duration: parts[0] || "0",
    thinkingContent: hasOverFlag
      ? parts.slice(1, -1).join("|")
      : parts.slice(1).join("|") || "",
    isFinished: hasOverFlag,
    isHistory: false,
  };

  console.log("[Through组件] 解析结果:", result);
  return result;
});

const thinkingContent = computed(() => parsedData.value.thinkingContent);
const isFinished = computed(() => parsedData.value.isFinished);

// 渲染后的内容（解码 + Markdown 渲染）
const renderedContent = computed(() => {
  if (!thinkingContent.value) {
    return "";
  }
  // 先解码 HTML 实体，再进行 Markdown 渲染
  const decoded = decodeHtmlEntities(thinkingContent.value);
  return renderMarkdown(decoded);
});

// 思考开始时间（组件创建时记录）
const startTime = ref<number>(Date.now());

// 思考结束时间（当检测到 OVERFLAG 时记录）
const endTime = ref<number | null>(null);

// 当前显示的思考时间（秒，带小数）
const currentDuration = ref<string>("0.0");

// 定时器 ID
let timerId: number | null = null;

// 更新思考时间（以毫秒为单位，显示为秒）
const updateDuration = () => {
  if (endTime.value !== null) {
    // 思考已结束，显示最终时间
    const elapsedMs = endTime.value - startTime.value;
    const elapsedSeconds = elapsedMs / 1000;
    currentDuration.value = elapsedSeconds.toFixed(1);
    // 停止定时器
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  } else {
    // 思考进行中，继续计时
    const elapsedMs = Date.now() - startTime.value;
    const elapsedSeconds = elapsedMs / 1000;
    // 保留一位小数
    currentDuration.value = elapsedSeconds.toFixed(1);
  }
};

// 监听内容变化，检测 OVERFLAG
watch(
  () => props.content,
  (newContent, oldContent) => {
    console.log("[Through组件] content 变化:", {
      old: oldContent,
      new: newContent,
      isFinished: isFinished.value,
      endTime: endTime.value,
      isHistory: isHistoryMessage.value,
    });

    // 如果是历史消息，不处理计时逻辑
    if (isHistoryMessage.value) {
      console.log("[Through组件] 历史消息，跳过计时逻辑");
      return;
    }

    // 检查是否包含结束标志
    if (isFinished.value && endTime.value === null) {
      // 思考结束，记录结束时间并停止计时
      console.log("[Through组件] 检测到思考结束");
      endTime.value = Date.now();
      updateDuration();
    }
  },
  { immediate: true }
);

// 组件挂载时启动定时器
onMounted(() => {
  console.log("[Through组件] 组件已挂载");
  console.log("[Through组件] 是否为历史消息:", isHistoryMessage.value);
  console.log(
    "[Through组件] DOM 元素是否存在:",
    document.querySelector(".agent-message-item-through")
  );

  // 如果是历史消息，不进行计时
  if (isHistoryMessage.value) {
    console.log("[Through组件] 历史消息，跳过计时");
    return;
  }

  startTime.value = Date.now();
  currentDuration.value = "0.0";
  // 如果已经结束，直接显示最终时间
  if (isFinished.value) {
    endTime.value = Date.now();
    updateDuration();
  } else {
    // 每100毫秒更新一次时间，使显示更流畅
    timerId = window.setInterval(() => {
      updateDuration();
    }, 100);
  }

  // 检查 DOM 是否真的存在
  nextTick(() => {
    const element = document.querySelector(".agent-message-item-through");
    console.log("[Through组件] nextTick 后 DOM 元素:", element);
    if (!element) {
      console.error("[Through组件] 错误: 组件挂载后 DOM 元素不存在！");
    }
  });
});

// 组件卸载时清除定时器
onUnmounted(() => {
  console.log("[Through组件] 组件即将卸载");
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
});

// 折叠/展开状态
const isOpen = ref(false);

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};
</script>

<style lang="scss" scoped>
@use "@/styles/markdown-content.scss" as *;

.agent-message-item-through {
  width: 100%;
  display: flex;
  flex-direction: column;

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

      .agent-message-item-through__summary {
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
    // 移除 max-height 限制，改为使用 min-height 确保内容可见
    min-height: 2rem;
    max-height: 31.25rem; // 500px，增加最大高度
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 0.5rem 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    // 确保内容区域始终可见
    display: block;
    visibility: visible;

    @media (max-width: 768px) {
      max-height: 25rem; // 400px
      padding: 0 0.4375rem 0.6875rem;
    }

    @media (max-width: 480px) {
      max-height: 18.75rem; // 300px
      padding: 0 0.375rem 0.625rem;
    }

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  &__text {
    @include markdown-content-compact;
    // 确保文本内容可见
    display: block;
    visibility: visible;
    min-height: 1rem;
    width: 100%;
  }
}
</style>
