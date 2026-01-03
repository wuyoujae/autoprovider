<template>
  <div
    class="project_item"
    :class="{
      'project_item--create': is_create,
      'project_item--loading': isDeleting,
    }"
    @click="handle_click"
  >
    <div v-if="!is_create" class="project_item__wrapper">
      <!-- 顶部区域：图标和操作按钮 -->
      <div class="project_item__top">
        <div class="project_item__icon">
          <Folder :size="28" />
        </div>
        <div class="project_item__actions">
          <button
            class="project_item__action"
            :disabled="isDeleting"
            @click.stop="handle_edit"
            :title="$t('project.edit')"
          >
            <Edit2 :size="16" />
          </button>
          <button
            class="project_item__action"
            :disabled="isDeleting"
            @click.stop="handle_delete"
            :title="$t('project.delete')"
          >
            <Loader2
              v-if="isDeleting"
              class="project_item__action__spinner"
              :size="16"
            />
            <Trash2 v-else :size="16" />
          </button>
        </div>
      </div>

      <!-- 项目名称和状态 -->
      <div class="project_item__header">
        <h3 class="project_item__title">{{ project_data?.name }}</h3>
        <span
          class="project_item__status"
          :class="`project_item__status--${project_data?.status}`"
        >
          {{ $t(`project.status.${project_data?.status}`) }}
        </span>
      </div>

      <!-- 项目描述 -->
      <p class="project_item__description">{{ project_data?.description }}</p>

      <!-- 底部元信息 -->
      <div class="project_item__footer">
        <div class="project_item__date">
          <Clock :size="14" />
          <span>{{ format_date(project_data?.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 创建新项目卡片 -->
    <div v-else class="project_item__wrapper project_item__wrapper--create">
      <div class="project_item__create_content">
        <div class="project_item__create_icon">
          <Plus :size="40" />
        </div>
        <h3 class="project_item__create_title">
          {{ $t("project.createNew") }}
        </h3>
        <p class="project_item__create_description">
          {{ $t("project.createDescription") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Folder, Clock, Edit2, Trash2, Plus, Loader2 } from "lucide-vue-next";
import { useI18n } from "vue-i18n";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: "active" | "building" | "error" | "draft";
  updated_at: string;
}

interface Props {
  project_data?: ProjectData;
  is_create?: boolean;
  deleting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  is_create: false,
  deleting: false,
});

const emit = defineEmits<{
  click: [];
  edit: [id: string];
  delete: [id: string];
}>();

const { t } = useI18n();

const isDeleting = computed(() => props.deleting);

const handle_click = () => {
  if (isDeleting.value) return;
  emit("click");
};

const handle_edit = () => {
  if (isDeleting.value) return;
  if (props.project_data?.id) {
    emit("edit", props.project_data.id);
  }
};

const handle_delete = () => {
  if (isDeleting.value) return;
  if (props.project_data?.id) {
    emit("delete", props.project_data.id);
  }
};

const format_date = (date_string?: string) => {
  if (!date_string) return "";
  const date = new Date(date_string);
  return date.toLocaleDateString();
};
</script>

<style lang="scss" scoped>
.project_item {
  height: 100%;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &--loading {
    opacity: 0.6;
    pointer-events: none;
  }

  &--create {
    .project_item__wrapper {
      border-style: dashed;
      border-color: rgba(254, 238, 222, 0.2);
      background: rgba(254, 238, 222, 0.02);

      &:hover {
        background: rgba(254, 238, 222, 0.05);
        border-color: rgba(254, 238, 222, 0.4);
      }
    }
  }

  &__wrapper {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(254, 238, 222, 0.2);
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }

    &--create {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  &__icon {
    width: 2.5rem;
    height: 2.5rem;
    background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #242429;
    transition: all 0.3s ease;

    .project_item__wrapper:hover & {
      transform: scale(1.1);
    }
  }

  &__actions {
    display: flex;
    gap: 0.375rem;
    opacity: 0;
    transition: opacity 0.2s ease;

    .project_item__wrapper:hover & {
      opacity: 1;
    }
  }

  &__action {
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 0.375rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: #afb3bc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border-color: rgba(254, 238, 222, 0.3);
      transform: scale(1.1);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    &__spinner {
      animation: spin 1s linear infinite;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  &__title {
    flex: 1;
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    font-family: "Source Serif 4", serif;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    flex-shrink: 0;
    font-size: 0.6875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &--active {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    &--building {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    &--error {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    &--draft {
      background: rgba(175, 179, 188, 0.15);
      color: #afb3bc;
    }
  }

  &__description {
    flex: 1;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.5;
    margin: 0 0 1rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  &__date {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  // 创建新项目样式
  &__create_content {
    text-align: center;
    width: 100%;
  }

  &__create_icon {
    width: 4rem;
    height: 4rem;
    margin: 0 auto 1rem;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(254, 238, 222, 0.1) 0%,
      rgba(251, 231, 224, 0.1) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    color: #feeede;
    transition: all 0.3s ease;

    .project_item__wrapper:hover & {
      background: linear-gradient(
        135deg,
        rgba(254, 238, 222, 0.2) 0%,
        rgba(251, 231, 224, 0.2) 100%
      );
      transform: scale(1.1);
    }
  }

  &__create_title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.5rem;
    font-family: "Source Serif 4", serif;
  }

  &__create_description {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .project_item {
    &__wrapper {
      padding: 1.25rem;
    }

    &__icon {
      width: 2.25rem;
      height: 2.25rem;
    }

    &__title {
      font-size: 1rem;
    }

    &__description {
      font-size: 0.75rem;
    }

    &__create_icon {
      width: 3.5rem;
      height: 3.5rem;
    }

    &__create_title {
      font-size: 1rem;
    }

    &__create_description {
      font-size: 0.75rem;
    }

    &__actions {
      opacity: 1;
    }
  }
}

@media (max-width: 480px) {
  .project_item {
    &__wrapper {
      padding: 1rem;
    }

    &__icon {
      width: 2rem;
      height: 2rem;
    }

    &__title {
      font-size: 0.9375rem;
    }

    &__description {
      font-size: 0.6875rem;
    }

    &__create_icon {
      width: 3rem;
      height: 3rem;
    }

    &__create_title {
      font-size: 0.9375rem;
    }
  }
}
</style>
