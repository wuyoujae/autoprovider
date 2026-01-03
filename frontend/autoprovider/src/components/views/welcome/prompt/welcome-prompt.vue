<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  Paperclip,
  Send,
  Upload,
  Smartphone,
  Globe,
  Monitor,
  ChevronDown,
  Activity,
  BadgeCheck,
  Target,
} from "lucide-vue-next";
import UploadFileItem from "./uploadfile-item.vue";
import message from "@/utils/message";
import request from "@/api/request";
import { useUserStore } from "@/stores/user";
import axios from "axios";

const { t } = useI18n();
const router = useRouter();
const user_store = useUserStore();

// 定义 emit
const emit = defineEmits<{
  "creating-change": [value: boolean];
}>();

// Prompt输入内容
const prompt_text = ref("");
const LOCAL_STORAGE_KEY = "welcome_prompt_cache";

// 在组件挂载时恢复缓存
onMounted(() => {
  const cached_prompt = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached_prompt) {
    prompt_text.value = cached_prompt;
  }

  // 拉取当前用户未绑定项目的已上传文件，避免重复上传
  fetch_unbound_files();
});

// 监听输入变化并更新缓存
watch(prompt_text, (new_val) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, new_val);
});

// 拖拽状态
const is_dragging = ref(false);
const drag_counter = ref(0);

// 项目类型选择
type ProjectType = "web" | "app" | "desktop";
const current_project_type = ref<ProjectType>("web");
const is_type_selector_open = ref(false);
const type_selector_ref = ref<HTMLElement | null>(null);

type DevModeType = "agile" | "expert" | "focus";
const current_dev_mode = ref<DevModeType>("agile");
const is_mode_selector_open = ref(false);
const mode_selector_ref = ref<HTMLElement | null>(null);

interface ProjectTypeInfo {
  value: ProjectType;
  icon: typeof Globe;
  label: string;
}

interface DevModeInfo {
  value: DevModeType;
  icon: typeof Activity;
  label: string;
}

const project_types: ProjectTypeInfo[] = [
  { value: "web", icon: Globe, label: "prompt.projectType.web" },
  { value: "app", icon: Smartphone, label: "prompt.projectType.app" },
  { value: "desktop", icon: Monitor, label: "prompt.projectType.desktop" },
];

const dev_modes: DevModeInfo[] = [
  { value: "agile", icon: Activity, label: "Agile" },
  { value: "expert", icon: BadgeCheck, label: "Expert" },
  { value: "focus", icon: Target, label: "Focus" },
];
const default_dev_mode = dev_modes[0] as DevModeInfo;

// 显式声明，确保编译期非 undefined
const project_type_map: Record<ProjectType, ProjectTypeInfo> = {
  web: project_types[0] as ProjectTypeInfo,
  app: project_types[1] as ProjectTypeInfo,
  desktop: project_types[2] as ProjectTypeInfo,
};

const current_project_type_info = computed<ProjectTypeInfo>(
  () => project_type_map[current_project_type.value]
);

const current_dev_mode_info = computed<DevModeInfo>(() => {
  return dev_modes.find((m) => m.value === current_dev_mode.value) ?? default_dev_mode;
});

const toggle_type_selector = () => {
  is_type_selector_open.value = !is_type_selector_open.value;
};

const toggle_mode_selector = () => {
  is_mode_selector_open.value = !is_mode_selector_open.value;
};

const select_project_type = (type: ProjectType) => {
  if (type !== "web") {
    message.warning(
      t("prompt.onlyWebSupported") ||
        "目前仅支持 Web 应用开发，如需优先体验请联系我们"
    );
    current_project_type.value = "web";
    is_type_selector_open.value = false;
    return;
  }
  current_project_type.value = type;
  is_type_selector_open.value = false;
};

const select_dev_mode = (mode: DevModeType) => {
  if (mode !== "agile") {
    message.warning("目前仅支持 Agile 模式");
    current_dev_mode.value = "agile";
    is_mode_selector_open.value = false;
    return;
  }
  current_dev_mode.value = mode;
  is_mode_selector_open.value = false;
};

// 点击外部关闭下拉框
const handle_click_outside = (event: MouseEvent) => {
  if (
    type_selector_ref.value &&
    !type_selector_ref.value.contains(event.target as Node)
  ) {
    is_type_selector_open.value = false;
  }
  if (
    mode_selector_ref.value &&
    !mode_selector_ref.value.contains(event.target as Node)
  ) {
    is_mode_selector_open.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handle_click_outside);
});

