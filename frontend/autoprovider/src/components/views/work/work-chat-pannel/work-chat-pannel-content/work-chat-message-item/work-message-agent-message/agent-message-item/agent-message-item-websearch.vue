<template>
  <div class="agent-message-item-websearch">
    <button
      class="agent-message-item-websearch__button"
      type="button"
      :class="{
        'agent-message-item-websearch__button--running': currentStatus === 'running',
      }"
    >
      <Search class="agent-message-item-websearch__icon" />
      <span class="agent-message-item-websearch__text">
        <span class="agent-message-item-websearch__label">Web Search</span>
        <span class="agent-message-item-websearch__content">{{ content }}</span>
      </span>
      <ChevronRight class="agent-message-item-websearch__arrow" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Search, ChevronRight } from "lucide-vue-next";

interface Props {
  content: string;
  status?: "running" | "completed";
}

const props = withDefaults(defineProps<Props>(), {
  status: "running",
});

const currentStatus = computed(() => {
  // 若父级未显式传递，则根据文案简单推断完成态
  if (props.status) return props.status;
  if (props.content?.includes("完成")) return "completed";
  return "running";
});
</script>

<style lang="scss" scoped>
.agent-message-item-websearch {
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

    &:hover .agent-message-item-websearch__text {
      color: rgba(255, 255, 255, 0.9);
    }

    &--running {
      .agent-message-item-websearch__text {
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

  &__content {
    color: rgba(255, 255, 255, 0.55);
    overflow: hidden;
    text-overflow: ellipsis;
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

