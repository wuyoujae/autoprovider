<template>
  <div class="database-catalogue" @wheel.stop>
    <!-- 数据库名称 - 固定显示 -->
    <div class="database-catalogue__header">
      <div class="database-catalogue__header-left">
        <Database class="database-catalogue__header-icon" />
        <span class="database-catalogue__header-name">{{ database_name }}</span>
      </div>
      <button
        class="database-catalogue__add-btn"
        @click="handle_add_table"
        aria-label="Add table"
      >
        <Plus class="database-catalogue__add-icon" />
      </button>
    </div>

    <!-- 表列表 -->
    <div class="database-catalogue__tables">
      <PreviewsDatabaseCatalogueItem
        v-for="table in tables"
        :key="table"
        :table_name="table"
        :is_active="table === active_table"
        @click="handle_table_click(table)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, Plus } from "lucide-vue-next";
import PreviewsDatabaseCatalogueItem from "./previews-database-catalogue-item/previews-database-catalogue-item.vue";

interface Props {
  database_name: string;
  tables: string[];
  active_table?: string;
}

const props = withDefaults(defineProps<Props>(), {
  active_table: "",
});

const emit = defineEmits<{
  "table-select": [table_name: string];
  "add-table": [];
}>();

const handle_table_click = (table_name: string) => {
  emit("table-select", table_name);
};

const handle_add_table = () => {
  emit("add-table");
};
</script>

<style lang="scss" scoped>
.database-catalogue {
  width: 100%;
  height: 100%;
  padding: 0.75rem 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;

  // 隐藏滚动条但保留滚动功能
  &::-webkit-scrollbar {
    width: 0;
    display: none;
  }

  scrollbar-width: none;
  -ms-overflow-style: none;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 0.25rem;
    background: rgba(254, 238, 222, 0.05);

    @media (max-width: 768px) {
      padding: 0.4rem 0.625rem;
    }

    @media (max-width: 480px) {
      padding: 0.375rem 0.5rem;
    }
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;

    @media (max-width: 768px) {
      gap: 0.4rem;
    }

    @media (max-width: 480px) {
      gap: 0.375rem;
    }
  }

  &__header-icon {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(254, 238, 222, 0.7);
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 1rem;
      height: 1rem;
    }

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__header-name {
    font-family: "Source Serif 4", serif;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 768px) {
      font-size: 0.875rem;
    }

    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }

  &__add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    outline: none;
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 1.375rem;
      height: 1.375rem;
    }

    @media (max-width: 480px) {
      width: 1.25rem;
      height: 1.25rem;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  &__add-icon {
    width: 0.9375rem;
    height: 0.9375rem;
    color: rgba(254, 238, 222, 0.6);

    @media (max-width: 768px) {
      width: 0.875rem;
      height: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }

    .database-catalogue__add-btn:hover & {
      color: rgba(254, 238, 222, 0.9);
    }
  }

  &__tables {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
}
</style>
