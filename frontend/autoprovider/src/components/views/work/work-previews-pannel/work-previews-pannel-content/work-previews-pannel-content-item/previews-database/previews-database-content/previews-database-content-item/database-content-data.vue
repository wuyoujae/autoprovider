<template>
  <div class="database-content-data">
    <!-- 工具栏 -->
    <div class="database-content-data__toolbar">
      <div class="database-content-data__toolbar-left">
        <button
          v-if="selected_rows.length > 0"
          class="database-content-data__delete-btn"
          @click="handle_batch_delete"
        >
          <Trash2 class="database-content-data__delete-icon" />
          <span class="database-content-data__delete-text">
            {{
              $t("work.preview.content.database.data.deleteSelected", {
                count: selected_rows.length,
              })
            }}
          </span>
        </button>
        <span v-else class="database-content-data__table-info">
          {{ database_name }} / {{ table_name }} -
          {{
            $t("work.preview.content.database.data.totalRecords", {
              count: table_data.length,
            })
          }}
        </span>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="database-content-data__table-wrapper">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              class="database-content-data__th database-content-data__th--checkbox"
            >
              <Checkbox
                :checked="is_all_selected"
                @update:checked="handle_select_all"
              />
            </TableHead>
            <TableHead
              v-for="column in columns"
              :key="column"
              class="database-content-data__th"
            >
              {{ column }}
            </TableHead>
            <TableHead
              class="database-content-data__th database-content-data__th--actions"
            >
              {{ $t("work.preview.content.database.data.headers.actions") }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in table_data"
            :key="row.id"
            class="database-content-data__row"
            :class="{
              'database-content-data__row--selected': is_row_selected(row.id),
            }"
          >
            <TableCell
              class="database-content-data__td database-content-data__td--checkbox"
            >
              <Checkbox
                :checked="is_row_selected(row.id)"
                @update:checked="
                  (checked: boolean | 'indeterminate') =>
                    handle_row_select(row.id, checked)
                "
              />
            </TableCell>
            <TableCell
              v-for="column in columns"
              :key="column"
              class="database-content-data__td"
            >
              {{ format_cell_value(row.data[column]) }}
            </TableCell>
            <TableCell
              class="database-content-data__td database-content-data__td--actions"
            >
              <div class="database-content-data__actions">
                <button
                  class="database-content-data__action-btn"
                  @click="handle_edit(row.id)"
                  :aria-label="$t('work.preview.content.database.data.edit')"
                >
                  <Pencil class="database-content-data__action-icon" />
                </button>
                <button
                  class="database-content-data__action-btn database-content-data__action-btn--delete"
                  @click="handle_delete(row.id)"
                  :aria-label="$t('work.preview.content.database.data.delete')"
                >
                  <Trash2 class="database-content-data__action-icon" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Pencil, Trash2 } from "lucide-vue-next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  database_name: string;
  table_name: string;
  project_id?: string;
  table_data?: any[];
  table_columns?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  table_data: () => [],
  table_columns: () => [],
});

// 表数据类型
interface TableRow {
  id: string;
  data: Record<string, any>;
}

// 动态列
const columns = computed(() => props.table_columns);
// 实际数据
const table_data = computed(() => props.table_data as TableRow[]);

// 选中的行
const selected_rows = ref<string[]>([]);

// 是否全选
const is_all_selected = computed(() => {
  return (
    table_data.value.length > 0 &&
    selected_rows.value.length === table_data.value.length
  );
});

// 检查行是否选中
const is_row_selected = (id: string) => {
  return selected_rows.value.includes(id);
};

// 处理行选择
const handle_row_select = (id: string, checked: boolean | "indeterminate") => {
  if (checked === true) {
    if (!selected_rows.value.includes(id)) {
      selected_rows.value.push(id);
    }
  } else {
    selected_rows.value = selected_rows.value.filter((row_id) => row_id !== id);
  }
};

// 处理全选
const handle_select_all = (checked: boolean | "indeterminate") => {
  if (checked === true) {
    selected_rows.value = table_data.value.map((row) => row.id);
  } else {
    selected_rows.value = [];
  }
};

