<template>
  <div class="agent-message-item-create">
    <button
      class="agent-message-item-create__button"
      type="button"
      :class="{
        'agent-message-item-create__button--running': status === 'running',
      }"
    >
      <FilePlus class="agent-message-item-create__icon" />
      <span class="agent-message-item-create__text">
        <span class="agent-message-item-create__label">{{ actionLabel }}</span>
        <span
          class="agent-message-item-create__file"
          :title="fullPath"
          @click.stop="handleFileClick"
        >
          {{ displayPath }}
        </span>
      </span>
      <ChevronRight class="agent-message-item-create__arrow" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FilePlus, ChevronRight } from "lucide-vue-next";
import { decodeHtmlEntities } from "@/utils/messageParse/characterParsing";

interface Props {
  content: string;
  status?: "running" | "completed";
}

const props = withDefaults(defineProps<Props>(), {
  status: "running",
});

const emit = defineEmits<{
  (e: "open-file", filePath: string): void;
}>();

const parsedPayload = computed(() => {
  if (!props.content) {
    return null;
  }

  try {
    const decoded = decodeHtmlEntities(props.content);
    return JSON.parse(decoded);
  } catch (error) {
    console.warn("[AgentMessageItemCreate] 解析内容失败:", error);
    return null;
  }
});

const fullPath = computed(() => {
  if (parsedPayload.value?.path) {
    return parsedPayload.value.path;
  }
  if (!props.content) {
    return "-";
  }
  const decoded = decodeHtmlEntities(props.content);
  return decoded.startsWith("/") ? decoded : `/${decoded}`;
});

const displayPath = computed(() => {
  const pathValue = fullPath.value;
  if (!pathValue || pathValue === "-") {
    return "-";
  }
  const segments = pathValue.split("/").filter((segment: string) => segment);
  if (segments.length === 0) {
    return pathValue;
  }
  return segments[segments.length - 1];
});

const isFolder = computed(() => parsedPayload.value?.type === "folder");

const actionLabel = computed(() => {
  return isFolder.value ? "创建文件夹" : "创建文件";
});

const handleFileClick = () => {
  if (!fullPath.value || fullPath.value === "-") {
    return;
  }
  emit("open-file", fullPath.value);
};
</script>

<style lang="scss" scoped>
.agent-message-item-create {
  width: 100%;
  display: flex;
  flex-direction: column;

  &__button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover .agent-message-item-create__text {
      color: rgba(255, 255, 255, 0.9);
    }

    &--running {
      .agent-message-item-create__text {
        animation: shimmer 2s infinite;
      }
    }

    @media (max-width: 768px) {
      padding: 0.5625rem 0.4375rem;
      gap: 0.5625rem;
    }

    @media (max-width: 480px) {
      padding: 0.5rem 0.375rem;
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

  &__text {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: rgba(255, 255, 255, 0.75);
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    text-align: left;
    transition: color 0.3s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__label {
    color: rgba(255, 255, 255, 0.45);
    animation: shimmer-loading 2.5s ease-in-out infinite;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0.45) 50%,
      rgba(255, 255, 255, 0.25) 100%
    );
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__file {
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: #feeede;
    }
  }

  &__arrow {
    width: 0.875rem;
    height: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }

    @media (max-width: 480px) {
      width: 0.75rem;
      height: 0.75rem;
    }
  }
}

@keyframes shimmer {
  0%,
  100% {
    color: rgba(255, 255, 255, 0.7);
  }
  50% {
    color: rgba(254, 238, 222, 0.9);
  }
}

@keyframes shimmer-loading {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
