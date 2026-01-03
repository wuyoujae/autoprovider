<template>
  <div class="agent-message-item-loading">
    <div class="agent-message-item-loading__text">{{ displayText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  content?: string;
}

const props = defineProps<Props>();

const displayText = computed(() => props.content?.trim() || "正在思考下一步");
</script>

<style lang="scss" scoped>
.agent-message-item-loading {
  width: 100%;
  display: flex;
  flex-direction: column;

  &__text {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.8125rem;
    font-family: "Source Serif 4", serif;
    line-height: 1.6;
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

    @media (max-width: 768px) {
      font-size: 0.75rem;
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
    }
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
