<template>
  <div class="work-chat-pannel-head">
    <!-- 会话选择器 -->
    <Select
      :model-value="selected_session_id || ''"
      @update:model-value="handle_session_change as any"
    >
      <SelectTrigger class="work-chat-pannel-head__session-trigger">
        <MessageSquare class="work-chat-pannel-head__session-icon" />
        <span class="work-chat-pannel-head__session-text">
          {{ selected_session_title || t("work.chat.conversation.createNew") }}
        </span>
      </SelectTrigger>
      <SelectContent>
        <!-- 新建对话选项（第一个） -->
        <SelectItem value="new" class="work-chat-pannel-head__new-item">
          <Plus class="work-chat-pannel-head__new-icon" />
          <span>{{ t("work.chat.conversation.createNew") }}</span>
        </SelectItem>
        <!-- 分隔线 -->
        <SelectSeparator v-if="session_list.length > 0" />
        <!-- 已有会话列表 -->
        <SelectItem
          v-for="session in session_list"
          :key="session.session_id"
          :value="session.session_id"
        >
          <span>{{ session.session_title }}</span>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { MessageSquare, Plus } from "lucide-vue-next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from "@/components/ui/select";
import { useUserStore } from "@/stores/user";
import request from "@/api/request";

// 会话列表接口类型
interface Session {
  session_id: string;
  project_id: string;
  session_title: string;
  session_status: number;
  create_time: string;
}

interface Props {
  session_list?: Session[];
  project_id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  session_list: () => [],
  project_id: "",
});

const { t } = useI18n();
const user_store = useUserStore();

// Emits
const emit = defineEmits<{
  "create-conversation": [];
  "session-change": [sessionId: string];
  "session-created": [sessionId: string];
}>();

const selected_session_id = ref<string>("");

// 当前选中的会话标题
const selected_session_title = computed(() => {
  if (!selected_session_id.value) {
    return "";
  }
  const session = props.session_list.find(
    (s) => s.session_id === selected_session_id.value
  );
  return session?.session_title || "";
});

