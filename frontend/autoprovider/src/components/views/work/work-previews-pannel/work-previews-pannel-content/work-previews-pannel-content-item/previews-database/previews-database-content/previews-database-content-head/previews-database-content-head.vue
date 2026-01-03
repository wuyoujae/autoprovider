<template>
  <div class="database-content-head">
    <div class="database-content-head__left">
      <button
        v-for="item in tabs"
        :key="item.value"
        class="database-content-head__tab"
        :class="{
          'database-content-head__tab--active': item.value === active_tab,
        }"
        @click="handle_tab_click(item.value)"
      >
        <component :is="item.icon" class="database-content-head__icon" />
        <span class="database-content-head__text">{{ item.label }}</span>
      </button>
    </div>

    <div class="database-content-head__right">
      <Select v-model="selected_action">
        <SelectTrigger class="database-content-head__add-trigger">
          <Plus class="database-content-head__add-icon" />
        </SelectTrigger>
        <SelectContent class="database-content-head__select-content">
          <SelectItem
            value="add-key"
            class="database-content-head__select-item"
          >
            {{ $t("work.preview.content.database.actions.addKey") }}
          </SelectItem>
          <SelectItem
            value="insert-data"
            class="database-content-head__select-item"
          >
            {{ $t("work.preview.content.database.actions.insertData") }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, Box, TableIcon } from "lucide-vue-next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  active_tab?: string;
}

const props = withDefaults(defineProps<Props>(), {
  active_tab: "construction",
});

const emit = defineEmits<{
  "tab-change": [value: string];
  "action-select": [value: string];
}>();

// 标签配置
const tabs = [
  {
    value: "construction",
    label: t("work.preview.content.database.tabs.construction"),
    icon: Box,
  },
  {
    value: "data",
    label: t("work.preview.content.database.tabs.data"),
    icon: TableIcon,
  },
];

// 选中的操作
const selected_action = ref<string>("");

// 处理标签点击
const handle_tab_click = (value: string) => {
  emit("tab-change", value);
};

// 监听操作选择
watch(selected_action, (value) => {
  if (value) {
    emit("action-select", value);
    // 重置选择
    setTimeout(() => {
      selected_action.value = "";
    }, 100);
  }
});
</script>

<style lang="scss" scoped>
.database-content-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 0.625rem 0.875rem;
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.75rem;
  }

  &__left {
    display: flex;
    gap: 0.5rem;

    @media (max-width: 768px) {
      gap: 0.375rem;
    }

    @media (max-width: 480px) {
      gap: 0.25rem;
    }
  }

  &__tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4375rem 0.875rem;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: color 0.2s ease, background-color 0.2s ease;
    outline: none;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;

    @media (max-width: 768px) {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      gap: 0.3125rem;
    }

    @media (max-width: 480px) {
      padding: 0.3125rem 0.625rem;
      font-size: 0.75rem;
      gap: 0.25rem;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.9);
    }

    &--active {
      background-color: rgba(254, 238, 222, 0.1);
      color: rgba(254, 238, 222, 0.95);

      &:hover {
        background-color: rgba(254, 238, 222, 0.12);
        color: rgba(254, 238, 222, 1);
      }

      .database-content-head__icon {
        color: rgba(254, 238, 222, 0.8);
      }
    }
  }

  &__icon {
    width: 0.9375rem;
    height: 0.9375rem;
    flex-shrink: 0;
    color: inherit;

    @media (max-width: 768px) {
      width: 0.875rem;
      height: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }
  }

  &__text {
    color: inherit;
    white-space: nowrap;
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__add-trigger {
    width: 2rem;
    height: 2rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    outline: none;

    @media (max-width: 768px) {
      width: 1.875rem;
      height: 1.875rem;
    }

    @media (max-width: 480px) {
      width: 1.75rem;
      height: 1.75rem;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    &:focus-visible {
      box-shadow: none;
    }
  }

  &__add-icon {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(254, 238, 222, 0.7);

    @media (max-width: 768px) {
      width: 1rem;
      height: 1rem;
    }

    @media (max-width: 480px) {
      width: 0.9375rem;
      height: 0.9375rem;
    }
  }

  &__select-content {
    background: #2a2a2f;
    border: 0.0625rem solid rgba(255, 255, 255, 0.1);
    border-radius: 0.25rem;
  }

  &__select-item {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    outline: none;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 1);
    }

    &:focus-visible {
      background-color: rgba(254, 238, 222, 0.1);
      color: rgba(254, 238, 222, 0.95);
    }
  }
}
</style>