onUnmounted(() => {
  document.removeEventListener("click", handle_click_outside);
});

// 上传的文件列表（带source_id的文件对象）
interface UploadedFile {
  file: File;
  source_id?: string;
  source_url?: string;
  source_type?: string;
  source_name?: string;
  file_size?: number | string;
  status: "pending" | "uploading" | "parsing" | "completed" | "error";
  progress: number;
  error_message?: string;
  cancelSource?: any;
}
const uploaded_files = ref<UploadedFile[]>([]);

// 文件选择器引用
const file_input_ref = ref<HTMLInputElement | null>(null);

// 是否正在创建项目
const is_creating = ref(false);

// 上传并解析单个文件
const upload_and_parse_file = async (file_item: UploadedFile) => {
  try {
    // 设置为上传中状态
    file_item.status = "uploading";
    file_item.progress = 0;

    // 为可取消上传创建 cancel token
    if (!file_item.cancelSource) {
      file_item.cancelSource = axios.CancelToken.source();
    }

    // 创建FormData
    const form_data = new FormData();
    form_data.append("files", file_item.file);

    // 调用上传解析接口
    const result = await request({
      url: "inter.upload_and_parse",
      method: "post",
      data: form_data,
      showSuccessMessage: false,
      showErrorMessage: false,
      cancelToken: file_item.cancelSource.token,
    });

    // 上传完成，设置为解析中
    file_item.status = "parsing";
    file_item.progress = 50;

    // 解析完成
    if (result && Array.isArray(result) && result.length > 0) {
      const parsed_file = result[0];
      file_item.source_id = parsed_file.source_id;
      file_item.source_url = parsed_file.source_url || "";
      file_item.source_type = parsed_file.source_type || "";
      file_item.status = "completed";
      file_item.progress = 100;
      console.log(`文件 ${file_item.file.name} 解析完成:`, parsed_file);
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

// 拉取未绑定项目的已上传文件
const fetch_unbound_files = async () => {
  // 未登录则不请求
  if (!user_store.is_logged_in()) return;

  try {
    const data = await request({
      url: "inter.unbound_sources",
      method: "get",
      params: { limit: 50 },
      showErrorMessage: false,
      showSuccessMessage: false,
    });

    if (!Array.isArray(data)) return;

    // 已有的 source_id 集合，避免重复添加
    const existingIds = new Set(
      uploaded_files.value
        .filter((f) => f.source_id)
        .map((f) => f.source_id as string)
    );

    const mapped: UploadedFile[] = data
      .filter((item: any) => item?.source_id && !existingIds.has(item.source_id))
      .map((item: any) => {
        const filename =
          item.source_name ||
          item.source_url?.split("/").pop() ||
          `${item.source_id}.${item.source_type || "file"}`;
        const sizeNum =
          item.file_size !== undefined && item.file_size !== null
            ? Number(item.file_size)
            : 0;
        // 使用空内容构造一个占位 File，便于复用现有 UI 组件；size 不写入 File，单独存 display
        const placeholderFile = new File([""], filename);
        return {
          file: placeholderFile,
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
    console.error("获取未绑定文件失败:", error);
  }
};

// 上传并解析所有文件
const upload_all_files = async () => {
  const pending_files = uploaded_files.value.filter(
    (f) => f.status === "pending" || f.status === "error"
  );

  if (pending_files.length === 0) {
    return true;
  }

  try {
    // 并发上传所有文件
    await Promise.all(pending_files.map((file) => upload_and_parse_file(file)));
    return true;
  } catch (error) {
    console.error("部分文件上传失败:", error);
    return false;
  }
};

// 检查所有文件是否都已完成解析
const all_files_completed = computed(() => {
  if (uploaded_files.value.length === 0) {
    return true;
  }
  return uploaded_files.value.every((f) => f.status === "completed");
});

// 发送prompt - 创建项目
const handle_send = async () => {
  if (!prompt_text.value.trim()) {
    return;
  }

  // 检查用户是否登录
  if (!user_store.is_logged_in()) {
    router.push("/login");
    return;
  }

  // 确保用户信息存在，如果不存在则获取
  if (!user_store.user_info) {
    await user_store.fetch_user_info();
  }

  // 获取用户ID
  const user_id = user_store.user_info?.user_id;
  if (!user_id) {
    console.error("无法获取用户ID，请重新登录");
    router.push("/login");
    return;
  }

  try {
    // 先设置创建状态，触发页面渐隐和loading渐显
    is_creating.value = true;
    emit("creating-change", true);

    // 等待页面渐隐动画完成（0.5s）
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. 先上传并解析所有文件
    if (uploaded_files.value.length > 0) {
      console.log("开始上传并解析文件...");
      const upload_success = await upload_all_files();

      if (!upload_success) {
        // 如果有文件上传失败，提示用户
        console.error("部分文件上传失败，无法创建项目");
        is_creating.value = false;
        emit("creating-change", false);
        return;
      }
    }

    // 2. 收集所有已完成解析的文件的source_id
    const source_list: string[] = uploaded_files.value
      .filter((f) => f.status === "completed" && f.source_id)
      .map((f) => f.source_id!);

    console.log("准备创建项目，source_list:", source_list);

    // 3. 调用创建项目接口
    // 将项目类型拼接到 prompt 中，以便后端识别
    const final_prompt = `[Target Platform: ${current_project_type.value}] ${prompt_text.value.trim()}`;
    
    const result = await request({
      url: "projectinfo.createproject",
      method: "post",
      data: {
        user_id: user_id,
        prompt: final_prompt,
        source_list: source_list,
      },
      showSuccessMessage: true,
      showErrorMessage: true,
    });

    if (result && result.project_id) {
      // 4. 创建会话
      let session_result;
      try {
        session_result = await request({
          url: "session.createSession",
          method: "post",
          data: {
            user_id: user_id,
            project_id: result.project_id,
          },
          showSuccessMessage: false,
          showErrorMessage: true,
        });
      } catch (error) {
        console.error("创建会话失败:", error);
        // 即使创建会话失败，也继续跳转，因为项目已经创建成功
        session_result = null;
      }

      // 先隐藏loading，触发渐隐动画
      is_creating.value = false;
      emit("creating-change", false);

      // 等待1秒，让loading渐隐动画播放完
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 创建成功，跳转到work页面
      // 通过query参数传递projectId、sessionId和prompt
      const query_params: Record<string, string> = {
        projectId: result.project_id,
      };

      // 如果创建会话成功，传递sessionId和prompt
      if (session_result && session_result.session_id) {
        query_params.sessionId = session_result.session_id;
        query_params.prompt = final_prompt;
        // 将已上传附件的元数据传递到 work 页面，便于首条消息展示
        const sourceListsPayload = uploaded_files.value
          .filter((f) => f.status === "completed" && f.source_id)
          .map((f) => ({
            source_id: f.source_id as string,
            source_name: f.source_name || f.file.name,
            source_type: f.source_type || f.file.type || "",
          }));
        if (sourceListsPayload.length > 0) {
          query_params.sourceLists = encodeURIComponent(
            JSON.stringify(sourceListsPayload)
          );
        }
      }

      router.push({
        path: "/work",
        query: query_params,
      });

      // 清空输入并清除缓存
      prompt_text.value = "";
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      uploaded_files.value = [];
    }
  } catch (error) {
    console.error("创建项目失败:", error);
    // 发生错误时也要隐藏loading
    is_creating.value = false;
    emit("creating-change", false);
  }
};

// 附件上传 - 触发文件选择
const handle_attach = () => {
  file_input_ref.value?.click();
};

// 处理文件选择
const handle_file_change = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    const file_array = Array.from(files);
    const uploaded_file_array: UploadedFile[] = file_array.map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }));
    uploaded_files.value.push(...uploaded_file_array);
    console.log("选择文件:", file_array);
  }
  // 清空input值，允许重复选择同一文件
  if (target) {
    target.value = "";
  }
};

// 拖拽事件处理
const handle_drag_enter = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  drag_counter.value++;
  if (drag_counter.value === 1) {
    is_dragging.value = true;
  }
};

