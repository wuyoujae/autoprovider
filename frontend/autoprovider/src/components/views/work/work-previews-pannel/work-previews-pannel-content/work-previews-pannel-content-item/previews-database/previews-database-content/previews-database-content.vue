<template>
  <div class="database-content">
    <div v-if="table_name" class="database-content__container">
      <!-- Head 区域 -->
      <PreviewsDatabaseContentHead
        :active_tab="active_tab"
        @tab-change="handle_tab_change"
        @action-select="handle_action_select"
      />

      <!-- Content Item 区域 -->
      <div class="database-content__body">
        <!-- 结构视图 -->
        <DatabaseContentConstruction
          v-if="active_tab === 'construction'"
          :database_name="database_name"
          :table_name="table_name"
          :project_id="props.project_id"
        />

        <!-- 数据视图 -->
        <DatabaseContentData
          v-if="active_tab === 'data'"
          :database_name="database_name"
          :table_name="table_name"
          :project_id="props.project_id"
          :table_data="table_data"
          :table_columns="table_columns"
        />
      </div>

      <!-- 分页控件 -->
      <div v-if="active_tab === 'data'" class="database-content__pagination">
        <div class="database-content__pagination-info">
          {{
            $t("work.preview.content.database.pagination.info", {
              start: (pagination.page - 1) * pagination.page_size + 1,
              end: Math.min(
                pagination.page * pagination.page_size,
                pagination.total
              ),
              total: pagination.total,
            })
          }}
        </div>
        <div class="database-content__pagination-controls">
          <button
            class="database-content__pagination-btn"
            :disabled="pagination.page <= 1"
            @click="handle_prev_page"
          >
            <ChevronLeft class="database-content__pagination-icon" />
          </button>
          <span class="database-content__pagination-current">
            {{ pagination.page }}
          </span>
          <button
            class="database-content__pagination-btn"
            :disabled="
              pagination.page * pagination.page_size >= pagination.total
            "
            @click="handle_next_page"
          >
            <ChevronRight class="database-content__pagination-icon" />
          </button>
        </div>
      </div>
    </div>
    <div v-else class="database-content__empty">
      <Database class="database-content__empty-icon" />
      <p class="database-content__empty-text">
        {{ $t("work.preview.content.database.placeholder") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Database, ChevronLeft, ChevronRight } from "lucide-vue-next";
import PreviewsDatabaseContentHead from "./previews-database-content-head/previews-database-content-head.vue";
import DatabaseContentConstruction from "./previews-database-content-item/database-content-construction.vue";
import DatabaseContentData from "./previews-database-content-item/database-content-data.vue";

interface Pagination {
  page: number;
  page_size: number;
  total: number;
}

interface Props {
  database_name: string;
  table_name?: string;
  project_id?: string;
  table_data?: any[];
  table_columns?: string[];
  pagination?: Pagination;
}

const props = withDefaults(defineProps<Props>(), {
  table_name: "",
  table_data: () => [],
  table_columns: () => [],
  pagination: () => ({ page: 1, page_size: 15, total: 0 }),
});

const emit = defineEmits<{
  "page-change": [page: number];
}>();

// 当前活跃的标签
const active_tab = ref<string>("construction");

// 处理标签切换
const handle_tab_change = (value: string) => {
  active_tab.value = value;
};

// 处理操作选择
const handle_action_select = (value: string) => {
  console.log("Action selected:", value);
  // TODO: 实现添加键和插入数据的逻辑
};

// 分页处理
const handle_prev_page = () => {
  if (props.pagination.page > 1) {
    emit("page-change", props.pagination.page - 1);
  }
};

const handle_next_page = () => {
  if (
    props.pagination.page * props.pagination.page_size <
    props.pagination.total
  ) {
    emit("page-change", props.pagination.page + 1);
  }
};
</script>

<style lang="scss" scoped>
.database-content {
  width: 100%;
  height: 100%;
  background: #242429;
  overflow: hidden;

  &__container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &__body {
    flex: 1;
    overflow: auto;

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      width: 0;
      display: none;
    }

    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  &__pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.25rem;
    border-top: 0.0625rem solid rgba(255, 255, 255, 0.1);
    background: #242429;

    @media (max-width: 768px) {
      padding: 0.625rem 1rem;
    }
  }

  &__pagination-info {
    font-family: "Source Serif 4", serif;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
  }

  &__pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: transparent;
    border: 0.0625rem solid rgba(255, 255, 255, 0.2);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.8);

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: rgba(255, 255, 255, 0.1);
    }
  }

  &__pagination-icon {
    width: 1rem;
    height: 1rem;
  }

  &__pagination-current {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    color: #fff;
    min-width: 1.5rem;
    text-align: center;
  }

  &__empty {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;

    @media (max-width: 768px) {
      padding: 1.5rem;
    }

    @media (max-width: 480px) {
      padding: 1rem;
    }
  }

  &__empty-icon {
    width: 3rem;
    height: 3rem;
    color: rgba(254, 238, 222, 0.3);
    margin-bottom: 1rem;

    @media (max-width: 768px) {
      width: 2.5rem;
      height: 2.5rem;
      margin-bottom: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 2rem;
      height: 2rem;
      margin-bottom: 0.75rem;
    }
  }

  &__empty-text {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.5);
    font-family: "Source Serif 4", serif;
    font-weight: 400;

    @media (max-width: 768px) {
      font-size: 0.875rem;
    }

    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }
}
</style>
