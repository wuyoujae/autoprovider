<template>
  <div class="work-previews-pannel">
    <!-- Head 区域 -->
    <WorkPreviewsPannelHead
      :active_tab="active_tab"
      :selected_device="selected_device"
      :current_path="current_path"
      :can_go_back="back_stack.length > 0"
      :can_go_forward="forward_stack.length > 0"
      @tab-click="handle_tab_click"
      @device-change="handle_device_change"
      @refresh="handle_refresh"
      @nav-prev="handle_nav_prev"
      @nav-next="handle_nav_next"
      @navigate-path="handle_navigate_path"
    />

    <!-- Content 区域 -->
    <WorkPreviewsPannelContent
      :active_tab="active_tab"
      :selected_device="selected_device"
      :file_tree_data="file_tree_data"
      :code_content="code_content"
      :project_id="props.project_id"
      :project_url="current_project_url"
      :refresh_token="refresh_token"
      @file-select="handle_file_select"
      @fetch-tree="fetch_project_file_tree"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue";
import WorkPreviewsPannelHead from "./work-previews-pannel-head/work-previews-pannel-head.vue";
import WorkPreviewsPannelContent from "./work-previews-pannel-content/work-previews-pannel-content.vue";
import request from "@/api/request";
import type { ProjectFileTreeData } from "@/utils/workinfoParse/fileTreeParse";

// Props
interface Props {
  project_id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  project_id: "",
});

// 当前活跃的标签
const active_tab = ref<string>("app");

// 当前选中的设备
const selected_device = ref<string>("desktop");

// 文件树数据
const file_tree_data = ref<ProjectFileTreeData | null>(null);

// 文件内容
const code_content = ref<string>("");

// 项目URL（基础 URL，不含路径）
const project_url = ref<string>("");
// 当前实际预览使用的 URL（可附加用户输入路径）
const current_project_url = ref<string>("");
// 当前路径（用于地址栏显示，如 /login）
const current_path = ref<string>("/");

// 历史栈：存储完整 URL
const back_stack = ref<string[]>([]);
const forward_stack = ref<string[]>([]);

// 刷新令牌（递增触发刷新，不改变导航状态）
const refresh_token = ref<number>(0);

// 轮询定时器
let pollTimer: ReturnType<typeof setTimeout> | null = null;

// 从完整 URL 提取路径部分
const extract_path_from_url = (url: string): string => {
  try {
    const u = new URL(url);
    return u.pathname + u.search + u.hash || "/";
  } catch {
    return "/";
  }
};

