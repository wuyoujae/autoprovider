<template>
  <div class="work-chat-pannel-prompt">
    <!-- 资料预览区 -->
    <WorkChatPannelPromptFilepreviews
      :files="uploaded_files"
      @remove="handle_remove_file"
    />

    <!-- 输入区 -->
    <WorkChatPannelPromptInput v-model="prompt_text" @submit="handle_send" />

    <!-- 功能区 -->
    <WorkChatPannelPromptFunction
      :prompt_text="prompt_text"
      :uploaded_files="uploaded_files"
      :is_sending="is_sending"
      :session_id="session_id"
      @upload="handle_upload"
      @send="handle_send"
      @stop-session="handle_stop_session"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import WorkChatPannelPromptFilepreviews from "./work-chat-pannel-prompt-compose/work-chat-pannel-prompt-filepreviews.vue";
import WorkChatPannelPromptInput from "./work-chat-pannel-prompt-compose/work-chat-pannel-prompt-input.vue";
import WorkChatPannelPromptFunction from "./work-chat-pannel-prompt-compose/work-chat-pannel-prompt-function.vue";
import request from "@/api/request";
import axios from "axios";

interface Props {
  session_id?: string;
  is_sending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  session_id: "",
  is_sending: false,
});

const emit = defineEmits<{
  "send-message": [
    prompt: string,
    sourceLists: Array<{
      source_id: string;
      source_name: string;
      source_type: string;
    }>
  ];
  "stop-session": [];
}>();

const { t } = useI18n();

// 输入文本
const prompt_text = ref("");

// 上传的文件列表（带解析结果元数据）
type UploadStatus = "pending" | "uploading" | "parsing" | "completed" | "error";
interface UploadedFile {
  file: File;
  source_id?: string;
  source_url?: string;
  source_type?: string;
  source_name?: string;
  file_size?: number | string;
  status: UploadStatus;
  progress: number;
  error_message?: string;
  cancelSource?: any;
}

const uploaded_files = ref<UploadedFile[]>([]);

const all_files_completed = computed(() => {
  if (uploaded_files.value.length === 0) return true;
  return uploaded_files.value.every((f) => f.status === "completed");
});

// 移除文件并取消后端状态
const handle_remove_file = async (index: number) => {
  const file = uploaded_files.value[index];
  if (!file) return;

  // 1) 取消正在进行的上传/解析请求
  file.cancelSource?.cancel("用户取消");

  // 2) 后端已生成的附件，通知取消
  if (file.source_id) {
    try {
      await request({
        url: "inter.cancel_source",
        method: "post",
        data: { source_id: file.source_id },
        showErrorMessage: false,
      });
    } catch (e) {
      console.warn("取消远端附件失败:", e);
    }
  }

  // 3) 移除本地记录
  uploaded_files.value.splice(index, 1);
};

// 上传并解析单个文件
const upload_and_parse_file = async (file_item: UploadedFile) => {
  try {
    file_item.status = "uploading";
    file_item.progress = 0;

    if (!file_item.cancelSource) {
      file_item.cancelSource = axios.CancelToken.source();
    }

    const form_data = new FormData();
    form_data.append("files", file_item.file);
    if (props.session_id) {
      form_data.append("session_id", props.session_id);
    }

    const result = await request({
      url: "inter.upload_and_parse",
      method: "post",
      data: form_data,
      showSuccessMessage: false,
      showErrorMessage: true,
      cancelToken: file_item.cancelSource.token,
    });

    file_item.status = "parsing";
    file_item.progress = 50;

    if (result && Array.isArray(result) && result.length > 0) {
      const parsed_file = result[0];
      file_item.source_id = parsed_file.source_id;
      file_item.source_url = parsed_file.source_url || "";
      file_item.source_type = parsed_file.source_type || "";
      file_item.source_name =
        parsed_file.source_name || file_item.file.name || "";
      file_item.file_size = parsed_file.file_size || file_item.file.size;
      file_item.status = "completed";
      file_item.progress = 100;
    } else {
      throw new Error("解析结果格式错误");
    }
  } catch (error: any) {
    console.error(`文件 ${file_item.file.name} 上传解析失败:`, error);
    file_item.status = "error";
    file_item.error_message = error.message || "上传解析失败";
    throw error;
  }
};

// 上传并解析所有待处理文件
const upload_all_files = async () => {
  const pending_files = uploaded_files.value.filter(
    (f) => f.status === "pending" || f.status === "error"
  );
  if (pending_files.length === 0) return true;
  try {
    await Promise.all(pending_files.map((f) => upload_and_parse_file(f)));
    return true;
  } catch (e) {
    return false;
  }
};

