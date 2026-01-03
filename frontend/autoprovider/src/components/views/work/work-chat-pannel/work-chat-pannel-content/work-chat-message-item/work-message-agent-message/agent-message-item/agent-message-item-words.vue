<template>
  <div class="agent-message-item-words">
    <div class="agent-message-item-words__text" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { decodeHtmlEntities } from "@/utils/messageParse/characterParsing";
import { renderMarkdown } from "@/utils/markdown";

interface Props {
  content: string;
}

const props = defineProps<Props>();

// 调试日志：组件创建
console.log("[Words组件] 组件创建，content:", props.content);
console.log("[Words组件] content 类型:", typeof props.content);
console.log("[Words组件] content 长度:", props.content?.length || 0);

// 检测是否为历史消息（不包含 OVERFLAG）
const isHistoryMessage = computed(() => {
  return props.content && !props.content.includes("OVERFLAG");
});

// 解析内容，提取实际内容和结束标志
const parsedData = computed(() => {
  console.log("[Words组件] 解析数据，原始 content:", props.content);

  if (!props.content) {
    console.warn("[Words组件] 警告: content 为空");
    return {
      wordsContent: "",
      isFinished: false,
      isHistory: false,
    };
  }

  // 如果是历史消息（不包含 OVERFLAG），直接使用整个 content 作为内容
  if (isHistoryMessage.value) {
    console.log("[Words组件] 检测到历史消息格式");
    return {
      wordsContent: props.content,
      isFinished: true,
      isHistory: true,
    };
  }

  // 实时消息格式：可能包含 OVERFLAG 标志
  // 检查是否包含 OVERFLAG（可能在末尾，也可能在内容中）
  const overFlagIndex = props.content.indexOf("OVERFLAG");
  const hasOverFlag = overFlagIndex !== -1;

  const result = {
    wordsContent: hasOverFlag
      ? props.content.substring(0, overFlagIndex).trim()
      : props.content,
    isFinished: hasOverFlag,
    isHistory: false,
  };

  console.log("[Words组件] 解析结果:", result);
  return result;
});

const wordsContent = computed(() => parsedData.value.wordsContent);
const isFinished = computed(() => parsedData.value.isFinished);

// 渲染后的内容（解码 + Markdown 渲染）
const renderedContent = computed(() => {
  if (!wordsContent.value) {
    return "";
  }
  // 先解码 HTML 实体，再进行 Markdown 渲染
  const decoded = decodeHtmlEntities(wordsContent.value);
  return renderMarkdown(decoded);
});
</script>

<style lang="scss" scoped>
@use "@/styles/markdown-content.scss" as *;

.agent-message-item-words {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &__text {
    @include markdown-content-base;
    margin: 0;
  }
}
</style>
