<template>
  <div class="previews-database">
    <div class="previews-database__catalogue">
      <PreviewsDatabaseCatalogue
        :database_name="database_name"
        :tables="tables"
        :active_table="active_table"
        @table-select="handle_table_select"
        @add-table="handle_add_table"
      />
    </div>
    <div class="previews-database__content">
      <PreviewsDatabaseContent
        :database_name="database_name"
        :table_name="active_table"
        :project_id="props.project_id"
        :table_data="current_table_data"
        :table_columns="current_table_columns"
        :pagination="pagination"
        @page-change="handle_page_change"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import PreviewsDatabaseCatalogue from "./previews-database-catalogue/previews-database-catalogue.vue";
import PreviewsDatabaseContent from "./previews-database-content/previews-database-content.vue";
import request from "@/api/request";

interface Props {
  project_id?: string;
}

const props = defineProps<Props>();

const database_name = ref("");
const tables = ref<string[]>([]);
const active_table = ref("");

// 数据相关状态
const current_table_data = ref<any[]>([]);
const current_table_columns = ref<string[]>([]);
const db_structure_cache = ref<any>(null);
const pagination = ref({
  page: 1,
  page_size: 15,
  total: 0,
});

// 获取数据库结构
const fetch_database_structure = async () => {
  if (!props.project_id) {
    console.warn("fetch_database_structure: project_id is missing");
    return;
  }

  console.log("Fetching database structure for project:", props.project_id);

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

    console.log("Database structure result:", result);

    if (result) {
      db_structure_cache.value = result;
      // result 结构: { "myapp_xxx": { "table1": [...], "table2": [...] } }
      const dbNames = Object.keys(result);
      if (dbNames.length > 0) {
        database_name.value = dbNames[0] || "";
        const dbStructure = result[database_name.value];
        tables.value = Object.keys(dbStructure);

        // 如果有表且当前没有选中表，默认选中第一个
        if (tables.value.length > 0 && !active_table.value) {
          active_table.value = tables.value[0] || "";
        }
      }
    }
  } catch (error) {
    console.error("获取数据库结构失败:", error);
  }
};

// 获取表数据
const fetch_table_data = async () => {
  if (!props.project_id || !active_table.value) return;

  try {
    const result = await request({
      url: "workinfo.gettabledata",
      method: "post",
      data: {
        project_id: props.project_id,
        table_name: active_table.value,
        page: pagination.value.page,
        page_size: pagination.value.page_size,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result && result[active_table.value]) {
      const rawData = result[active_table.value];
      const paginationData = result.pagination;

      // 更新分页信息
      if (paginationData) {
        pagination.value = {
          page: paginationData.page,
          page_size: paginationData.page_size,
          total: paginationData.total,
        };
      }

      // 获取列名
      let columns: string[] = [];
      if (
        db_structure_cache.value &&
        db_structure_cache.value[database_name.value] &&
        db_structure_cache.value[database_name.value][active_table.value]
      ) {
        const rawColumns =
          db_structure_cache.value[database_name.value][active_table.value];
        columns = rawColumns.map((col: any) => col["名字"]);
      }

      current_table_columns.value = columns;

      // 映射数据
      current_table_data.value = rawData.map((row: any[], index: number) => {
        const rowData: Record<string, any> = {};
        columns.forEach((colName, colIndex) => {
          rowData[colName] = row[colIndex];
        });

        // 尝试找到主键作为 id，如果没有则使用索引
        const id = rowData["id"] ? String(rowData["id"]) : String(index);

        return {
          id,
          data: rowData,
        };
      });
    } else {
      current_table_data.value = [];
      current_table_columns.value = [];
      pagination.value.total = 0;
    }
  } catch (error) {
    console.error("获取表数据失败:", error);
    current_table_data.value = [];
  }
};

const handle_table_select = (table_name: string) => {
  active_table.value = table_name;
  pagination.value.page = 1; // 重置页码
};

const handle_page_change = (page: number) => {
  pagination.value.page = page;
  fetch_table_data();
};

const handle_add_table = () => {
  console.log("Add new table");
  // TODO: 实现添加表的逻辑
};

// 监听 project_id 变化
watch(
  () => props.project_id,
  (newVal) => {
    if (newVal) {
      fetch_database_structure();
    }
  },
  { immediate: true }
);

// 监听 active_table 变化，获取数据
watch(active_table, (newVal) => {
  if (newVal) {
    fetch_table_data();
  }
});
</script>

<style lang="scss" scoped>
.previews-database {
  width: 100%;
  height: 100%;
  display: flex;
  background: #242429;
  overflow: hidden;

  &__catalogue {
    width: 15rem;
    height: 100%;
    border-right: 0.0625rem solid rgba(255, 255, 255, 0.1);
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 0;

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      width: 0;
      display: none;
    }

    scrollbar-width: none;
    -ms-overflow-style: none;

    @media (max-width: 1024px) {
      width: 12rem;
    }

    @media (max-width: 768px) {
      width: 10rem;
    }

    @media (max-width: 480px) {
      width: 8rem;
    }
  }

  &__content {
    flex: 1;
    height: 100%;
    overflow: auto;

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      width: 0;
      display: none;
    }

    scrollbar-width: none;
    -ms-overflow-style: none;
  }
}
</style>
