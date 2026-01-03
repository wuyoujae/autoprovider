<template>
  <div class="project_page">
    <div class="project_page__header">
      <div class="project_page__title_wrapper">
        <h1 class="project_page__title">{{ $t("project.title") }}</h1>
        <p class="project_page__subtitle">{{ $t("project.subtitle") }}</p>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="project_page__grid">
      <DashboardProjectItem
        v-for="project in project_list"
        :key="project.id"
        :project_data="project"
        :deleting="deleting_project_id === project.id"
        @click="handle_project_click(project.id)"
        @edit="handle_project_edit"
        @delete="handle_project_delete"
      />

      <!-- 创建新项目卡片 -->
      <DashboardProjectItem :is_create="true" @click="handle_create_project" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import DashboardProjectItem from "@/components/views/dashboard/dashboard-project/dashboard-project-item.vue";
import request from "@/api/request";
import { useUserStore } from "@/stores/user";
import message from "@/utils/message";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "building" | "error" | "draft";
  updated_at: string;
}

interface ProjectInfoFromAPI {
  project_id: string;
  author_id: string;
  project_name: string;
  project_icon: string;
  project_url: string;
  project_status: number;
  create_time: string;
}

const { t } = useI18n();
const user_store = useUserStore();
const router = useRouter();

const project_list = ref<Project[]>([]);
const is_loading = ref<boolean>(false);
const deleting_project_id = ref<string | null>(null);

// 获取用户项目列表
const fetch_user_projects = async () => {
  if (!user_store.user_info?.user_id) {
    message.warning("请先登录");
    return;
  }

  is_loading.value = true;
  try {
    const response = await request({
      url: "projectinfo.getuserprojectlist",
      method: "get",
      // user_id 会从 token 中自动解析，不需要传递
    });

    if (response && response.projects) {
      // 将后端数据转换为前端需要的格式
      project_list.value = response.projects.map(
        (project: ProjectInfoFromAPI) => ({
          id: project.project_id,
          name: project.project_name,
          description: "", // 后端暂无描述字段，可以后续添加
          status: "active" as const, // 默认状态，可以根据实际需求调整
          updated_at: project.create_time,
        })
      );
    }
  } catch (error) {
    console.error("获取项目列表失败:", error);
    message.requestError("获取项目列表失败");
  } finally {
    is_loading.value = false;
  }
};

const handle_project_click = (project_id: string) => {
  router.push({
    path: "/work",
    query: {
      projectId: project_id,
    },
  });
};

const handle_project_edit = (project_id: string) => {
  console.log("Edit project:", project_id);
  // TODO: 打开编辑对话框
};

const handle_project_delete = (project_id: string) => {
  if (!user_store.user_info?.user_id) {
    message.warning("请先登录");
    return;
  }

  if (deleting_project_id.value) {
    message.info(t("project.deletePending"));
    return;
  }

  message.confirm({
    type: "warning",
    title: t("project.deleteConfirm.title"),
    description: t("project.deleteConfirm.description"),
    cancelText: t("project.deleteConfirm.cancel"),
    confirmText: t("project.deleteConfirm.confirm"),
    onConfirm: () => delete_project(project_id),
  });
};

const delete_project = async (project_id: string) => {
  if (deleting_project_id.value) {
    return;
  }

  deleting_project_id.value = project_id;
  try {
    await request({
      url: "projectinfo.deleteproject",
      method: "post",
      data: {
        user_id: user_store.user_info?.user_id,
        project_id,
      },
      showSuccessMessage: true,
    });

    project_list.value = project_list.value.filter(
      (project) => project.id !== project_id
    );
  } catch (error) {
    console.error("删除项目失败:", error);
    message.requestError(t("project.deleteFailed"));
  } finally {
    deleting_project_id.value = null;
  }
};

const handle_create_project = () => {
  console.log("Create new project");
  router.push("/");
};

// 组件挂载时获取项目列表
onMounted(() => {
  fetch_user_projects();
});
</script>

<style lang="scss" scoped>
.project_page {
  width: 100%;

  &__header {
    margin-bottom: 2rem;
  }

  &__title_wrapper {
    width: 100%;
  }

  &__title {
    color: #fff;
    font-size: 2rem;
    font-weight: 700;
    font-family: "Source Serif 4", serif;
    margin-bottom: 0.5rem;
    letter-spacing: 0.025em;
  }

  &__subtitle {
    color: #afb3bc;
    font-size: 1rem;
    line-height: 1.6;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
    gap: 1.5rem;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .project_page {
    &__title {
      font-size: 1.5rem;
    }

    &__subtitle {
      font-size: 0.9375rem;
    }

    &__grid {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
  }
}

@media (max-width: 480px) {
  .project_page {
    &__title {
      font-size: 1.5rem;
    }

    &__subtitle {
      font-size: 0.875rem;
    }
  }
}
</style>
