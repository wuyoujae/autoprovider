<script setup lang="ts">
import { computed } from "vue";
import { useMessageStore, type MessageType } from "@/stores/message";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Terminal, CheckCircle2, AlertCircle, Info, X } from "lucide-vue-next";

const messageStore = useMessageStore();

// 获取图标组件
const getIcon = (type: MessageType) => {
  switch (type) {
    case "success":
      return CheckCircle2;
    case "error":
      return AlertCircle;
    case "warning":
      return AlertCircle;
    case "info":
      return Info;
    default:
      return Terminal;
  }
};

// 获取 Alert 样式变体
const getAlertVariant = (type: MessageType) => {
  return type === "error" || type === "warning" ? "destructive" : "default";
};

// 获取图标颜色类
const getIconColorClass = (type: MessageType) => {
  switch (type) {
    case "success":
      return "text-green-600";
    case "error":
      return "text-red-600";
    case "warning":
      return "text-orange-600";
    case "info":
      return "text-blue-600";
    default:
      return "text-gray-600";
  }
};
</script>

<template>
  <!-- Alert 消息容器 - 右上角 -->
  <div class="global_message__container">
    <TransitionGroup name="message" tag="div" class="global_message__list">
      <div
        v-for="alert_item in messageStore.alerts"
        :key="alert_item.id"
        class="global_message__alert"
        :class="`global_message__alert--${alert_item.type}`"
      >
        <div class="global_message__alert_icon">
          <component :is="getIcon(alert_item.type)" :size="20" />
        </div>
        <div class="global_message__alert_content">
          <div v-if="alert_item.title" class="global_message__alert_title">
            {{ alert_item.title }}
          </div>
          <div class="global_message__alert_description">
            {{ alert_item.description }}
          </div>
        </div>
        <button
          class="global_message__alert_close"
          @click="messageStore.removeAlert(alert_item.id)"
        >
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>

  <!-- Alert Dialog 消息 - 中间 -->
  <AlertDialog
    v-for="dialog in messageStore.dialogs"
    :key="dialog.id"
    :open="true"
  >
    <AlertDialogContent class="global_message__dialog">
      <AlertDialogHeader>
        <AlertDialogTitle class="global_message__dialog_title">
          <component
            :is="getIcon(dialog.type)"
            :size="24"
            :class="`global_message__dialog_icon--${dialog.type}`"
          />
          {{ dialog.title }}
        </AlertDialogTitle>
        <AlertDialogDescription class="global_message__dialog_description">
          {{ dialog.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter class="global_message__dialog_footer">
        <AlertDialogCancel
          v-if="dialog.showCancel"
          class="global_message__dialog_button global_message__dialog_button--cancel"
          @click="messageStore.handleDialogAction(dialog.id, false)"
        >
          {{ dialog.cancelText || "取消" }}
        </AlertDialogCancel>
        <AlertDialogAction
          class="global_message__dialog_button global_message__dialog_button--confirm"
          @click="messageStore.handleDialogAction(dialog.id, true)"
        >
          {{ dialog.confirmText || "确定" }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<style lang="scss" scoped>
.global_message {
  &__container {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 24rem;
    pointer-events: none;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__alert {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    font-family: "Source Serif 4", serif;
    transition: all 0.3s ease;

    // &:hover {
    //   background: rgba(255, 255, 255, 0.08);
    //   border-color: rgba(254, 238, 222, 0.3);
    //   box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    //   transform: translateX(-4px);
    // }

    // &--success {
    //   border-left: 3px solid #22c55e;
    // }

    // &--error {
    //   border-left: 3px solid #ef4444;
    // }

    // &--warning {
    //   border-left: 3px solid #fbbf24;
    // }

    // &--info {
    //   border-left: 3px solid #feeede;
    // }
  }

  &__alert_icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
    color: #242429;

    .global_message__alert--success & {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .global_message__alert--error & {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .global_message__alert--warning & {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .global_message__alert--info & {
      background: rgba(254, 238, 222, 0.2);
      color: #feeede;
    }
  }

  &__alert_content {
    flex: 1;
    min-width: 0;
  }

  &__alert_title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.25rem;
    line-height: 1.4;
  }

  &__alert_description {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
  }

  &__alert_close {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
}

/* 进入和离开动画 */
.message-enter-active {
  animation: slideInRight 0.3s ease-out;
}

.message-leave-active {
  animation: slideOutRight 0.3s ease-in;
}

.message-move {
  transition: all 0.3s ease;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

:global(.global_message__dialog[data-slot="alert-dialog-content"]) {
  background: #242429;
  border: 1px solid rgba(254, 238, 222, 0.2);
  font-family: "Source Serif 4", serif;
  max-width: 28rem;
  color: #fff;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

:global(.global_message__dialog_title) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}

:global(.global_message__dialog_icon--success) {
  color: #22c55e;
}

:global(.global_message__dialog_icon--error) {
  color: #ef4444;
}

:global(.global_message__dialog_icon--warning) {
  color: #fbbf24;
}

:global(.global_message__dialog_icon--info) {
  color: #feeede;
}

:global(.global_message__dialog_description) {
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
  margin-top: 0.5rem;
}

:global(.global_message__dialog_footer) {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

:global(.global_message__dialog_button) {
  flex: 1;
  padding: 0.625rem 1.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: color 0.2s ease;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
}

:global(.global_message__dialog_button--cancel) {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

:global(.global_message__dialog_button--confirm) {
  background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
  color: #242429;
  border: none;
}

:global(.global_message__dialog_button:hover) {
  color: #feeede;
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .global_message {
    &__container {
      top: 1rem;
      right: 1rem;
      left: 1rem;
      max-width: none;
    }

    &__alert {
      padding: 0.875rem 1rem;
      gap: 0.75rem;
    }

    &__alert_title {
      font-size: 0.875rem;
    }

    &__alert_description {
      font-size: 0.75rem;
    }

    &__dialog {
      max-width: calc(100vw - 2rem);
    }
  }
}

@media (max-width: 480px) {
  .global_message {
    &__container {
      top: 0.75rem;
      right: 0.75rem;
      left: 0.75rem;
    }

    &__alert {
      padding: 0.75rem;
    }
  }

  :global(.global_message__dialog_button) {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}
</style>
