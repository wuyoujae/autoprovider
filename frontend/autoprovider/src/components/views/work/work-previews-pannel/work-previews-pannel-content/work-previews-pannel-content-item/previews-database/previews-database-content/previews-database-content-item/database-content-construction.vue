<template>
  <div class="database-content-construction">
    <!-- 工具栏 -->
    <div class="database-content-construction__toolbar">
      <div class="database-content-construction__toolbar-left">
        <button
          v-if="selected_rows.length > 0"
          class="database-content-construction__delete-btn"
          @click="handle_batch_delete"
        >
          <Trash2 class="database-content-construction__delete-icon" />
          <span class="database-content-construction__delete-text">
            {{
              $t("work.preview.content.database.construction.deleteSelected", {
                count: selected_rows.length,
              })
            }}
          </span>
        </button>
        <span v-else class="database-content-construction__table-info">
          {{ database_name }} / {{ table_name }}
        </span>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="database-content-construction__table-wrapper">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              class="database-content-construction__th database-content-construction__th--checkbox"
            >
              <Checkbox
                :checked="is_all_selected"
                @update:checked="handle_select_all"
              />
            </TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.index")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.name")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.type")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.collation")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t(
                "work.preview.content.database.construction.headers.attributes"
              )
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.null")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.default")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.comment")
            }}</TableHead>
            <TableHead class="database-content-construction__th">{{
              $t("work.preview.content.database.construction.headers.extra")
            }}</TableHead>
            <TableHead
              class="database-content-construction__th database-content-construction__th--actions"
              >{{
                $t("work.preview.content.database.construction.headers.actions")
              }}</TableHead
            >
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="(column, index) in columns_data"
            :key="column.id"
            class="database-content-construction__row"
            :class="{
              'database-content-construction__row--selected': is_row_selected(
                column.id
              ),
            }"
          >
            <TableCell
              class="database-content-construction__td database-content-construction__td--checkbox"
            >
              <Checkbox
                :checked="is_row_selected(column.id)"
                @update:checked="(checked: boolean | 'indeterminate') => handle_row_select(column.id, checked)"
              />
            </TableCell>
            <TableCell class="database-content-construction__td">{{
              index + 1
            }}</TableCell>
            <TableCell
              class="database-content-construction__td database-content-construction__td--name"
              >{{ column.name }}</TableCell
            >
            <TableCell class="database-content-construction__td">{{
              column.type
            }}</TableCell>
            <TableCell class="database-content-construction__td">{{
              column.collation || "-"
            }}</TableCell>
            <TableCell class="database-content-construction__td">{{
              column.attributes || "-"
            }}</TableCell>
            <TableCell class="database-content-construction__td">{{
              column.nullable
                ? $t("work.preview.content.database.construction.yes")
                : $t("work.preview.content.database.construction.no")
            }}</TableCell>
            <TableCell class="database-content-construction__td">{{
              column.default_value || "-"
            }}</TableCell>
            <TableCell class="database-content-construction__td">{{
              column.comment || "-"
            }}</TableCell>
            <TableCell class="database-content-construction__td">{{
              column.extra || "-"
            }}</TableCell>
            <TableCell
              class="database-content-construction__td database-content-construction__td--actions"
            >
              <div class="database-content-construction__actions">
                <button
                  class="database-content-construction__action-btn"
                  @click="handle_edit(column.id)"
                  :aria-label="
                    $t('work.preview.content.database.construction.edit')
                  "
                >
                  <Pencil class="database-content-construction__action-icon" />
                </button>
                <button
                  class="database-content-construction__action-btn database-content-construction__action-btn--delete"
                  @click="handle_delete(column.id)"
                  :aria-label="
                    $t('work.preview.content.database.construction.delete')
                  "
                >
                  <Trash2 class="database-content-construction__action-icon" />
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
import { ref, computed, watch, onMounted } from "vue";
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
import request from "@/api/request";

interface Props {
  database_name: string;
  table_name: string;
  project_id?: string; // Add project_id prop
}

const props = defineProps<Props>();

// 表列定义类型
interface ColumnDefinition {
  id: string;
  name: string;
  type: string;
  collation?: string;
  attributes?: string;
  nullable: boolean;
  default_value?: string;
  comment?: string;
  extra?: string;
}

// 实际数据
const columns_data = ref<ColumnDefinition[]>([]);

