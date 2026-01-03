<template>
  <div class="agent-message-item-ran">
    <button
      class="agent-message-item-ran__button"
      type="button"
      :class="{
        'agent-message-item-ran__button--running': status === 'running',
      }"
    >
      <Terminal class="agent-message-item-ran__icon" />
      <span class="agent-message-item-ran__text">
        <span class="agent-message-item-ran__label">进行命令行操作：</span>
        <span class="agent-message-item-ran__command">{{ content }}</span>
      </span>
      <ChevronRight class="agent-message-item-ran__arrow" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Terminal, ChevronRight } from "lucide-vue-next";

interface Props {
  content: string;
  status?: "running" | "completed";
}

withDefaults(defineProps<Props>(), {
  status: "running",
});
</script>

<style lang="scss" scoped>
.agent-message-item-ran {
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

    &:hover .agent-message-item-ran__text {
      color: rgba(255, 255, 255, 0.9);
    }

    @media (max-width: 768px) {
      padding: 0.5625rem 0.4375rem;
      gap: 0.5625rem;
    }

    @media (max-width: 480px) {
      padding: 0.5rem 0.375rem;
      gap: 0.5rem;
    }

    &--running {
      .agent-message-item-ran__text {
        animation: shimmer 2s infinite;
      }
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
    color: rgba(255, 255, 255, 0.6);
  }

  &__command {
    color: rgba(255, 255, 255, 0.6);
    font-family: "JetBrains Mono", "Courier New", monospace;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
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
</style>