// 获取未绑定的附件（当前 session）
const fetch_unbound_files = async () => {
  if (!props.session_id) return;
  try {
    const data = await request({
      url: "inter.unbound_sources",
      method: "get",
      params: { session_id: props.session_id, limit: 50 },
      showErrorMessage: false,
      showSuccessMessage: false,
    });
    if (!Array.isArray(data)) return;

    const existingIds = new Set(
      uploaded_files.value.map((f) => f.source_id).filter(Boolean) as string[]
    );

    const mapped: UploadedFile[] = data
      .filter(
        (item: any) => item?.source_id && !existingIds.has(item.source_id)
      )
      .map((item: any) => {
        const filename =
          item.source_name ||
          item.source_url?.split("/").pop() ||
          `${item.source_id}.${item.source_type || "file"}`;
        const sizeNum =
          item.file_size !== undefined && item.file_size !== null
            ? Number(item.file_size)
            : 0;
        const placeholder = new File([""], filename);
        return {
          file: placeholder,
          source_id: item.source_id,
          source_url: item.source_url || "",
          source_type: item.source_type || "",
          source_name: filename,
          file_size: sizeNum,
          status: "completed",
          progress: 100,
        };
      });
    if (mapped.length > 0) {
      uploaded_files.value.push(...mapped);
    }
  } catch (error) {
    console.error("获取未绑定附件失败:", error);
  }
};

onMounted(() => {
  fetch_unbound_files();
});

watch(
  () => props.session_id,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      uploaded_files.value = [];
      fetch_unbound_files();
    }
  }
);

// 处理文件上传（从子组件传入文件列表）
const handle_upload = (files: File[]) => {
  if (!files || files.length === 0) return;
  const wrapped = files.map((f) => ({
    file: f,
    status: "pending" as UploadStatus,
    progress: 0,
    cancelSource: undefined as any,
  }));
  uploaded_files.value.push(...wrapped);
  // 自动上传
  upload_all_files();
};

// 处理发送
const handle_send = async () => {
  // 检查是否有选中的会话
  if (!props.session_id) {
    console.warn("没有选中的会话，无法发送消息");
    return;
  }

  // 检查消息内容是否为空
  if (!prompt_text.value.trim()) {
    console.warn("消息内容为空，无法发送");
    return;
  }

  // 检查是否有未完成的附件上传
  if (!all_files_completed.value) {
    console.warn("存在未完成上传/解析的附件，无法发送");
    return;
  }

  // 检查是否正在发送
  if (props.is_sending) {
    console.warn("正在发送消息，请稍候");
    return;
  }

  // 确保附件已上传成功
  const upload_ok = await upload_all_files();
  if (!upload_ok) {
    console.warn("存在未成功上传的附件，已终止发送");
    return;
  }

  // 发送消息
  const message_content = prompt_text.value.trim();
  const sourceLists =
    uploaded_files.value
      .filter((f) => f.status === "completed" && f.source_id)
      .map((f) => ({
        source_id: f.source_id as string,
        source_name: f.source_name || f.file.name,
        source_type: f.source_type || f.file.type || "",
      })) || [];
  emit("send-message", message_content, sourceLists);

  // 清空输入框与附件列表
  prompt_text.value = "";
  uploaded_files.value = [];
};

// 处理停止会话
const handle_stop_session = () => {
  emit("stop-session");
};

// 监听 is_sending 变化，当发送完成时可以做一些处理
watch(
  () => props.is_sending,
  (newValue) => {
    // 可以在这里添加发送状态变化的处理逻辑
    if (!newValue) {
      // 发送完成，可以做一些清理工作
    }
  }
);
</script>

<style lang="scss" scoped>
.work-chat-pannel-prompt {
  width: 95%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(1rem);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;

  // 隐藏滚动条但保留滚动功能
  &::-webkit-scrollbar {
    display: none;
  }

  -ms-overflow-style: none;
  scrollbar-width: none;

  @media (max-width: 768px) {
    padding: 0.875rem;
    gap: 0.625rem;
    max-height: 45vh;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
    gap: 0.5rem;
    border-radius: 0.875rem;
    max-height: 40vh;
  }

  // 文件预览区的mask效果（底部渐变，与输入区域形成过渡）
  :deep(.work-chat-pannel-prompt-filepreviews) {
    position: relative;
    mask-image: linear-gradient(
      to bottom,
      black 0%,
      black calc(100% - 30px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      black calc(100% - 30px),
      transparent 100%
    );
  }
}
</style>