const handle_drag_leave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  drag_counter.value--;
  if (drag_counter.value === 0) {
    is_dragging.value = false;
  }
};

const handle_drag_over = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handle_drop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  is_dragging.value = false;
  drag_counter.value = 0;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    // 将FileList转换为数组并添加到上传列表
    const file_array = Array.from(files);
    const uploaded_file_array: UploadedFile[] = file_array.map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }));
    uploaded_files.value.push(...uploaded_file_array);
    console.log("拖拽文件:", file_array);
  }
};

// 移除文件
const handle_remove_file = async (index: number) => {
  const file = uploaded_files.value[index];
  if (!file) return;
  // 1) 取消正在进行的上传/解析请求
  file.cancelSource?.cancel("用户取消");
  // 2) 如果已生成 source_id，调用后端取消接口
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
  // 3) 从列表移除
  uploaded_files.value.splice(index, 1);
};

// 监听文件列表变化，自动上传新添加的文件
watch(
  () => uploaded_files.value.length,
  async (newLength, oldLength) => {
    // 如果有新文件添加
    if (newLength > oldLength) {
      // 检查是否有pending状态的文件
      const pending_files = uploaded_files.value.filter(
        (f) => f.status === "pending"
      );

      if (pending_files.length > 0) {
        // 自动开始上传和解析
        console.log(`检测到 ${pending_files.length} 个新文件，开始自动上传...`);
        try {
          await Promise.all(
            pending_files.map((file) => upload_and_parse_file(file))
          );
          console.log("所有文件上传解析完成");
        } catch (error) {
          console.error("文件上传解析过程中出现错误:", error);
        }
      }
    }
  }
);
</script>

