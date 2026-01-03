<template>
  <div class="work-previews-pannel-content">
    <!-- APP 预览 -->
    <div v-if="active_tab === 'app'" class="work-previews-pannel-content__item">
      <KeepAlive>
        <PreviewsApp
          :selected_device="selected_device"
          :project_url="props.project_url"
          :refresh_token="props.refresh_token"
        />
      </KeepAlive>
    </div>

    <!-- 代码预览 -->
    <div
      v-if="active_tab === 'code'"
      class="work-previews-pannel-content__item"
    >
      <PreviewsCode
        :file_tree_data="file_tree_data"
        :code_content="props.code_content"
        @file-select="handle_file_select"
        @fetch-tree="handle_fetch_tree"
      />
    </div>

    <!-- 数据库预览 -->
    <div
      v-if="active_tab === 'database'"
      class="work-previews-pannel-content__item"
    >
      <PreviewsDatabase :project_id="props.project_id" />
    </div>

    <!-- 配置预览 -->
    <div
      v-if="active_tab === 'config'"
      class="work-previews-pannel-content__item"
    >
      <PreviewsConfig :project_id="props.project_id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PreviewsApp from "./work-previews-pannel-content-item/previews-app.vue";
import PreviewsCode from "./work-previews-pannel-content-item/previews-code.vue";
import PreviewsDatabase from "./work-previews-pannel-content-item/previews-database/previews-database.vue";
import PreviewsConfig from "./work-previews-pannel-content-item/previews-config/previews-config.vue";
import type { ProjectFileTreeData } from "@/utils/workinfoParse/fileTreeParse";

// Props
interface Props {
  active_tab: string;
  selected_device: string;
  file_tree_data?: ProjectFileTreeData | null;
  code_content?: string;
  project_id?: string;
  project_url?: string;
  refresh_token?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "file-select": [path: string];
  "fetch-tree": [];
}>();

const handle_file_select = (path: string) => {
  emit("file-select", path);
};

const handle_fetch_tree = () => {
  emit("fetch-tree");
};
</script>

<style lang="scss" scoped>
.work-previews-pannel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  // 隐藏滚动条但保留滚动功能
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  // 兼容 Firefox
  scrollbar-width: none;
  -ms-overflow-style: none;

  &__item {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}
</style>
