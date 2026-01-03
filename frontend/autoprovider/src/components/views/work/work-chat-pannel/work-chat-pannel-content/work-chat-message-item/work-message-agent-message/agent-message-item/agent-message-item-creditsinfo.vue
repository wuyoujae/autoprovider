<template>
  <div class="agent-message-item-creditsinfo">
    <div class="credits-icon-wrapper">
      <component :is="AlertCircle" class="credits-icon" />
    </div>
    <div class="credits-content">
      <h3 class="credits-title">积分不足</h3>
      <p class="credits-desc">
        您的账户积分不足，无法继续进行对话。请前往充值页面获取更多积分以继续使用
        AI 服务。
      </p>
      <Button
        variant="default"
        size="sm"
        class="recharge-button"
        @click="handleRecharge"
      >
        <component :is="Zap" class="button-icon" />
        立即充值
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { AlertCircle, Zap } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

interface Props {
  content?: string;
}

const props = defineProps<Props>();
const router = useRouter();

const handleRecharge = () => {
  router.push({ name: "dashboard-credits" });
};
</script>

<style scoped lang="scss">
.agent-message-item-creditsinfo {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 85, 85, 0.1); // 使用淡红色背景提示警告
  border: 1px solid rgba(255, 85, 85, 0.2);
  border-radius: 0.75rem;
  max-width: 100%;
  width: fit-content;
  align-items: flex-start;
  margin-top: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 85, 85, 0.15);
    border-color: rgba(255, 85, 85, 0.3);
  }

  .credits-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 85, 85, 0.2);
    border-radius: 50%;
    flex-shrink: 0;

    .credits-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #ff5555;
    }
  }

  .credits-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .credits-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #ff5555;
      font-family: "Source Serif 4", serif;
    }

    .credits-desc {
      margin: 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
      max-width: 300px;
    }

    .recharge-button {
      margin-top: 0.5rem;
      align-self: flex-start;
      gap: 0.5rem;
      background-color: #ff5555;

      &:hover {
        background-color: #ff6b6b;
      }

      .button-icon {
        width: 1rem;
        height: 1rem;
      }
    }
  }

  // 响应式调整
  @media (max-width: 480px) {
    padding: 0.75rem;
    gap: 0.75rem;

    .credits-icon-wrapper {
      width: 2rem;
      height: 2rem;

      .credits-icon {
        width: 1rem;
        height: 1rem;
      }
    }

    .credits-content {
      .credits-title {
        font-size: 0.9375rem;
      }
      .credits-desc {
        font-size: 0.8125rem;
      }
    }
  }
}
</style>
