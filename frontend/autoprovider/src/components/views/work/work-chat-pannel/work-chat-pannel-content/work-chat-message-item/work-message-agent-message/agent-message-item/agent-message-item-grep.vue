<template>
  <div class="agent-message-item-grep">
    <button
      class="agent-message-item-grep__button"
      type="button"
      :class="{
        'agent-message-item-grep__button--running': status === 'running',
      }"
    >
      <FileSearch class="agent-message-item-grep__icon" />
      <span class="agent-message-item-grep__text">{{ displayContent }}</span>
      <ChevronRight class="agent-message-item-grep__arrow" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FileSearch, ChevronRight } from "lucide-vue-next";
import { decodeHtmlEntities } from "@/utils/messageParse/characterParsing";

interface Props {
  content: string;
  status?: "running" | "completed";
}

const props = withDefaults(defineProps<Props>(), {
  status: "running",
});

const displayContent = computed(() => {
  if (!props.content) {
    return "-";
  }
  return decodeHtmlEntities(props.content);
});
</script>

<style lang="scss" scoped>
.agent-message-item-grep {
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

    &:hover .agent-message-item-grep__text {
      color: rgba(255, 255, 255, 0.9);
    }

    &--running {
      .agent-message-item-grep__text {
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
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    text-align: left;
    transition: color 0.3s ease;

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
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
</style>
