<template>
  <div class="work-message-user-message">
    <!-- 文本消息气泡 -->
    <div v-if="prompt_text" class="work-message-user-message__content">
      {{ prompt_text }}
    </div>

    <!-- 附件列表（横向滚动） -->
    <div
      v-if="attachmentList.length > 0"
      class="work-message-user-message__attachments-list"
    >
      <div
        v-for="item in attachmentList"
        :key="item.source_id"
        class="work-message-user-message__attachment-item"
        :title="item.source_name"
      >
        <component
          :is="iconForType(item.source_type)"
          class="work-message-user-message__attachment-icon"
          :size="16"
        />
        <span class="work-message-user-message__attachment-name">
          {{ formatAttachmentName(item.source_name) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  FileText,
  Image,
  Presentation,
  FileSpreadsheet,
  File,
} from "lucide-vue-next";

interface SourceItem {
  source_id: string;
  source_name: string;
  source_type: string;
}

interface Props {
  content: string;
  source_lists?: SourceItem[];
}

const props = defineProps<Props>();

const ATTACH_MARK = "下面是我上传的附件内容";

const has_attachments = computed(() =>
  props.content ? props.content.includes(ATTACH_MARK) : false
);

const prompt_text = computed(() => {
  if (!has_attachments.value) return props.content;
  return props.content.slice(0, props.content.indexOf(ATTACH_MARK)).trimEnd();
});

// 解析 content 中的附件块（历史可能已拼入）
const attachment_block = computed(() => {
  if (!has_attachments.value) return "";
  return props.content.slice(props.content.indexOf(ATTACH_MARK)).trim();
});

// 来自 content 的附件列表（只提取文件名，不显示内容）
const parsed_attachment_names = computed(() => {
  if (!has_attachments.value) return [];
  const lines = attachment_block.value.split("\n").slice(1); // 去掉标题行
  // 代码块形式 ``` filename
  const names: string[] = [];
  lines.forEach((line) => {
    const match = line.match(/^```\s*(.+)$/);
    if (match && match[1]) {
      names.push(match[1]);
    }
  });
  return names.filter(Boolean);
});

// 优先使用后端 source_lists；若无则回退到 content 中解析到的文件名
const attachmentList = computed<SourceItem[]>(() => {
  if (props.source_lists && props.source_lists.length > 0) {
    return props.source_lists;
  }
  return parsed_attachment_names.value.map((name, idx) => ({
    source_id: `local-${idx}`,
    source_name: name,
    source_type: guessType(name),
  }));
});

const guessType = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext;
};

const iconForType = (type: string) => {
  const ext = (type || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff", "tif"].includes(ext))
    return Image;
  if (["ppt", "pptx"].includes(ext)) return Presentation;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt", "md", "html"].includes(ext))
    return FileText;
  return File;
};

// 格式化文件名：保留前2个字和最后2个字（加后缀），中间省略
const formatAttachmentName = (name: string) => {
  if (!name) return "";
  const lastDotIndex = name.lastIndexOf(".");
  let baseName = name;
  let ext = "";
  if (lastDotIndex !== -1) {
    baseName = name.slice(0, lastDotIndex);
    ext = name.slice(lastDotIndex);
  }

  // 阈值：如果 baseName 较短则完整显示，否则截断
  if (baseName.length > 5) {
    return `${baseName.slice(0, 2)}...${baseName.slice(-2)}${ext}`;
  }
  return name;
};
</script>

<style lang="scss" scoped>
.work-message-user-message {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;

  &__content {
    width: fit-content;
    max-width: 75%;
    padding: 0.875rem 1.125rem;
    border-radius: 1rem;
    font-size: 0.9375rem;
    font-family: "Source Serif 4", serif;
    line-height: 1.6;
    word-wrap: break-word;
    word-break: break-word;
    background: linear-gradient(
      135deg,
      rgba(254, 238, 222, 0.15) 0%,
      rgba(254, 238, 222, 0.1) 100%
    );
    border: 1px solid rgba(254, 238, 222, 0.2);
    color: #feeede;
    position: relative;
    white-space: pre-wrap;

    @media (max-width: 768px) {
      max-width: 80%;
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
    }

    @media (max-width: 480px) {
      max-width: 85%;
      font-size: 0.8125rem;
      padding: 0.6875rem 0.875rem;
    }
  }

  &__attachments-list {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    max-width: 85%; // 限制附件列表整体宽度，避免占满一行
    overflow-x: auto;
    padding-bottom: 0.25rem; // 给滚动条留点位置

    // 隐藏滚动条但保留滚动
    &::-webkit-scrollbar {
      display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  &__attachment-item {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    color: #a9a9ab;
    font-size: 0.8125rem;
    font-family: "Source Serif 4", serif;
    max-width: 12rem; // 限制单个附件卡片最大宽度
    transition: all 0.3s ease;
    cursor: default;

    &:hover {
      color: #feeede;
    }
  }

  &__attachment-icon {
    color: #feeede;
    flex-shrink: 0;
  }

  &__attachment-name {
    white-space: nowrap;
    overflow: hidden;
    // 这里其实不需要 text-overflow: ellipsis，因为我们手动截断了
    // 但保留以防万一
  }
}
</style>