// 获取项目目录树
const fetch_project_file_tree = async () => {
  if (!props.project_id) {
    console.warn("缺少 project_id，无法获取项目目录树");
    return;
  }

  try {
    const result = await request({
      url: "workinfo.getprojectfiletree",
      method: "post",
      data: {
        project_id: props.project_id,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result) {
      file_tree_data.value = result as ProjectFileTreeData;
      console.log("获取项目目录树成功:", file_tree_data.value);
    }
  } catch (error) {
    console.error("获取项目目录树失败:", error);
  }
};

// 获取文件内容
const fetch_file_content = async (file_path: string) => {
  if (!props.project_id) return;

  try {
    const result = await request({
      url: "workinfo.getfilecontent",
      method: "post",
      data: {
        project_id: props.project_id,
        file_path: file_path,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result) {
      // @ts-ignore
      code_content.value = result.content || "";
      console.log("获取文件内容成功");
    }
  } catch (error) {
    console.error("获取文件内容失败:", error);
  }
};

// 处理文件选择
const handle_file_select = (path: string) => {
  console.log("选中文件:", path);
  fetch_file_content(path);
};

// 处理标签切换
const handle_tab_click = (value: string) => {
  active_tab.value = value;
};

// 处理设备切换
const handle_device_change = (value: string) => {
  selected_device.value = value;
};

// 处理刷新（保持当前标签页，不改变历史栈）
const handle_refresh = () => {
  refresh_token.value += 1;
};

// 处理导航后退：从 back_stack 弹出，压入 forward_stack
const handle_nav_prev = () => {
  if (back_stack.value.length === 0) return;
  const target = back_stack.value.pop();
  if (!target) return;
  // 将当前 URL 压入 forward_stack
  if (current_project_url.value) {
    forward_stack.value.push(current_project_url.value);
  }
  // 更新当前 URL 和路径
  current_project_url.value = target;
  current_path.value = extract_path_from_url(target);
};

// 处理导航前进：从 forward_stack 弹出，压入 back_stack
const handle_nav_next = () => {
  if (forward_stack.value.length === 0) return;
  const target = forward_stack.value.pop();
  if (!target) return;
  // 将当前 URL 压入 back_stack
  if (current_project_url.value) {
    back_stack.value.push(current_project_url.value);
  }
  // 更新当前 URL 和路径
  current_project_url.value = target;
  current_path.value = extract_path_from_url(target);
};

// 处理路径导航：将输入的相对路径附加到基础项目 URL
const handle_navigate_path = (path: string) => {
  if (!project_url.value) {
    window.alert("项目 URL 未就绪，无法导航");
    return;
  }
  try {
    const target = new URL(path, project_url.value).toString();
    // 如果目标和当前 URL 相同，不做任何操作
    if (target === current_project_url.value) return;
    // 将当前 URL 压入 back_stack，清空 forward_stack
    if (current_project_url.value) {
      back_stack.value = [...back_stack.value, current_project_url.value];
    }
    forward_stack.value = [];
    // 更新当前 URL 和路径
    current_project_url.value = target;
    current_path.value = path;
  } catch (e) {
    console.error("构造导航 URL 失败:", e);
    window.alert("无法构造目标地址，请检查输入");
  }
};

// 获取项目URL
const fetch_project_url = async () => {
  if (!props.project_id) {
    console.warn("缺少 project_id，无法获取项目URL");
    return;
  }
  
  // 清除旧的定时器
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  try {
    const result = await request({
      url: "projectinfo.getprojecturl",
      method: "post",
      data: {
        project_id: props.project_id,
      },
      showSuccessMessage: false,
      showErrorMessage: false,
    });

    if (result && result.project_url) {
      project_url.value = result.project_url;
      current_project_url.value = result.project_url;
      current_path.value = "/";
      back_stack.value = [];
      forward_stack.value = [];
      console.log("获取项目URL成功:", project_url.value);
    } else {
      project_url.value = "";
      current_project_url.value = "";
      current_path.value = "/";
      back_stack.value = [];
      forward_stack.value = [];
      console.log("项目URL为空，项目可能正在构建中，3秒后重试...");
      // 轮询：如果 URL 为空，说明可能还在部署，3秒后重试
      pollTimer = setTimeout(fetch_project_url, 3000);
    }
  } catch (error) {
    console.error("获取项目URL失败:", error);
    project_url.value = "";
    // 出错后也可以选择重试，这里暂不重试，避免死循环
  }
};

// 监听 project_id 变化，重新获取目录树和项目URL
watch(
  () => props.project_id,
  (newProjectId) => {
    if (newProjectId) {
      // 移除这里的自动获取，改为由组件触发
      // fetch_project_file_tree();
      code_content.value = ""; // 清空代码内容
      project_url.value = ""; // 清空项目URL
      current_project_url.value = "";
      current_path.value = "/";
      back_stack.value = [];
      forward_stack.value = [];
      fetch_project_url(); // 获取项目URL
    }
  },
  { immediate: true }
);

// 组件卸载时清除定时器
onUnmounted(() => {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
});
</script>

<style lang="scss" scoped>
.work-previews-pannel {
  width: 100%;
  height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
  flex: 1;

  // Head 固定，不滚动
  :deep(.work-previews-pannel-head) {
    flex-shrink: 0;
  }

  // Content 区域可滚动
  :deep(.work-previews-pannel-content) {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
}
</style>
