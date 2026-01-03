<template>
  <div class="work-chat-pannel-prompt-function">
    <!-- 左侧：上下文使用情况 -->
    <div class="work-chat-pannel-prompt-function__left">
      <TooltipProvider :delay-duration="200">
        <Tooltip>
          <TooltipTrigger as-child>
            <div class="context-usage">
              <svg
                class="context-usage__circle"
                viewBox="0 0 36 36"
                width="20"
                height="20"
              >
                <path
                  class="context-usage__bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="context-usage__value"
                  :stroke-dasharray="`${contextUsagePercent}, 100`"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span class="context-usage__percent">{{ contextUsagePercent.toFixed(1) }}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent class="token-usage-tooltip" side="top" align="start">
            <span class="token-usage-brief">
              {{ usageHoverText }}
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- 右侧：功能按钮 -->
    <div class="work-chat-pannel-prompt-function__right">
      <TooltipProvider>
    <!-- 上传文件按钮 -->
        <Tooltip>
          <TooltipTrigger as-child>
    <button
              class="work-chat-pannel-prompt-function__icon-button"
      @click="handle_upload_click"
      type="button"
    >
      <Upload :size="18" />
    </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ t("work.chat.uploadFile") }}</p>
          </TooltipContent>
        </Tooltip>

        <!-- 浏览器模式按钮 -->
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="work-chat-pannel-prompt-function__icon-button"
              :class="{ 'is-active': is_browser_mode }"
              @click="toggle_browser_mode"
              type="button"
            >
              <Globe :size="18" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ t("work.chat.browserMode") }}</p>
          </TooltipContent>
        </Tooltip>

    <!-- 发送按钮 / 停止按钮 -->
        <Tooltip>
          <TooltipTrigger as-child>
    <button
      class="work-chat-pannel-prompt-function__send-button"
      @click="handle_send_or_stop"
      type="button"
      :disabled="!can_send && !is_sending"
      :class="{ 'is-sending': is_sending }"
    >
      <Square v-if="is_sending" :size="16" fill="currentColor" />
      <Send v-else :size="18" />
    </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {{ is_sending ? t("work.chat.stop") : t("work.chat.send") }}
              <span class="tooltip-shortcut">(Ctrl + Enter)</span>
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- 确认终止对话框 -->
    <AlertDialog
      :open="show_stop_confirm"
      @update:open="show_stop_confirm = $event"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            t("work.chat.stopConfirmTitle")
          }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t("work.chat.stopConfirmDesc") }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="show_stop_confirm = false">{{
            t("common.cancel")
          }}</AlertDialogCancel>
          <AlertDialogAction @click="confirm_stop">{{
            t("common.confirm")
          }}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { Upload, Send, Square, Globe } from "lucide-vue-next";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import request from "@/api/request";

interface Props {
  prompt_text?: string;
  uploaded_files?: Array<{
    status?: "pending" | "uploading" | "parsing" | "completed" | "error";
  }>;
  is_sending?: boolean;
  session_id?: string;
}

interface TokenUsageData {
  model_token_limit: number;
  total_used_tokens: number;
}

const props = withDefaults(defineProps<Props>(), {
  prompt_text: "",
  uploaded_files: () => [],
  is_sending: false,
  session_id: "",
});

const emit = defineEmits<{
  upload: [files: File[]];
  send: [];
  "stop-session": [];
  "toggle-browser": [enabled: boolean];
}>();

const { t } = useI18n();

// 控制确认对话框显示
const show_stop_confirm = ref(false);
const is_browser_mode = ref(false);

// Token 使用情况
const token_usage = ref<TokenUsageData>({
  model_token_limit: 262144,
  total_used_tokens: 0,
});

const TOKEN_USAGE_POLL_INTERVAL = 7000;
let tokenUsageTimer: number | null = null;

// 上下文使用率（百分比）
const contextUsagePercent = computed(() => {
  const { total_used_tokens, model_token_limit } = token_usage.value;
  if (!model_token_limit || model_token_limit <= 0) return 0;
  const percent = (total_used_tokens / model_token_limit) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
});

const usageHoverText = computed(() => {
  return `${formatTokenShort(token_usage.value.total_used_tokens)}/${formatTokenShort(token_usage.value.model_token_limit)} context used`;
});

// 格式化 token 数量（向上取一位小数）
const formatTokenShort = (count: number): string => {
  if (count >= 1_000_000) {
    const val = Math.ceil((count / 1_000_000) * 10) / 10;
    return `${val.toFixed(1)}m`;
  }
  if (count >= 1_000) {
    const val = Math.ceil((count / 1_000) * 10) / 10;
    return `${val.toFixed(1)}k`;
  }
  return `${Math.ceil(count)}`;
};

// 获取 token 使用情况
const fetchTokenUsage = async () => {
  if (!props.session_id) return;

  try {
    const data = await request({
      url: "workinfo.gettokenusage",
      method: "post",
      data: { session_id: props.session_id },
      showErrorMessage: false,
    });

    if (data) {
      token_usage.value = data as TokenUsageData;
    }
  } catch (error) {
    // 静默处理错误，不影响用户体验
    console.warn("Failed to fetch token usage:", error);
  }
};

const clearTokenUsageTimer = () => {
  if (tokenUsageTimer !== null) {
    clearInterval(tokenUsageTimer);
    tokenUsageTimer = null;
  }
};

const startTokenUsageTimer = () => {
  clearTokenUsageTimer();
  if (!props.session_id) return;
  // 进入会话立即拉取一次
  fetchTokenUsage();
  tokenUsageTimer = window.setInterval(() => {
    fetchTokenUsage();
  }, TOKEN_USAGE_POLL_INTERVAL);
};

