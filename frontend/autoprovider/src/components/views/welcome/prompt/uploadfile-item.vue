<script setup lang="ts">
import { ref, computed } from "vue";
import {
  X,
  FileText,
  Image,
  Video,
  Music,
  FileSpreadsheet,
  Presentation,
  File,
  FileCode,
  Archive,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-vue-next";

interface Props {
  file: File;
  status?: "pending" | "uploading" | "parsing" | "completed" | "error";
  progress?: number;
  source_id?: string;
  error_message?: string;
  displayName?: string;
  displaySize?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  status: "pending",
  progress: 0,
});

const emit = defineEmits<{
  remove: [];
}>();

const is_hovered = ref(false);

const handle_remove = () => {
  emit("remove");
};

const format_file_size = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const display_name = computed(() => props.displayName || props.file.name);
const display_size = computed(() => {
  if (props.displaySize !== undefined && props.displaySize !== null) {
    const num = Number(props.displaySize);
    return Number.isFinite(num)
      ? format_file_size(num)
      : String(props.displaySize);
  }
  return format_file_size(props.file.size);
});

// 获取文件扩展名
const file_extension = computed(() => {
  const name = props.file.name;
  const last_dot = name.lastIndexOf(".");
  return last_dot !== -1 ? name.substring(last_dot + 1).toLowerCase() : "";
});

// 根据文件类型返回对应的图标组件
const file_icon = computed(() => {
  const ext = file_extension.value;

  // 图片类型
  if (
    ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"].includes(ext)
  ) {
    return Image;
  }

  // 视频类型
  if (["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v"].includes(ext)) {
    return Video;
  }

  // 音频类型
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"].includes(ext)) {
    return Music;
  }

  // Word文档
  if (["doc", "docx"].includes(ext)) {
    return FileText;
  }

  // Excel表格
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return FileSpreadsheet;
  }

  // PowerPoint演示文稿
  if (["ppt", "pptx"].includes(ext)) {
    return Presentation;
  }

  // PDF文档
  if (ext === "pdf") {
    return FileText;
  }

  // 压缩文件
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return Archive;
  }

  // 代码文件
  if (
    [
      "js",
      "ts",
      "vue",
      "jsx",
      "tsx",
      "html",
      "css",
      "scss",
      "json",
      "xml",
      "py",
      "java",
      "cpp",
      "c",
      "go",
      "rs",
      "php",
      "rb",
      "swift",
      "kt",
    ].includes(ext)
  ) {
    return FileCode;
  }

  // 文本文件
  if (["txt", "md", "log"].includes(ext)) {
    return FileText;
  }

  // 默认文件图标
  return File;
});

// 状态文本
const status_text = computed(() => {
  switch (props.status) {
    case "pending":
      return "等待上传";
    case "uploading":
      return "上传中...";
    case "parsing":
      return "解析中...";
    case "completed":
      return "解析完成";
    case "error":
      return props.error_message || "解析失败";
    default:
      return "";
  }
});

// 状态图标
const status_icon = computed(() => {
  switch (props.status) {
    case "uploading":
    case "parsing":
      return Loader2;
    case "completed":
      return CheckCircle2;
    case "error":
      return AlertCircle;
    default:
      return null;
  }
});

// 状态颜色类
const status_color_class = computed(() => {
  switch (props.status) {
    case "uploading":
    case "parsing":
      return "status_loading";
    case "completed":
      return "status_success";
    case "error":
      return "status_error";
    default:
      return "";
  }
});
</script>

<template>
  <div
    class="upload_item"
    :class="{ [status_color_class]: true }"
    @mouseenter="is_hovered = true"
    @mouseleave="is_hovered = false"
  >
    <!-- 文件类型图标 -->
    <div class="upload_item_icon">
      <component :is="file_icon" :size="20" />
    </div>

    <div class="upload_item_info">
      <span class="upload_item_name">{{ display_name }}</span>
      <div class="upload_item_meta">
        <span class="upload_item_size">{{ display_size }}</span>
        <span class="upload_item_status" :class="status_color_class">
          {{ status_text }}
        </span>
      </div>
    </div>

    <!-- 状态图标 -->
    <div v-if="status_icon && !is_hovered" class="upload_item_status_icon">
      <component
        :is="status_icon"
        :size="18"
        :class="{ spinning: status === 'uploading' || status === 'parsing' }"
      />
    </div>

    <!-- 删除按钮 -->
    <button
      v-if="is_hovered"
      class="upload_item_remove"
      @click.stop="handle_remove"
      title="删除文件"
    >
      <X :size="18" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.upload_item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.875rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  gap: 0.75rem;
  height: 3.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(254, 238, 222, 0.2);
  }
}

.upload_item_icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #feeede;
  width: 2rem;
  height: 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.375rem;
}

.upload_item_info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.upload_item_name {
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload_item_meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload_item_size {
  color: rgba(255, 255, 255, 0.5);
  font-family: "Source Serif", serif;
  font-size: 0.75rem;
  font-weight: 400;
}

.upload_item_status {
  color: rgba(255, 255, 255, 0.6);
  font-family: "Source Serif", serif;
  font-size: 0.75rem;
  font-weight: 400;

  &.status_loading {
    color: #feeede;
  }

  &.status_success {
    color: #7ed321;
  }

  &.status_error {
    color: #fdc4c4;
  }
}

.upload_item_status_icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
  width: 2rem;
  height: 2rem;

  &.status_loading {
    color: #feeede;
  }

  &.status_success {
    color: #7ed321;
  }

  &.status_error {
    color: #fdc4c4;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.upload_item_remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: auto;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #feeede;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .upload_item {
    padding: 0.5rem 0.75rem;
    gap: 0.625rem;
  }

  .upload_item_icon {
    :deep(svg) {
      width: 1.125rem;
      height: 1.125rem;
    }
  }

  .upload_item_name {
    font-size: 0.8rem;
  }

  .upload_item_size {
    font-size: 0.7rem;
  }

  .upload_item_remove {
    width: 1.25rem;
    height: 1.25rem;
  }
}

@media (max-width: 480px) {
  .upload_item {
    padding: 0.45rem 0.625rem;
    gap: 0.5rem;
  }

  .upload_item_icon {
    :deep(svg) {
      width: 1rem;
      height: 1rem;
    }
  }

  .upload_item_name {
    font-size: 0.75rem;
  }

  .upload_item_size {
    font-size: 0.65rem;
  }
}
</style>