<template>
  <div
    class="prompt_container"
    @dragenter="handle_drag_enter"
    @dragleave="handle_drag_leave"
    @dragover="handle_drag_over"
    @drop="handle_drop"
  >
    <!-- 上传文件列表区域 -->
    <div v-if="uploaded_files.length > 0" class="upload_files_area">
      <div class="upload_files_list">
        <UploadFileItem
          v-for="(file_item, index) in uploaded_files"
          :key="index"
          :file="file_item.file"
          :status="file_item.status"
          :progress="file_item.progress"
          :source_id="file_item.source_id"
          :display-name="file_item.source_name"
          :display-size="file_item.file_size"
          :error_message="file_item.error_message"
          @remove="handle_remove_file(index)"
        />
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="prompt_input_area">
      <textarea
        v-model="prompt_text"
        :placeholder="t('prompt.placeholder')"
        class="prompt_textarea"
        rows="4"
      ></textarea>
    </div>

    <!-- 功能区 -->
    <div class="prompt_action_area">
      <!-- 左侧功能按钮区域 -->
      <div class="prompt_actions_left">
        <div class="type_selector" ref="type_selector_ref">
          <button
            class="type_selector_trigger"
            :class="{ active: is_type_selector_open }"
            @click.stop="toggle_type_selector"
          >
            <component :is="current_project_type_info.icon" :size="18" />
            <span class="type_label">{{
              t(current_project_type_info.label)
            }}</span>
            <ChevronDown
              :size="14"
              class="chevron_icon"
              :class="{ rotate: is_type_selector_open }"
            />
          </button>

          <transition name="fade-slide">
            <div v-if="is_type_selector_open" class="type_dropdown">
              <div
                v-for="type in project_types"
                :key="type.value"
                class="type_option"
                :class="{ selected: current_project_type === type.value }"
                @click="select_project_type(type.value)"
              >
                <component :is="type.icon" :size="16" />
                <span>{{ t(type.label) }}</span>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 右侧发送按钮 -->
      <div class="prompt_actions_right">
        <div class="mode_selector" ref="mode_selector_ref">
          <button
            class="mode_selector_trigger"
            :class="{ active: is_mode_selector_open }"
            @click.stop="toggle_mode_selector"
          >
            <component :is="current_dev_mode_info.icon" :size="18" />
            <span class="mode_label">{{ current_dev_mode_info.label }}</span>
            <ChevronDown
              :size="14"
              class="chevron_icon"
              :class="{ rotate: is_mode_selector_open }"
            />
          </button>

          <transition name="fade-slide">
            <div v-if="is_mode_selector_open" class="mode_dropdown">
              <div
                v-for="mode in dev_modes"
                :key="mode.value"
                class="mode_option"
                :class="{ selected: current_dev_mode === mode.value }"
                @click="select_dev_mode(mode.value)"
              >
                <component :is="mode.icon" :size="16" />
                <span>{{ mode.label }}</span>
              </div>
            </div>
          </transition>
        </div>

        <button class="prompt_attach_button" @click="handle_attach">
          <Paperclip :size="20" />
        </button>
        <button
          class="prompt_send_button"
          :disabled="!prompt_text.trim() || is_creating || !all_files_completed"
          @click="handle_send"
        >
          <Send :size="20" />
          <span>{{
            is_creating ? t("prompt.creating") : t("prompt.send")
          }}</span>
        </button>
      </div>
    </div>

    <!-- 拖拽蒙版 -->
    <div v-if="is_dragging" class="drag_overlay">
      <div class="drag_content">
        <Upload :size="48" class="drag_icon" />
        <p class="drag_text">{{ t("prompt.dropFile") }}</p>
      </div>
    </div>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="file_input_ref"
      type="file"
      multiple
      class="file_input"
      @change="handle_file_change"
    />
  </div>
</template>