// 监听 is_sending 变化，当发送完成时获取 token 使用情况
watch(
  () => props.is_sending,
  (newValue, oldValue) => {
    // 当从发送中变为非发送状态时，获取 token 使用情况
    if (oldValue === true && newValue === false) {
      // 延迟一点时间确保后端已经保存了 token 使用量
      setTimeout(() => {
        fetchTokenUsage();
      }, 1000);
    }
  }
);

// 监听 session_id 变化
watch(
  () => props.session_id,
  (newValue) => {
    if (newValue) {
      startTokenUsageTimer();
    } else {
      clearTokenUsageTimer();
    }
  },
  { immediate: true }
);

// 组件挂载时启动定时拉取
onMounted(() => {
  startTokenUsageTimer();
});

// 判断是否可以发送（有文本或已上传文件，且有会话ID，且不在发送中）
const can_send = computed(() => {
  const has_content =
    (props.prompt_text && props.prompt_text.trim().length > 0) ||
    (props.uploaded_files && props.uploaded_files.length > 0);
  const has_session = props.session_id && props.session_id.trim().length > 0;
  const not_sending = !props.is_sending;
  const all_completed =
    !props.uploaded_files ||
    props.uploaded_files.every(
      (f) => !f.status || f.status === "completed"
    );
  return has_content && has_session && not_sending && all_completed;
});

// 处理上传文件
const handle_upload_click = () => {
  // 创建文件输入框
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.style.display = "none";
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      emit("upload", Array.from(target.files));
    }
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
};

// 切换浏览器模式
const toggle_browser_mode = () => {
  is_browser_mode.value = !is_browser_mode.value;
  emit("toggle-browser", is_browser_mode.value);
};

// 处理发送或停止
const handle_send_or_stop = () => {
  if (props.is_sending) {
    // 如果正在发送，点击则弹出确认框
    show_stop_confirm.value = true;
  } else if (can_send.value) {
    // 否则执行发送
    emit("send");
  }
};

// 确认终止会话
const confirm_stop = () => {
  emit("stop-session");
  show_stop_confirm.value = false;
};

onUnmounted(() => {
  clearTokenUsageTimer();
});
</script>

<style lang="scss" scoped>
.work-chat-pannel-prompt-function {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;

  @media (max-width: 768px) {
    gap: 0.625rem;
    padding: 0.4375rem 0 0 0;
  }

  @media (max-width: 480px) {
    gap: 0.5rem;
    padding: 0.375rem 0 0 0;
  }

  &__left {
    display: flex;
    align-items: center;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 0.75rem;

    @media (max-width: 768px) {
      gap: 0.625rem;
    }

    @media (max-width: 480px) {
      gap: 0.5rem;
    }
  }

  // 上下文圆环
  .context-usage {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    cursor: help;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    transition: background 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &__circle {
      transform: rotate(-90deg);
    }

    &__bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 3;
    }

    &__value {
      fill: none;
      stroke: #feeede;
      stroke-width: 3;
      transition: stroke-dasharray 0.3s ease;
    }

    &__percent {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-family: "Source Serif 4", serif;
    }
  }

  &__icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: transparent;
    border: none;
    border-radius: 0.625rem;
    color: #fff;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;

    &:hover {
      background: rgba(254, 238, 222, 0.15);
      transform: translateY(-0.0625rem);
    }

    &:active {
      transform: translateY(0);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(254, 238, 222, 0.2);
    }

    &.is-active {
      color: #feeede;
      background: rgba(254, 238, 222, 0.1);
    }

    @media (max-width: 768px) {
      width: 2.375rem;
      height: 2.375rem;
      border-radius: 0.5625rem;
    }

    @media (max-width: 480px) {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
    }
  }

  &__send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: #feeede;
    border: none;
    border-radius: 0.625rem;
    color: #242429;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 0 0 rgba(254, 238, 222, 0.3);
    padding: 0;

    &:hover:not(:disabled) {
      background: rgba(253, 196, 196, 0.925);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(254, 238, 222, 0.2);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(254, 238, 222, 0.3);
    }

    &:disabled {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
      transition: none;

      &:hover {
        transform: none;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 0 rgba(254, 238, 222, 0.3);
      }
    }

    // 正在发送状态下的样式
    &.is-sending {
      background: #feeede;
      color: #242429;

      &:hover {
        background: #ffcfcf; // 稍微变红一点表示停止
      }
    }

    @media (max-width: 768px) {
      width: 2.375rem;
      height: 2.375rem;
      border-radius: 0.5625rem;
    }

    @media (max-width: 480px) {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
    }
  }
}

.tooltip-shortcut {
  opacity: 0.7;
  font-size: 0.8em;
  margin-left: 0.5rem;
}

// Token 使用情况 Tooltip 样式
:deep(.token-usage-tooltip) {
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

// Token 使用情况卡片样式
.token-usage-card {
  width: 14rem;
  padding: 0;
  background: #2a2a30;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  &__header {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #feeede;
    font-family: "Source Serif 4", serif;
  }

  &__content {
    padding: 0.625rem 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__section {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
  }

  &__value {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #fff;
    font-family: "Source Serif 4", serif;

    &--highlight {
      color: #feeede;
      font-size: 0.875rem;
      font-weight: 600;
    }
  }

  &__details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-left: 0.5rem;
  }

  &__detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__detail-label {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.45);
  }

  &__detail-value {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    font-family: "Source Serif 4", serif;
  }

  &__divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 0.125rem 0;
  }

  &__progress {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__progress-bar {
    height: 0.25rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.125rem;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #feeede 0%, #fdc4c4 100%);
    border-radius: 0.125rem;
    transition: width 0.3s ease;
  }

  &__progress-text {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: right;
  }
}
</style>
