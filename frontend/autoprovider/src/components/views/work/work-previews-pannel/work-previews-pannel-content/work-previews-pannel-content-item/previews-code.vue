<template>
  <div class="previews-code">
    <!-- 桌面端：使用可调整大小的面板 -->
    <div v-if="is_desktop" class="previews-code__desktop">
      <ResizablePanelGroup direction="horizontal">
        <!-- 左侧文件目录查看器 -->
        <ResizablePanel :default-size="30" :min-size="20">
          <CodeCatalog
            :file_tree_data="props.file_tree_data"
            @file-select="handle_file_select"
          />
        </ResizablePanel>

        <!-- 中间分隔线 -->
        <ResizableHandle />

        <!-- 右侧文件内容预览 -->
        <ResizablePanel :default-size="70" :min-size="40">
          <CodeViews :value="props.code_content" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>

    <!-- 移动端和平板端：使用侧边栏 -->
    <div v-else class="previews-code__mobile">
      <!-- 固定在右下角的菜单按钮 -->
      <button
        class="previews-code__menu-toggle"
        @click="toggle_sidebar"
        aria-label="Toggle file directory"
      >
        <FolderOpen :size="16" />
      </button>

      <!-- 代码内容区域 -->
      <div class="previews-code__content">
        <CodeViews :value="props.code_content" />
      </div>

      <!-- 侧边栏 -->
      <Sheet v-model:open="is_sidebar_open">
        <SheetContent side="left" class="previews-code__sidebar">
          <SheetHeader class="previews-code__sidebar-header">
            <SheetTitle class="previews-code__sidebar-title">
              File Directory
            </SheetTitle>
          </SheetHeader>
          <div class="previews-code__sidebar-content">
            <CodeCatalog
              :file_tree_data="props.file_tree_data"
              @file-select="handle_file_select"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { FolderOpen } from "lucide-vue-next";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import CodeCatalog from "./previews-code-item/code-catalog/code-catalog.vue";
import CodeViews from "./previews-code-item/code-views/code-views.vue";
import type { ProjectFileTreeData } from "@/utils/workinfoParse/fileTreeParse";

// Props
interface Props {
  file_tree_data?: ProjectFileTreeData | null;
  code_content?: string;
}

const props = withDefaults(defineProps<Props>(), {
  file_tree_data: null,
  code_content: "",
});

const emit = defineEmits<{
  "file-select": [path: string];
  "fetch-tree": [];
}>();

// 响应式状态
const window_width = ref(0);
const is_sidebar_open = ref(false);

// 计算属性：判断是否为桌面端
const is_desktop = computed(() => window_width.value > 1024);

// 更新窗口宽度
const update_window_width = () => {
  window_width.value = window.innerWidth;
};

// 切换侧边栏
const toggle_sidebar = () => {
  is_sidebar_open.value = !is_sidebar_open.value;
};

// 处理文件选择（移动端选择文件后自动关闭侧边栏）
const handle_file_select = (path: string) => {
  if (!is_desktop.value) {
    is_sidebar_open.value = false;
  }
  // 向上传递文件选择事件
  emit("file-select", path);
};

// 生命周期
onMounted(() => {
  update_window_width();
  window.addEventListener("resize", update_window_width);
  // 组件挂载时触发获取目录树事件
  emit("fetch-tree");
});

onUnmounted(() => {
  window.removeEventListener("resize", update_window_width);
});
</script>

<style lang="scss">
// 全局样式覆盖 Sheet 组件
.previews-code__sidebar {
  background: #242429 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

.previews-code__sidebar [data-slot="sheet-content"] {
  background: #242429 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  width: 20rem !important;
  max-width: 80vw !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;

  @media (max-width: 768px) {
    width: 18rem !important;
    max-width: 85vw !important;
  }
}

// 覆盖关闭按钮样式
.previews-code__sidebar .absolute.top-4.right-4 {
  color: rgba(255, 255, 255, 0.7) !important;
  background: transparent !important;
  border: none !important;
}

.previews-code__sidebar .absolute.top-4.right-4:hover {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 0.375rem !important;
}

// 覆盖 overlay 背景
[data-slot="sheet-overlay"] {
  background-color: rgba(0, 0, 0, 0.5) !important;
}
</style>

<style lang="scss" scoped>
.previews-code {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;

  // 桌面端样式
  &__desktop {
    width: 100%;
    height: 100%;
  }

  // 移动端样式
  &__mobile {
    width: 100%;
    height: 100%;
    position: relative;
  }

  // 菜单切换按钮
  &__menu-toggle {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 100;
    width: 2rem;
    height: 2rem;
    background: #242429;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 0.375rem;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    &:hover {
      background: #2a2a2f;
      border-color: rgba(254, 238, 222, 0.3);
      color: #feeede;
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px rgba(254, 238, 222, 0.4);
    }

    // 平板端调整位置和尺寸
    @media (max-width: 1024px) and (min-width: 769px) {
      bottom: 1.25rem;
      right: 1.25rem;
      width: 2rem;
      height: 2rem;
    }

    // 移动端调整位置和尺寸
    @media (max-width: 768px) {
      bottom: 1rem;
      right: 1rem;
      width: 1.875rem;
      height: 1.875rem;
    }
  }

  // 代码内容区域
  &__content {
    width: 100%;
    height: 100%;
  }

  // 侧边栏样式
  &__sidebar {
    background: #242429 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    padding: 0 !important;
  }

  &__sidebar-header {
    padding: 1rem 1.5rem 0.5rem !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 0 !important;
  }

  &__sidebar-title {
    color: #fff !important;
    font-family: "Source Serif 4", serif !important;
    font-size: 1.125rem !important;
    font-weight: 600 !important;
  }

  &__sidebar-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem 0;
    min-height: 0;

    // 隐藏滚动条但保留滚动功能
    &::-webkit-scrollbar {
      width: 0;
      display: none;
    }

    scrollbar-width: none;
    -ms-overflow-style: none;
  }
}

// 确保 ResizablePanel 正确显示
:deep([data-slot="resizable-panel"]) {
  overflow: hidden;
  display: flex;
}
</style>
