<template>
  <div class="database-table-control">
    <!-- 表名输入 -->
    <div class="database-table-control__header">
      <div class="database-table-control__table-name">
        <Label class="database-table-control__label">
          {{ $t("work.preview.content.database.tableControl.tableName") }}
        </Label>
        <Input
          v-model="table_name"
          class="database-table-control__input"
          :placeholder="
            $t(
              'work.preview.content.database.tableControl.tableNamePlaceholder'
            )
          "
        />
      </div>
      <div class="database-table-control__actions">
        <Button
          variant="outline"
          class="database-table-control__cancel-btn"
          @click="handle_cancel"
        >
          {{ $t("work.preview.content.database.tableControl.cancel") }}
        </Button>
        <Button class="database-table-control__save-btn" @click="handle_save">
          {{ $t("work.preview.content.database.tableControl.save") }}
        </Button>
      </div>
    </div>

    <!-- 字段列表 -->
    <div class="database-table-control__body">
      <div class="database-table-control__toolbar">
        <h3 class="database-table-control__section-title">
          {{ $t("work.preview.content.database.tableControl.fields") }}
        </h3>
        <Button
          size="sm"
          variant="outline"
          class="database-table-control__add-btn"
          @click="handle_add_field"
        >
          <Plus class="database-table-control__add-icon" />
          {{ $t("work.preview.content.database.tableControl.addField") }}
        </Button>
      </div>

      <!-- 字段表格 -->
      <div class="database-table-control__table-wrapper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="database-table-control__th">
                {{
                  $t("work.preview.content.database.tableControl.headers.name")
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t("work.preview.content.database.tableControl.headers.type")
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t(
                    "work.preview.content.database.tableControl.headers.length"
                  )
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t(
                    "work.preview.content.database.tableControl.headers.collation"
                  )
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t(
                    "work.preview.content.database.tableControl.headers.attributes"
                  )
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t("work.preview.content.database.tableControl.headers.null")
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t(
                    "work.preview.content.database.tableControl.headers.default"
                  )
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t("work.preview.content.database.tableControl.headers.extra")
                }}
              </TableHead>
              <TableHead class="database-table-control__th">
                {{
                  $t(
                    "work.preview.content.database.tableControl.headers.comment"
                  )
                }}
              </TableHead>
              <TableHead
                class="database-table-control__th database-table-control__th--actions"
              >
                {{
                  $t(
                    "work.preview.content.database.tableControl.headers.actions"
                  )
                }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(field, index) in fields"
              :key="field.id"
              class="database-table-control__row"
            >
              <!-- 名称 -->
              <TableCell class="database-table-control__td">
                <Input
                  v-model="field.name"
                  class="database-table-control__cell-input"
                  :placeholder="
                    $t(
                      'work.preview.content.database.tableControl.fieldNamePlaceholder'
                    )
                  "
                />
              </TableCell>

              <!-- 类型 -->
              <TableCell class="database-table-control__td">
                <Select v-model="field.type">
                  <SelectTrigger class="database-table-control__cell-select">
                    <SelectValue
                      :placeholder="
                        $t(
                          'work.preview.content.database.tableControl.selectType'
                        )
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="type in data_types"
                      :key="type"
                      :value="type"
                    >
                      {{ type }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <!-- 长度 -->
              <TableCell class="database-table-control__td">
                <Input
                  v-model="field.length"
                  class="database-table-control__cell-input database-table-control__cell-input--small"
                  :placeholder="
                    $t(
                      'work.preview.content.database.tableControl.lengthPlaceholder'
                    )
                  "
                />
              </TableCell>

              <!-- 排序规则 -->
              <TableCell class="database-table-control__td">
                <Select v-model="field.collation">
                  <SelectTrigger class="database-table-control__cell-select">
                    <SelectValue
                      :placeholder="
                        $t(
                          'work.preview.content.database.tableControl.selectCollation'
                        )
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="collation in collations"
                      :key="collation"
                      :value="collation"
                    >
                      {{ collation }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <!-- 属性 -->
              <TableCell class="database-table-control__td">
                <Select v-model="field.attributes">
                  <SelectTrigger class="database-table-control__cell-select">
                    <SelectValue
                      :placeholder="
                        $t(
                          'work.preview.content.database.tableControl.selectAttribute'
                        )
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    <SelectItem
                      v-for="attr in attributes"
                      :key="attr"
                      :value="attr"
                    >
                      {{ attr }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <!-- 可为空 -->
              <TableCell class="database-table-control__td">
                <Select v-model="field.nullable">
                  <SelectTrigger class="database-table-control__cell-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">
                      {{ $t("work.preview.content.database.tableControl.yes") }}
                    </SelectItem>
                    <SelectItem value="no">
                      {{ $t("work.preview.content.database.tableControl.no") }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <!-- 默认值 -->
              <TableCell class="database-table-control__td">
                <Select
                  v-if="get_default_options(field.type).length > 0"
                  v-model="field.default_value"
                >
                  <SelectTrigger class="database-table-control__cell-select">
                    <SelectValue
                      :placeholder="
                        $t(
                          'work.preview.content.database.tableControl.selectDefault'
                        )
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    <SelectItem
                      v-for="option in get_default_options(field.type)"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  v-else
                  v-model="field.default_value"
                  class="database-table-control__cell-input"
                  :placeholder="
                    $t(
                      'work.preview.content.database.tableControl.defaultPlaceholder'
                    )
                  "
                />
              </TableCell>

              <!-- 额外 -->
              <TableCell class="database-table-control__td">
                <Select v-model="field.extra">
                  <SelectTrigger class="database-table-control__cell-select">
                    <SelectValue
                      :placeholder="
                        $t(
                          'work.preview.content.database.tableControl.selectExtra'
                        )
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    <SelectItem
                      v-for="extra in extra_options"
                      :key="extra"
                      :value="extra"
                    >
                      {{ extra }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <!-- 注释 -->
              <TableCell class="database-table-control__td">
                <Input
                  v-model="field.comment"
                  class="database-table-control__cell-input"
                  :placeholder="
                    $t(
                      'work.preview.content.database.tableControl.commentPlaceholder'
                    )
                  "
                />
              </TableCell>

              <!-- 操作 -->
              <TableCell
                class="database-table-control__td database-table-control__td--actions"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  class="database-table-control__delete-btn"
                  @click="handle_delete_field(index)"
                >
                  <Trash2 class="database-table-control__delete-icon" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 字段类型
interface Field {
  id: string;
  name: string;
  type: string;
  length: string;
  collation: string;
  attributes: string;
  nullable: string;
  default_value: string;
  extra: string;
  comment: string;
}

// 表名
const table_name = ref<string>("");

// 字段列表
const fields = ref<Field[]>([
  {
    id: "1",
    name: "id",
    type: "INT",
    length: "11",
    collation: "",
    attributes: "UNSIGNED",
    nullable: "no",
    default_value: "",
    extra: "AUTO_INCREMENT",
    comment: "主键",
  },
]);

// 数据类型选项
const data_types = ref<string[]>([
  "INT",
  "BIGINT",
  "TINYINT",
  "SMALLINT",
  "MEDIUMINT",
  "VARCHAR",
  "CHAR",
  "TEXT",
  "LONGTEXT",
  "MEDIUMTEXT",
  "TINYTEXT",
  "DECIMAL",
  "FLOAT",
  "DOUBLE",
  "DATE",
  "DATETIME",
  "TIMESTAMP",
  "TIME",
  "YEAR",
  "ENUM",
  "SET",
  "BOOL",
  "BOOLEAN",
  "JSON",
  "BLOB",
  "LONGBLOB",
  "MEDIUMBLOB",
  "TINYBLOB",
]);

// 排序规则选项
const collations = ref<string[]>([
  "utf8mb4_general_ci",
  "utf8mb4_unicode_ci",
  "utf8mb4_bin",
  "utf8_general_ci",
  "utf8_unicode_ci",
  "utf8_bin",
  "latin1_swedish_ci",
  "latin1_bin",
  "ascii_general_ci",
  "ascii_bin",
]);

// 属性选项
const attributes = ref<string[]>([
  "UNSIGNED",
  "UNSIGNED ZEROFILL",
  "BINARY",
  "on update CURRENT_TIMESTAMP",
]);

// 额外选项
const extra_options = ref<string[]>([
  "AUTO_INCREMENT",
  "on update CURRENT_TIMESTAMP",
  "DEFAULT_GENERATED",
]);

// 根据数据类型获取默认值选项
const get_default_options = (type: string): string[] => {
  const upper_type = type.toUpperCase();

  if (upper_type.includes("TIMESTAMP") || upper_type.includes("DATETIME")) {
    return ["CURRENT_TIMESTAMP", "NULL"];
  }

  if (upper_type.includes("DATE")) {
    return ["CURRENT_DATE", "NULL"];
  }

  if (upper_type.includes("TIME")) {
    return ["CURRENT_TIME", "NULL"];
  }

  if (upper_type === "BOOL" || upper_type === "BOOLEAN") {
    return ["0", "1", "NULL"];
  }

  return [];
};

// 添加字段
let field_counter = 2;
const handle_add_field = () => {
  fields.value.push({
    id: String(field_counter++),
    name: "",
    type: "VARCHAR",
    length: "255",
    collation: "",
    attributes: "",
    nullable: "yes",
    default_value: "",
    extra: "",
    comment: "",
  });
};

// 删除字段
const handle_delete_field = (index: number) => {
  fields.value.splice(index, 1);
};

// 保存
const handle_save = () => {
  console.log("Save table:", {
    table_name: table_name.value,
    fields: fields.value,
  });
  // TODO: 实现保存逻辑
};

// 取消
const handle_cancel = () => {
  console.log("Cancel");
  // TODO: 实现取消逻辑
};
</script>

<style lang="scss" scoped>
.database-table-control {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #242429;
  overflow: hidden;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 1.25rem 1.5rem;
    border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);
    gap: 1.5rem;

    @media (max-width: 768px) {
      padding: 1rem 1.25rem;
      gap: 1.25rem;
      flex-direction: column;
      align-items: stretch;
    }

    @media (max-width: 480px) {
      padding: 0.875rem 1rem;
      gap: 1rem;
    }
  }

  &__table-name {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 30rem;

    @media (max-width: 768px) {
      max-width: none;
    }
  }

  &__label {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(254, 238, 222, 0.9);

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__input {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    background: rgba(255, 255, 255, 0.05);
    border: 0.0625rem solid rgba(255, 255, 255, 0.1);
    color: #fff;
    outline: none;

    &:hover {
      border-color: rgba(254, 238, 222, 0.3);
    }

    &:focus {
      border-color: rgba(254, 238, 222, 0.5);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__actions {
    display: flex;
    gap: 0.75rem;

    @media (max-width: 768px) {
      gap: 0.625rem;
    }

    @media (max-width: 480px) {
      gap: 0.5rem;
    }
  }

  &__cancel-btn {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    background: transparent;
    border: 0.0625rem solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
    outline: none;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.3);
      color: #fff;
    }

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__save-btn {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    background: rgba(254, 238, 222, 0.15);
    border: 0.0625rem solid rgba(254, 238, 222, 0.3);
    color: rgba(254, 238, 222, 0.95);
    outline: none;

    &:hover {
      background: rgba(254, 238, 222, 0.2);
      border-color: rgba(254, 238, 222, 0.5);
      color: #fff;
    }

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 0.0625rem solid rgba(255, 255, 255, 0.1);

    @media (max-width: 768px) {
      padding: 0.875rem 1.25rem;
    }

    @media (max-width: 480px) {
      padding: 0.75rem 1rem;
    }
  }

  &__section-title {
    font-family: "Source Serif 4", serif;
    font-size: 1rem;
    font-weight: 600;
    color: rgba(254, 238, 222, 0.9);

    @media (max-width: 768px) {
      font-size: 0.9375rem;
    }

    @media (max-width: 480px) {
      font-size: 0.875rem;
    }
  }

  &__add-btn {
    font-family: "Source Serif 4", serif;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: transparent;
    border: 0.0625rem solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
    outline: none;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(254, 238, 222, 0.3);
      color: rgba(254, 238, 222, 0.9);
    }

    @media (max-width: 768px) {
      font-size: 0.8125rem;
    }

    @media (max-width: 480px) {
      font-size: 0.75rem;
    }
  }

  &__add-icon {
    width: 0.9375rem;
    height: 0.9375rem;

    @media (max-width: 768px) {
      width: 0.875rem;
      height: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }
  }

  &__table-wrapper {
    flex: 1;
    overflow: auto;
    padding: 1rem 1.5rem;

    @media (max-width: 768px) {
      padding: 0.875rem 1.25rem;
    }

    @media (max-width: 480px) {
      padding: 0.75rem 1rem;
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
    padding: 0.75rem 0.5rem;
    white-space: nowrap;

    @media (max-width: 768px) {
      font-size: 0.75rem;
      padding: 0.625rem 0.4375rem;
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
      padding: 0.5rem 0.375rem;
    }

    &--actions {
      text-align: center;
      width: 4rem;

      @media (max-width: 768px) {
        width: 3.5rem;
      }

      @media (max-width: 480px) {
        width: 3rem;
      }
    }
  }

  &__row {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }
  }

  &__td {
    padding: 0.5rem 0.5rem;

    @media (max-width: 768px) {
      padding: 0.4375rem 0.4375rem;
    }

    @media (max-width: 480px) {
      padding: 0.375rem 0.375rem;
    }

    &--actions {
      text-align: center;
    }
  }

  &__cell-input {
    min-width: 8rem;
    font-family: "Source Serif 4", serif;
    font-size: 0.8125rem;
    background: rgba(255, 255, 255, 0.05);
    border: 0.0625rem solid rgba(255, 255, 255, 0.1);
    color: #fff;
    outline: none;

    &:hover {
      border-color: rgba(254, 238, 222, 0.3);
    }

    &:focus {
      border-color: rgba(254, 238, 222, 0.5);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    &--small {
      min-width: 5rem;
    }

    @media (max-width: 768px) {
      font-size: 0.75rem;
      min-width: 7rem;

      &--small {
        min-width: 4.5rem;
      }
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
      min-width: 6rem;

      &--small {
        min-width: 4rem;
      }
    }
  }

  &__cell-select {
    min-width: 10rem;
    font-family: "Source Serif 4", serif;
    font-size: 0.8125rem;
    background: rgba(255, 255, 255, 0.05);
    border: 0.0625rem solid rgba(255, 255, 255, 0.1);
    color: #fff;
    outline: none;

    &:hover {
      border-color: rgba(254, 238, 222, 0.3);
    }

    &:focus {
      border-color: rgba(254, 238, 222, 0.5);
    }

    @media (max-width: 768px) {
      font-size: 0.75rem;
      min-width: 9rem;
    }

    @media (max-width: 480px) {
      font-size: 0.6875rem;
      min-width: 8rem;
    }
  }

  &__delete-btn {
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: transparent;
    border: none;
    outline: none;

    &:hover {
      background: rgba(239, 68, 68, 0.1);

      .database-table-control__delete-icon {
        color: rgba(239, 68, 68, 0.9);
      }
    }

    @media (max-width: 768px) {
      width: 1.625rem;
      height: 1.625rem;
    }

    @media (max-width: 480px) {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  &__delete-icon {
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
  }
}

// 覆盖 shadcn 组件的默认样式
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

// Select 组件样式覆盖
:deep([data-slot="select-content"]) {
  background: #2a2a2f;
  border: 0.0625rem solid rgba(255, 255, 255, 0.1);
  max-height: 15rem;
  overflow-y: auto;
}

:deep([data-slot="select-item"]) {
  font-family: "Source Serif 4", serif;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.8);
  outline: none;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  &[data-state="checked"] {
    background: rgba(254, 238, 222, 0.1);
    color: rgba(254, 238, 222, 0.95);
  }
}
</style>
