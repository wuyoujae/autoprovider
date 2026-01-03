<template>
  <div class="work">
    <!-- 顶部导航栏 -->
    <WorkNav
      :project_name="current_project_name"
      :user_name="user_info.name"
      :user_avatar="user_info.avatar"
      @back="handle_back"
      @github="handle_github"
      @branch="handle_branch"
      @publish="handle_publish"
    />

    <!-- 移动端/平板端标签切换 -->
    <Tabs v-model="active_tab" class="work__tabs">
      <TabsList class="work__tabs-list">
        <TabsTrigger value="chat" class="work__tabs-trigger">
          <MessageSquare class="work__tabs-icon" />
          {{ t("work.nav.chat") }}
        </TabsTrigger>
        <TabsTrigger value="preview" class="work__tabs-trigger">
          <Monitor class="work__tabs-icon" />
          {{ t("work.nav.preview") }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- 主内容区域 -->
    <div class="work__container">
      <!-- Chat 区域 -->
      <div
        class="work__chat"
        :class="{ 'work__chat--hidden': active_tab === 'preview' }"
      >
        <WorkChatPannel
          :session_list="session_list"
          :project_id="project_id || ''"
          @refresh-session-list="fetch_session_list"
          @session-change="handle_session_change"
        />
      </div>

      <!-- Preview 区域 -->
      <div
        class="work__preview work__preview--preview"
        :class="{ 'work__preview--hidden': active_tab === 'chat' }"
      >
        <WorkPreviewsPannel :project_id="project_id || ''" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { MessageSquare, Monitor } from "lucide-vue-next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkNav from "@/components/views/work/work-nav/work-nav.vue";
import WorkChatPannel from "@/components/views/work/work-chat-pannel/work-chat-pannel.vue";
import WorkPreviewsPannel from "@/components/views/work/work-previews-pannel/work-previews-pannel.vue";
import { useUserStore } from "@/stores/user";
import request from "@/api/request";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const user_store = useUserStore();

// 会话列表接口类型
interface Session {
  session_id: string;
  project_id: string;
  session_title: string;
  session_status: number;
  create_time: string;
}

// 获取projectId
const project_id = ref<string | null>(null);

// 会话列表
const session_list = ref<Session[]>([]);

// 当前活跃的标签（用于移动端/平板端切换）
const active_tab = ref<"chat" | "preview">("chat");

// 当前项目信息
const current_project_name = ref("My Project");

// 用户信息
const user_info = reactive({
  name: "John Doe",
  avatar: "",
});

// 获取会话列表
const fetch_session_list = async () => {
  const user_id = user_store.user_info?.user_id;
  const projectId = project_id.value;

  if (!user_id || !projectId) {
    console.warn("缺少user_id或project_id，无法获取会话列表");
    return;
  }

  try {
    const result = await request({
      url: "session.getSessionList",
      method: "post",
      data: {
        user_id,
        project_id: projectId,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result && result.sessions) {
      session_list.value = result.sessions || [];
    }
  } catch (error) {
    console.error("获取会话列表失败:", error);
  }
};

// 组件挂载时获取projectId和会话列表
onMounted(() => {
  const projectId = route.query.projectId as string;
  if (projectId) {
    project_id.value = projectId;
    console.log("当前项目ID:", projectId);
    // 获取会话列表
    fetch_session_list();
  } else {
    // 如果没有projectId，跳转回dashboard
    console.warn("缺少projectId参数，跳转回dashboard");
    router.push("/dashboard");
  }
});

// 监听 projectId 变化，重新获取会话列表
watch(
  () => route.query.projectId,
  (newProjectId) => {
    if (newProjectId) {
      project_id.value = newProjectId as string;
      fetch_session_list();
    }
  }
);

// 处理返回dashboard
const handle_back = () => {
  console.log("Back to dashboard");
};

// 处理GitHub连接
const handle_github = () => {
  console.log("GitHub connection");
};

// 处理分支管理
const handle_branch = () => {
  console.log("Branch management");
};

// 处理发布应用
const handle_publish = () => {
  console.log("Publish application");
};

// 处理会话切换
const handle_session_change = (sessionId: string) => {
  console.log("Session changed to:", sessionId);
  // TODO: 加载会话消息
};
</script>

<style lang="scss" scoped>
.work {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #242429;
  font-family: "Source Serif 4", serif;
  overflow: hidden;

  &__tabs {
    display: none; // 默认隐藏，只在移动端和平板端显示

    @media (max-width: 1024px) {
      display: flex;
      gap: 0;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.5rem;
    }
  }

  &__tabs-list {
    width: 100%;
    background: transparent !important;
    padding: 0 !important;
    gap: 0.5rem;
    border: none;
    border-radius: 0;
  }

  &__tabs-trigger {
    flex: 1 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0.5rem !important;
    color: rgba(255, 255, 255, 0.6) !important;
    font-size: 0.875rem !important;
    font-family: "Source Serif 4", serif !important;
    font-weight: 500 !important;
    transition: all 0.2s ease;
    box-shadow: none !important;

    &:hover {
      color: rgba(255, 255, 255, 0.8) !important;
    }

    &[data-state="active"] {
      background: transparent !important;
      border: 1px solid #feeede !important;
      color: #feeede !important;
      box-shadow: 0 0 0 2px rgba(254, 238, 222, 0.1) !important;
    }
  }

  &__tabs-icon {
    width: 1.125rem;
    height: 1.125rem;
    pointer-events: none;
    flex-shrink: 0;
  }

  &__container {
    flex: 1;
    display: flex;
    gap: 1px;
    overflow: hidden;
    min-height: 0; // 允许flex子元素收缩

    @media (max-width: 1024px) {
      position: relative;
      gap: 0;
    }
  }

  &__chat,
  &__preview {
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    @media (min-width: 1025px) {
      // 桌面端：chat 占 35%，preview 占 65%
      flex: 0 0 35%;

      &--preview {
        flex: 0 0 65%;
      }
    }

    @media (max-width: 1024px) {
      flex: 1;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      transition: opacity 0.3s ease;

      &--hidden {
        opacity: 0;
        pointer-events: none;
      }
    }
  }

  &__preview {
    border-left: 1px solid #feeede;
    border-top: 1px solid #feeede;
    border-top-left-radius: 1rem;
  }
}
</style>
