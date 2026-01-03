<template>
  <!-- 文件节点 -->
  <div v-if="node.type === 'file'" class="code-catalog__file-item">
    <CodeCatalogItem
      :name="node.name"
      type="file"
      :level="displayLevel"
      @click="handle_click"
    />
  </div>

  <!-- 文件夹节点 -->
  <AccordionItem v-else :value="nodeId">
    <AccordionTrigger class="code-catalog__trigger">
      <CodeCatalogItem
        :name="node.name"
        type="folder-open"
        :level="displayLevel"
        @click="handle_click"
      />
    </AccordionTrigger>
    <AccordionContent v-if="node.children && node.children.length > 0">
      <div class="code-catalog__nested">
        <FileTreeNodeComponent
          v-for="(child, index) in node.children"
          :key="`${nodeId}-child-${index}`"
          :node="child"
          :node-id="`${nodeId}-child-${index}`"
          :parent-level="node.level"
          :parent-path="currentPath"
          @item-click="handle_child_click"
        />
      </div>
    </AccordionContent>
  </AccordionItem>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CodeCatalogItem from "./code-catalog-item.vue";
import type { FileTreeNode } from "@/utils/workinfoParse/fileTreeParse";
// 递归导入自身
// @ts-ignore - 递归组件导入
import FileTreeNodeComponent from "./file-tree-node.vue";

interface Props {
  node: FileTreeNode;
  nodeId: string;
  parentLevel?: number; // 父节点的层级，用于计算相对层级
  parentPath?: string; // 父节点的路径
}

const props = withDefaults(defineProps<Props>(), {
  parentLevel: -1,
  parentPath: "",
});

const emit = defineEmits<{
  "item-click": [path: string, type: string];
}>();

// 使用绝对层级（用于控制缩进）
// level 属性在 CodeCatalogItem 中用于控制 paddingLeft
// 应该直接使用 node.level，因为解析时已经保存了正确的绝对层级
const displayLevel = computed(() => {
  return props.node.level;
});

// 计算当前节点的完整路径
const currentPath = computed(() => {
  const parent = props.parentPath ? props.parentPath : "";
  // 如果没有父路径，说明是根节点（如 backend 或 frontend），添加前导斜杠
  if (!parent) {
    return `/${props.node.name}`;
  }
  return `${parent}/${props.node.name}`;
});

// 调试信息
watch(
  () => props.node,
  (node) => {
    // console.log(`[FileTreeNode] 渲染节点:`, {
    //   name: node.name,
    //   type: node.type,
    //   absoluteLevel: node.level,
    //   parentLevel: props.parentLevel,
    //   displayLevel: displayLevel.value,
    //   hasChildren: !!node.children,
    //   childrenCount: node.children?.length || 0,
    //   nodeId: props.nodeId,
    //   path: currentPath.value,
    // });
  },
  { immediate: true }
);

const handle_click = () => {
  // 只有点击当前节点时触发
  emit("item-click", currentPath.value, props.node.type);
};

const handle_child_click = (path: string, type: string) => {
  // 向上传递子节点的点击事件
  emit("item-click", path, type);
};
</script>