// 获取数据库结构
const fetch_table_structure = async () => {
  // 这里我们复用 getprojectdbstructure 接口，因为它返回了所有表的结构
  // 在实际生产中，如果表很多，应该有一个单独获取表结构的接口
  // 但根据目前的需求，我们从父组件传递下来的数据或者重新获取都可以
  // 为了保持一致性，我们这里重新获取一次，或者更好的方式是父组件传递结构数据下来
  // 但鉴于组件解耦，我们这里重新请求一次，或者让父组件通过 props 传递 columns 数据
  
  // 修正：由于 getprojectdbstructure 返回的是整个数据库结构，
  // 我们应该在父组件获取并传递给子组件，或者在这里重新请求。
  // 考虑到 props 中只有 database_name 和 table_name，没有 project_id，
  // 我们需要从 URL 或其他地方获取 project_id，或者修改 props。
  // 既然父组件 PreviewsDatabase 已经获取了结构，最好的方式是传递下来。
  // 但为了不修改太多组件层级，我们假设父组件会通过某种方式传递，
  // 或者我们这里暂时先用 props 接收 project_id (需要修改父组件传递)
  
  // 临时方案：我们修改 PreviewsDatabaseContent 和 DatabaseContentConstruction 接收 project_id
  // 并在这里请求。或者更简单地，我们在 PreviewsDatabase 中获取了数据，
  // 可以通过 provide/inject 或者 props 传递给 DatabaseContentConstruction。
  
  // 让我们先看看 PreviewsDatabase.vue，它已经获取了 result。
  // 我们应该把 result[database_name][table_name] 传递给 DatabaseContentConstruction。
  
  // 但是，为了快速修复问题，我们先假设我们能获取到 project_id。
  // 实际上，我们可以通过 inject 获取 project_id，或者修改 props。
  // 让我们修改 props 接收 project_id。
};

// 监听 table_name 变化，重新获取数据
// 由于我们现在没有直接的数据源，我们需要请求接口。
// 但是 getprojectdbstructure 需要 project_id。
// 我们先在 PreviewsDatabase.vue 中把 project_id 传给 PreviewsDatabaseContent，
// 再传给 DatabaseContentConstruction。

// 假设我们已经有了 project_id (需要修改父组件)
const load_data = async () => {
  if (!props.project_id || !props.table_name) return;

  try {
    const result = await request({
      url: "workinfo.getprojectdbstructure",
      method: "post",
      data: {
        project_id: props.project_id,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result && result[props.database_name] && result[props.database_name][props.table_name]) {
      const rawColumns = result[props.database_name][props.table_name];
      // 映射后端数据到前端格式
      columns_data.value = rawColumns.map((col: any, index: number) => ({
        id: String(index + 1),
        name: col["名字"],
        type: col["类型"],
        collation: col["排序规则"],
        attributes: col["属性"],
        nullable: col["可为空"] === "YES",
        default_value: col["默认值"],
        comment: col["注释"],
        extra: col["额外"],
      }));
    } else {
      columns_data.value = [];
    }
  } catch (error) {
    console.error("获取表结构失败:", error);
  }
};

watch(
  () => [props.project_id, props.table_name],
  () => {
    load_data();
  },
  { immediate: true }
);

// 选中的行
const selected_rows = ref<string[]>([]);

// 是否全选
const is_all_selected = computed(() => {
  return (
    columns_data.value.length > 0 &&
    selected_rows.value.length === columns_data.value.length
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
    selected_rows.value = columns_data.value.map((col) => col.id);
  } else {
    selected_rows.value = [];
  }
};

// 处理编辑
const handle_edit = (id: string) => {
  console.log("Edit column:", id);
  // TODO: 实现编辑逻辑
};

// 处理删除
const handle_delete = (id: string) => {
  console.log("Delete column:", id);
  // TODO: 实现删除逻辑
};

// 处理批量删除
const handle_batch_delete = () => {
  console.log("Batch delete columns:", selected_rows.value);
  // TODO: 实现批量删除逻辑
};
</script>

<style lang="scss" scoped>
.database-content-construction {
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

    &--name {
      font-weight: 600;
      color: rgba(254, 238, 222, 0.85);
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

        .database-content-construction__action-icon {
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

    .database-content-construction__action-btn:hover & {
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
