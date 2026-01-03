<template>
  <div v-if="files.length > 0" class="work-chat-pannel-prompt-filepreviews">
    <div class="work-chat-pannel-prompt-filepreviews__scroll">
      <div
        v-for="(file, index) in files"
        :key="index"
        class="work-chat-pannel-prompt-filepreviews__item"
        @mouseenter="hovered_index = index"
        @mouseleave="hovered_index = null"
      >
        <!-- 文件类型图标容器 -->
        <div class="work-chat-pannel-prompt-filepreviews__icon-wrapper">
          <component
            :is="get_file_icon(file)"
            class="work-chat-pannel-prompt-filepreviews__icon"
            :size="20"
          />
        </div>

        <!-- 文件信息 -->
        <div class="work-chat-pannel-prompt-filepreviews__info">
          <span class="work-chat-pannel-prompt-filepreviews__name">
            {{ displayName(file) }}
          </span>
          <span class="work-chat-pannel-prompt-filepreviews__size">
            {{ displaySize(file) }}
          </span>
          <span
            v-if="file.status && file.status !== 'completed'"
            class="work-chat-pannel-prompt-filepreviews__status"
            :class="`is-${file.status}`"
          >
            {{
              file.status === "pending"
                ? "等待上传"
                : file.status === "uploading"
                ? "上传中"
                : file.status === "parsing"
                ? "解析中"
                : file.status === "error"
                ? "失败"
                : ""
            }}
          </span>
        </div>

        <!-- 删除按钮 -->
        <button
          v-if="hovered_index === index"
          class="work-chat-pannel-prompt-filepreviews__remove"
          @click="handle_remove(index)"
        >
          <X :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

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
} from "lucide-vue-next";

interface PreviewFile {
  file: File;
  source_name?: string;
  file_size?: number | string;
  status?: string;
}

interface Props {
  files: PreviewFile[];
}

defineProps<Props>();

const emit = defineEmits<{
  remove: [index: number];
}>();

const hovered_index = ref<number | null>(null);

const handle_remove = (index: number) => {
  emit("remove", index);
};

const format_file_size = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// 获取文件扩展名
const get_file_extension = (file: PreviewFile): string => {
  const name = file.source_name || file.file.name;
  const last_dot = name.lastIndexOf(".");
  return last_dot !== -1 ? name.substring(last_dot + 1).toLowerCase() : "";
};

// 根据文件类型返回对应的图标组件
const get_file_icon = (file: PreviewFile) => {
  const ext = get_file_extension(file);

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
};

const displayName = (file: PreviewFile) => {
  return file.source_name || file.file.name;
};

const displaySize = (file: PreviewFile) => {
  if (
    file.file_size !== undefined &&
    file.file_size !== null &&
    file.file_size !== ""
  ) {
    const num = Number(file.file_size);
    if (Number.isFinite(num)) {
      return format_file_size(num);
    }
    return String(file.file_size);
  }
  return format_file_size(file.file.size);
};
</script>

<style lang="scss" scoped>
.work-chat-pannel-prompt-filepreviews {
  width: 100%;
  padding-bottom: 0.3rem;

  @media (max-width: 768px) {
    margin-bottom: 0.4375rem;
    padding-bottom: 0.875rem;
  }

  @media (max-width: 480px) {
    margin-bottom: 0.375rem;
    padding-bottom: 0.75rem;
  }

  &__scroll {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 0.25rem;

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;

    @media (max-width: 768px) {
      gap: 0.4375rem;
    }

    @media (max-width: 480px) {
      gap: 0.375rem;
    }
  }

  &__item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    padding: 0.5rem 0.375rem 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 8rem;
    max-width: 12rem;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(254, 238, 222, 0.2);
    }

    @media (max-width: 768px) {
      padding: 0.4375rem 0.3125rem 0.4375rem 0.625rem;
      gap: 0.4375rem;
      min-width: 7rem;
      max-width: 10rem;
    }

    @media (max-width: 480px) {
      padding: 0.375rem 0.25rem 0.375rem 0.5rem;
      gap: 0.375rem;
      min-width: 6rem;
      max-width: 8rem;
    }
  }

  &__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 0.375rem;
    color: #feeede;

    @media (max-width: 768px) {
      width: 1.875rem;
      height: 1.875rem;
    }

    @media (max-width: 480px) {
      width: 1.75rem;
      height: 1.75rem;
    }
  }

  &__icon {
    width: 1.125rem;
    height: 1.125rem;

    @media (max-width: 768px) {
      width: 1rem;
      height: 1rem;
    }

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
    padding-right: 0.5rem;
  }

  &__name {
    color: #fff;
    font-family: "Source Serif 4", serif;
    font-size: 0.8125rem;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 768px) {
      font-size: 0.75rem;
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
    }
  }

  &__size {
    color: rgba(255, 255, 255, 0.5);
    font-family: "Source Serif 4", serif;
    font-size: 0.6875rem;
    font-weight: 400;

    @media (max-width: 768px) {
      font-size: 0.625rem;
    }

    @media (max-width: 480px) {
      font-size: 0.5625rem;
    }
  }

  &__status {
    font-size: 0.6875rem;
    font-family: "Source Serif 4", serif;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 0.125rem;
    &.is-pending,
    &.is-uploading,
    &.is-parsing {
      color: #feeede;
    }
    &.is-error {
      color: #fdc4c4;
    }
  }

  &__remove {
    position: absolute;
    top: 0.125rem;
    right: 0.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: #242429;
    border: none;
    border-radius: 0.375rem;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    z-index: 10;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      box-shadow: 0 0 0 1px rgba(254, 238, 222, 0.2);
    }

    @media (max-width: 768px) {
      width: 1.375rem;
      height: 1.375rem;
      top: 0.0625rem;
      right: 0.0625rem;
    }

    @media (max-width: 480px) {
      width: 1.25rem;
      height: 1.25rem;
      top: 0.0625rem;
      right: 0.0625rem;
    }
  }
}
</style>