// 格式化单元格值
const format_cell_value = (value: any): string => {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

// 处理编辑
const handle_edit = (id: string) => {
  console.log("Edit row:", id);
  // TODO: 实现编辑逻辑
};

// 处理删除
const handle_delete = (id: string) => {
  console.log("Delete row:", id);
  // TODO: 实现删除逻辑
};

// 处理批量删除
const handle_batch_delete = () => {
  console.log("Batch delete rows:", selected_rows.value);
  // TODO: 实现批量删除逻辑
};
</script>

<style lang="scss" scoped>
.database-content-data {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #242429;

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1.25rem;
    border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);

    @media (max-width: 768px) {
      padding: 0.75rem 1rem;
    }

    @media (max-width: 480px) {
      padding: 0.625rem 0.875rem;
    }
  }

  &__toolbar-left {
    display: flex;
    align-items: center;
  }

  &__table-info {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__delete-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4375rem 0.875rem;
    background: rgba(239, 68, 68, 0.1);
    border: 0.0625rem solid rgba(239, 68, 68, 0.3);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;

    @media (max-width: 768px) {
      padding: 0.375rem 0.75rem;
      gap: 0.4rem;
    }

    @media (max-width: 480px) {
      padding: 0.3125rem 0.625rem;
      gap: 0.375rem;
    }

    &:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.5);
    }
  }

  &__delete-icon {
    width: 0.9375rem;
    height: 0.9375rem;
    color: rgba(239, 68, 68, 0.9);

    @media (max-width: 768px) {
      width: 0.875rem;
      height: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }
  }

  &__delete-text {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    color: rgba(239, 68, 68, 0.9);

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__table-wrapper {
    flex: 1;
    overflow: auto;
    padding: 1rem;

    @media (max-width: 768px) {
      padding: 0.875rem;
    }

    @media (max-width: 480px) {
      padding: 0.75rem;
    }

    // 自定义滚动条样式
    &::-webkit-scrollbar {
      width: 0.5rem;
      height: 0.5rem;
    }

    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.25rem;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(254, 238, 222, 0.2);
      border-radius: 0.25rem;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(254, 238, 222, 0.3);
      }
    }

    &::-webkit-scrollbar-corner {
      background: rgba(0, 0, 0, 0.2);
    }

    // Firefox 自定义滚动条
    scrollbar-width: thin;
    scrollbar-color: rgba(254, 238, 222, 0.2) rgba(0, 0, 0, 0.2);
  }

  &__th {
    font-family: "Source Serif 4", serif;
    font-size: 0.8125rem;
    font-weight: 600;
    color: rgba(254, 238, 222, 0.9);
    text-align: left;
    padding: 0.75rem 0.875rem;
    white-space: nowrap;

    @media (max-width: 768px) {
      font-size: 0.75rem;
      padding: 0.625rem 0.75rem;
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
      padding: 0.5rem 0.625rem;
    }

    &--checkbox {
      width: 2.5rem;
      padding-left: 1rem;
      padding-right: 0.5rem;

      @media (max-width: 768px) {
        width: 2.25rem;
        padding-left: 0.875rem;
        padding-right: 0.4375rem;
      }

      @media (max-width: 480px) {
        width: 2rem;
        padding-left: 0.75rem;
        padding-right: 0.375rem;
      }
    }

    &--actions {
      text-align: center;
      width: 6rem;

      @media (max-width: 768px) {
        width: 5.5rem;
      }

      @media (max-width: 480px) {
        width: 5rem;
      }
    }
  }

  &__row {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }

    &--selected {
      background-color: rgba(254, 238, 222, 0.05);

      &:hover {
        background-color: rgba(254, 238, 222, 0.08);
      }
    }
  }

  &__td {
    font-family: "Source Serif 4", serif;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.8);
    padding: 0.75rem 0.875rem;
    white-space: nowrap;

    @media (max-width: 768px) {
      font-size: 0.75rem;
      padding: 0.625rem 0.75rem;
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
      padding: 0.5rem 0.625rem;
    }

    &--checkbox {
      padding-left: 1rem;
      padding-right: 0.5rem;

      @media (max-width: 768px) {
        padding-left: 0.875rem;
        padding-right: 0.4375rem;
      }

      @media (max-width: 480px) {
        padding-left: 0.75rem;
        padding-right: 0.375rem;
      }
    }

    &--actions {
      text-align: center;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    @media (max-width: 768px) {
      gap: 0.4rem;
    }

    @media (max-width: 480px) {
      gap: 0.375rem;
    }
  }

  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    outline: none;

    @media (max-width: 768px) {
      width: 1.625rem;
      height: 1.625rem;
    }

    @media (max-width: 480px) {
      width: 1.5rem;
      height: 1.5rem;
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    &--delete {
      &:hover {
        background-color: rgba(239, 68, 68, 0.1);

        .database-content-data__action-icon {
          color: rgba(239, 68, 68, 0.9);
        }
      }
    }
  }

  &__action-icon {
    width: 0.9375rem;
    height: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.2s ease;

    @media (max-width: 768px) {
      width: 0.875rem;
      height: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }

    .database-content-data__action-btn:hover & {
      color: rgba(254, 238, 222, 0.9);
    }
  }
}

// 覆盖 shadcn table 的默认样式
:deep([data-slot="table"]) {
  border-collapse: collapse;
  width: 100%;
}

:deep([data-slot="table-header"]) {
  border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
}

:deep([data-slot="table-row"]) {
  border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.05);
}

:deep([data-slot="table-head"]) {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
