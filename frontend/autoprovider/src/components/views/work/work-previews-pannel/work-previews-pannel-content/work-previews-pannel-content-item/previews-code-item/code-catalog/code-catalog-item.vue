<template>
  <div
    class="code-catalog-item"
    :class="{
      'code-catalog-item--file': type === 'file',
      'code-catalog-item--folder': type === 'folder',
      'code-catalog-item--folder-open': type === 'folder-open',
    }"
    :style="{ paddingLeft: `${0.75 + level * 1.5}rem` }"
    @click="handle_click"
  >
    <component :is="icon" class="code-catalog-item__icon" />
    <span class="code-catalog-item__name">{{ name }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { File, Folder, FolderOpen } from "lucide-vue-next";

interface Props {
  name: string;
  type: "file" | "folder" | "folder-open";
  level?: number;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
});

const emit = defineEmits<{
  click: [name: string, type: string];
}>();

const icon = computed(() => {
  switch (props.type) {
    case "file":
      return File;
    case "folder":
      return Folder;
    case "folder-open":
      return FolderOpen;
    default:
      return File;
  }
});

const handle_click = () => {
  emit("click", props.name, props.type);
};
</script>

<style lang="scss" scoped>
.code-catalog-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  padding-right: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-family: "Source Serif 4", serif;
  transition: color 0.2s ease, background-color 0.2s ease;
  border-radius: 0.25rem;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;

    .code-catalog-item--file & {
      color: rgba(254, 238, 222, 0.5);
    }

    .code-catalog-item--folder & {
      color: rgba(251, 231, 224, 0.6);
    }

    .code-catalog-item--folder-open & {
      color: rgba(254, 217, 210, 0.7);
    }
  }

  &__name {
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
