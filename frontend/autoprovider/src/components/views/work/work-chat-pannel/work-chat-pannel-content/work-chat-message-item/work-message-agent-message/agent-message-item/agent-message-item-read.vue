<template>
  <div class="agent-message-item-read">
    <button
      class="agent-message-item-read__button"
      type="button"
      :class="{
        'agent-message-item-read__button--running': status === 'running',
      }"
    >
      <FileText class="agent-message-item-read__icon" />
      <span class="agent-message-item-read__text">
        <span class="agent-message-item-read__prefix">阅读文件</span>
        <span
          class="agent-message-item-read__file"
          :title="fullFilePath"
          @click.stop="handleFileClick"
        >
          {{ displayFileName }}
        </span>
      </span>
      <ChevronRight class="agent-message-item-read__arrow" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FileText, ChevronRight } from "lucide-vue-next";

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

const fullFilePath = computed(() => {
  if (!props.content) {
    return "-";
  }
  return props.content.startsWith("/") ? props.content : `/${props.content}`;
});

const displayFileName = computed(() => {
  if (!props.content) {
    return "-";
  }
  const segments = fullFilePath.value.split("/").filter((segment) => segment);
  return segments.length > 0
    ? segments[segments.length - 1]
    : fullFilePath.value;
});

const handleFileClick = () => {
  if (!props.content) {
    return;
  }
  emit("open-file", fullFilePath.value);
};
</script>

<style lang="scss" scoped>
.agent-message-item-read {
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

    &:hover .agent-message-item-read__text {
      color: rgba(255, 255, 255, 0.9);
    }

    &--running {
      .agent-message-item-read__text {
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
    color: rgba(146, 146, 146, 0.4);
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

  &__prefix {
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
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    word-break: keep-all;
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
