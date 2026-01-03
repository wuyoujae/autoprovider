<template>
  <div class="agent-message-item-deploy" :class="statusClass">
    <div class="agent-message-item-deploy__icon">
      <Loader2 v-if="status === 'loading'" class="animate-spin" />
      <CheckCircle2 v-else-if="status === 'success'" />
      <XCircle v-else-if="status === 'error'" />
      <Info v-else />
    </div>
    <div class="agent-message-item-deploy__content">
      {{ props.content }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-vue-next";

interface Props {
  content: string;
}

const props = withDefaults(defineProps<Props>(), {
  content: "",
});

const status = computed(() => {
  const text = props.content;
  // 优先判断错误状态（避免"部署失败！正在分析问题"被误判为 loading）
  if (text.includes("失败") || text.includes("异常") || text.includes("错误")) {
    return "error";
  }
  // 再判断成功状态
  if (text.includes("成功") || text.includes("完成")) {
    return "success";
  }
  // 最后判断 loading 状态
  if (
    text.includes("开始") ||
    text.includes("正在") ||
    text.includes("部署中")
  ) {
    return "loading";
  }
  return "info";
});

const statusClass = computed(() => {
  return `agent-message-item-deploy--${status.value}`;
});
</script>

<style lang="scss" scoped>
.agent-message-item-deploy {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: fit-content;
  max-width: 100%;
  transition: all 0.3s ease;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;

    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }

  &__content {
    font-size: 0.875rem;
    color: #fff;
    font-family: "Source Serif 4", serif;
    line-height: 1.4;
  }

  // Status styles
  &--loading {
    .agent-message-item-deploy__icon {
      color: #feeede; // 辅助色
    }
  }

  &--success {
    background: rgba(254, 238, 222, 0.1); // 使用辅助色 #FEEEDE 的透明背景
    border-color: rgba(254, 238, 222, 0.2);

    .agent-message-item-deploy__icon {
      color: #feeede; // 辅助色
    }
  }

  &--error {
    background: rgba(253, 196, 196, 0.1); // 使用辅助色 #FDC4C4 的透明背景
    border-color: rgba(253, 196, 196, 0.2);

    .agent-message-item-deploy__icon {
      color: #fdc4c4; // 辅助色 #FDC4C4
    }
  }
}

.animate-spin {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