<style scoped lang="scss">
.prompt_container {
  width: 80%;
  max-width: 60rem;
  background: rgba(36, 36, 41, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  transition: all 0.3s ease;
}

/* 上传文件列表区域 */
.upload_files_area {
  width: 100%;
  max-height: 12rem;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */

  /* Chrome, Safari, Opera */
  &::-webkit-scrollbar {
    display: none;
  }
}

.upload_files_list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 输入区域 */
.prompt_input_area {
  width: 100%;
}

.prompt_textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 1rem;
  font-weight: 400;
  resize: none;
  outline: none;
  padding: 0;
  line-height: 1.6;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */

  /* Chrome, Safari, Opera */
  &::-webkit-scrollbar {
    display: none;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
  }
}

/* 功能区 */
.prompt_action_area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.prompt_actions_left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.prompt_actions_right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 附件上传按钮 */
.prompt_attach_button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #feeede;
  }
}

/* 开发模式选择器 */
.mode_selector {
  position: relative;
}

.mode_selector_trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &.active {
    background: rgba(255, 255, 255, 0.05);
    color: #feeede;
  }
}

.mode_label {
  font-weight: 500;
}

.mode_dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  width: 160px;
  background: rgba(36, 36, 41, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.375rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mode_option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &.selected {
    background: rgba(254, 238, 222, 0.1);
    color: #feeede;
  }
}

/* 类型选择器 */
.type_selector {
  position: relative;
}

.type_selector_trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &.active {
    background: rgba(255, 255, 255, 0.1);
    color: #feeede;
    border-color: rgba(254, 238, 222, 0.3);
  }
}

.type_label {
  font-weight: 500;
}

.chevron_icon {
  transition: transform 0.2s ease;
  opacity: 0.7;

  &.rotate {
    transform: rotate(180deg);
  }
}

.type_dropdown {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  width: 160px;
  background: rgba(36, 36, 41, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.375rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type_option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &.selected {
    background: rgba(254, 238, 222, 0.1);
    color: #feeede;
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 发送按钮 */
.prompt_send_button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
  border: none;
  border-radius: 0.5rem;
  color: #242429;
  font-family: "Source Serif", serif;
  font-size: 0.95rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #fbe7e0 0%, #fed9d2 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(254, 238, 222, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

/* 响应式设计 */
/* 平板端：1024px 以下 */
@media (max-width: 1024px) {
  .prompt_container {
    max-width: 100%;
    padding: 1.25rem;
  }

  .prompt_textarea {
    font-size: 0.95rem;
  }

  .prompt_send_button {
    padding: 0.625rem 1.25rem;
    font-size: 0.9rem;
  }
}

/* 移动端：768px 以下 */
@media (max-width: 768px) {
  .prompt_container {
    padding: 1rem;
    border-radius: 0.75rem;
  }

  .prompt_textarea {
    font-size: 0.9rem;
  }

  .prompt_attach_button {
    width: 2.25rem;
    height: 2.25rem;
  }

  .prompt_send_button {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;

    span {
      display: none;
    }
  }
}

/* 小屏移动端：480px 以下 */
@media (max-width: 480px) {
  .prompt_container {
    padding: 0.875rem;
  }

  .prompt_textarea {
    font-size: 0.875rem;
  }

  .prompt_attach_button {
    width: 2rem;
    height: 2rem;
  }

  /* 移动端调整类型选择器 */
  .type_selector_trigger {
    padding: 0.5rem;

    .type_label {
      display: none;
    }

    .chevron_icon {
      display: none;
    }
  }

  .type_dropdown {
    width: 140px;
    bottom: calc(100% + 0.75rem);
  }

  .prompt_send_button {
    padding: 0.5rem 0.875rem;
  }
}

/* 拖拽蒙版 */
.drag_overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(36, 36, 41, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fade_in 0.2s ease;
}

.drag_content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.drag_icon {
  color: #feeede;
  animation: bounce 1s ease-in-out infinite;
}

.drag_text {
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 1.125rem;
  font-weight: 400;
  margin: 0;
}

@keyframes fade_in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-0.5rem);
  }
}

/* 响应式拖拽蒙版 */
@media (max-width: 768px) {
  .drag_text {
    font-size: 1rem;
  }

  .drag_icon {
    width: 2.5rem;
    height: 2.5rem;
  }
}

@media (max-width: 480px) {
  .drag_text {
    font-size: 0.9rem;
  }

  .drag_icon {
    width: 2rem;
    height: 2rem;
  }
}

/* 隐藏的文件选择器 */
.file_input {
  display: none;
}
</style>
