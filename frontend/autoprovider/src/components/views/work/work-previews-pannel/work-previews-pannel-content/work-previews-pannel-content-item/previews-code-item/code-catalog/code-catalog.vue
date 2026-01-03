<template>
  <div class="code-catalog" @wheel.stop>
    <Accordion type="multiple" class="code-catalog__accordion">
      <!-- 动态渲染文件树 -->
      <template v-for="(tree, treeIndex) in all_trees" :key="treeIndex">
        <FileTreeNode
          v-for="(node, nodeIndex) in tree"
          :key="`tree-${treeIndex}-node-${nodeIndex}-${node.name}`"
          :node="node"
          :node-id="`tree-${treeIndex}-node-${nodeIndex}`"
          @item-click="handle_item_click"
        />
      </template>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Accordion } from "@/components/ui/accordion";
// @ts-ignore - Vue 组件导入
import FileTreeNode from "./file-tree-node.vue";
import type {
  ProjectFileTreeData,
  FileTreeNode as FileTreeNodeType,
} from "@/utils/workinfoParse/fileTreeParse";
import { parseFileTree } from "@/utils/workinfoParse/fileTreeParse";

// Props
interface Props {
  file_tree_data?: ProjectFileTreeData | null;
}

const props = withDefaults(defineProps<Props>(), {
  file_tree_data: null,
});

const emit = defineEmits<{
  "file-select": [path: string];
}>();

const handle_item_click = (path: string, type: string) => {
  // 只有文件类型才触发文件选择事件
  if (type === "file") {
    console.log("[CodeCatalog] Selected file path:", path);
    emit("file-select", path);
  }
};

// 解析文件树数据
const parsed_file_tree = computed(() => {
  if (props.file_tree_data) {
    const parsed = parseFileTree(props.file_tree_data);
    console.log("解析后的文件树:", parsed);
    return parsed;
  }
  return { project: [], backend: [], frontend: [] };
});

// 合并所有文件树（backend 和 frontend）
const all_trees = computed(() => {
  const trees: FileTreeNodeType[][] = [];
  if (parsed_file_tree.value.project.length > 0) {
    trees.push(parsed_file_tree.value.project);
  }
  if (parsed_file_tree.value.backend.length > 0) {
    // console.log(
    //   "[CodeCatalog] Backend 树节点数量:",
    //   parsed_file_tree.value.backend.length
    // );
    trees.push(parsed_file_tree.value.backend);
  }
  if (parsed_file_tree.value.frontend.length > 0) {
    // console.log(
    //   "[CodeCatalog] Frontend 树节点数量:",
    //   parsed_file_tree.value.frontend.length
    // );
    trees.push(parsed_file_tree.value.frontend);
  }
  console.log("[CodeCatalog] 总共渲染", trees.length, "棵树");
  return trees;
});
</script>

<style lang="scss" scoped>
.code-catalog {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0.7rem;

  // 隐藏滚动条但保留滚动功能
  &::-webkit-scrollbar {
    width: 0;
    display: none;
  }

  scrollbar-width: none;
  -ms-overflow-style: none;

  &__accordion {
    width: 100%;
  }

  &__trigger {
    padding: 0 !important;
    width: 100%;

    &:hover {
      text-decoration: none;
    }
  }

  &__nested {
    padding-left: 0;
    padding-top: 0;
  }

  &__file-item {
    padding: 0.125rem 0;
  }
}

// 覆盖 Accordion 的默认样式，使其符合设计风格
:deep([data-slot="accordion-item"]) {
  border-bottom: none;
  border-color: transparent;
}

:deep([data-slot="accordion-trigger"]) {
  padding: 0;
  border-color: transparent;
  background-color: transparent;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:focus-visible {
    outline: none;
    border: none;
  }
}

:deep([data-slot="accordion-content"]) {
  padding: 0.25rem 0;

  > div {
    padding-top: 0;
    padding-bottom: 0;
  }
}
</style>