// 创建新会话
const create_session = async () => {
  const user_id = user_store.user_info?.user_id;
  const projectId = props.project_id;

  if (!user_id || !projectId) {
    console.warn("缺少user_id或project_id，无法创建会话");
    return;
  }

  try {
    const result = await request({
      url: "session.createSession",
      method: "post",
      data: {
        user_id,
        project_id: projectId,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result && result.session_id) {
      // 先设置选中的会话ID
      selected_session_id.value = result.session_id;
      // 触发创建会话事件（清空内容区）
      emit("create-conversation");
      // 触发会话创建成功事件，传递 sessionId（会触发刷新列表和切换会话）
      emit("session-created", result.session_id);
      // 触发会话切换事件
      emit("session-change", result.session_id);
    }
  } catch (error) {
    console.error("创建会话失败:", error);
  }
};

// 处理会话切换
const handle_session_change = (value: string | number | null | undefined) => {
  // 只处理字符串类型的值
  if (typeof value === "string" && value) {
    // 如果选择的是"新建对话"
    if (value === "new") {
      create_session();
      // 保持当前选中的会话ID不变
      return;
    }
    // 选择已有会话
    selected_session_id.value = value;
    emit("session-change", value);
  }
};

// 监听 session_list 变化，默认选择第一个会话
watch(
  () => props.session_list,
  (newSessionList) => {
    // 如果有会话列表且当前没有选中会话，默认选择第一个
    if (
      newSessionList &&
      newSessionList.length > 0 &&
      !selected_session_id.value
    ) {
      const firstSession = newSessionList[0];
      if (firstSession && firstSession.session_id) {
        selected_session_id.value = firstSession.session_id;
        emit("session-change", firstSession.session_id);
      }
    }
  },
  { immediate: true }
);

// 监听 session_list 更新，如果当前选中的会话ID在列表中，确保选中状态正确
watch(
  () => props.session_list,
  (newSessionList) => {
    // 如果当前有选中的会话ID，检查它是否在新列表中
    if (
      selected_session_id.value &&
      newSessionList &&
      newSessionList.length > 0
    ) {
      const currentSession = newSessionList.find(
        (s) => s.session_id === selected_session_id.value
      );
      // 如果当前选中的会话不在列表中，说明可能是新创建的会话，列表还未刷新
      // 这种情况下不需要做任何操作，因为已经在创建时设置了选中状态
    }
  }
);
</script>

<style lang="scss" scoped>
.work-chat-pannel-head {
  width: 100%;
  height: 3rem;
  display: flex;
  align-items: center;
  padding: 0.5rem 1.5rem;
  background: transparent;
  border: none;

  @media (max-width: 768px) {
    padding: 0.375rem 1.25rem;
  }

  @media (max-width: 480px) {
    padding: 0.375rem 1rem;
  }

  &__session-trigger {
    min-width: 12rem;
    max-width: 20rem;
    height: 2rem;
    padding: 0.375rem 0.75rem !important;
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 0.375rem !important;
    color: rgba(255, 255, 255, 0.6) !important;
    font-size: 0.8125rem !important;
    font-family: "Source Serif 4", serif !important;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;

    @media (max-width: 480px) {
      min-width: 8rem;
      max-width: 12rem;
      padding: 0.25rem 0.5rem !important;
      font-size: 0.75rem !important;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.05) !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
      color: rgba(255, 255, 255, 0.8) !important;
    }

    &:focus {
      outline: none;
      border-color: rgba(254, 238, 222, 0.3) !important;
      box-shadow: 0 0 0 2px rgba(254, 238, 222, 0.1) !important;
    }
  }

  &__session-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: currentColor;

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__session-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Source Serif 4", serif;
  }

  &__new-item {
    color: #feeede !important;
    font-weight: 500 !important;

    &:hover {
      background: rgba(254, 238, 222, 0.1) !important;
      color: #feeede !important;
    }

    &[data-highlighted] {
      background: rgba(254, 238, 222, 0.15) !important;
      color: #feeede !important;
    }
  }

  &__new-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: currentColor;
  }
}
</style>

<style lang="scss">
// 全局样式覆盖，修复 shadcn select 背景色和下拉面板样式
[data-slot="select-content"] {
  background: linear-gradient(
    135deg,
    rgba(36, 36, 41, 0.98) 0%,
    rgba(36, 36, 41, 0.95) 100%
  ) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 0.75rem !important;
  color: #fff !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(254, 238, 222, 0.05) !important;
  backdrop-filter: blur(1rem) !important;
  outline: none !important;

  &::-webkit-scrollbar {
    width: 0.375rem !important;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03) !important;
    border-radius: 0.25rem !important;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(254, 238, 222, 0.2) !important;
    border-radius: 0.25rem !important;
    transition: background 0.2s ease !important;

    &:hover {
      background: rgba(254, 238, 222, 0.35) !important;
    }
  }
}

// 覆盖 select item 的样式
[data-slot="select-item"] {
  color: rgba(255, 255, 255, 0.85) !important;
  background: transparent !important;
  border-radius: 0.375rem !important;
  padding: 0.375rem 0.75rem !important;
  margin: 0 !important;
  height: 2rem !important;
  transition: color 0.2s ease !important;
  font-size: 0.8125rem !important;
  font-family: "Source Serif 4", serif !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  outline: none !important;

  &:hover {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #fff !important;
  }

  &[data-highlighted] {
    background: rgba(254, 238, 222, 0.12) !important;
    color: #feeede !important;
  }

  &[data-disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
    height: auto !important;
  }
}

// 覆盖 select separator 的样式
[data-slot="select-separator"] {
  height: 1px !important;
  background: rgba(255, 255, 255, 0.08) !important;
  margin: 0.25rem 0.75rem !important;
}
</style>
