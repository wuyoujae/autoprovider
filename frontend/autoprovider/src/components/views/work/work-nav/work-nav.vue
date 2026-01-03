<template>
  <header class="work-nav">
    <!-- 左边：返回按钮 + 项目名称 -->
    <div class="work-nav__left">
      <button
        class="work-nav__back-btn"
        @click="handle_back"
        :title="t('work.header.back')"
      >
        <ArrowLeft class="work-nav__back-icon" />
      </button>
      <h1 class="work-nav__title">{{ project_name }}</h1>
    </div>

    <!-- 右边：操作按钮 + 用户头像 -->
    <div class="work-nav__right">
      <!-- GitHub连接按钮 -->
      <button
        class="work-nav__action-btn"
        @click="handle_github"
        :title="t('work.header.github')"
      >
        <Github class="work-nav__action-icon" />
      </button>

      <!-- 分支管理按钮 -->
      <button
        class="work-nav__action-btn"
        @click="handle_branch"
        :title="t('work.header.branch')"
      >
        <GitBranch class="work-nav__action-icon" />
      </button>

      <!-- Publish应用按钮 -->
      <button
        class="work-nav__action-btn"
        @click="handle_publish"
        :title="t('work.header.publish')"
      >
        <Rocket class="work-nav__action-icon" />
      </button>

      <!-- 用户头像 -->
      <div class="work-nav__user-avatar">
        <img v-if="user_avatar" :src="user_avatar" :alt="user_name" />
        <span v-else class="work-nav__user-initial">
          {{ user_initial }}
        </span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ArrowLeft, Github, GitBranch, Rocket } from "lucide-vue-next";

interface Props {
  project_name?: string;
  user_name?: string;
  user_avatar?: string;
}

const props = withDefaults(defineProps<Props>(), {
  project_name: "My Project",
  user_name: "User",
  user_avatar: "",
});

const emit = defineEmits<{
  back: [];
  github: [];
  branch: [];
  publish: [];
}>();

const { t } = useI18n();
const router = useRouter();

// 获取用户首字母
const user_initial = computed(() => {
  return props.user_name.charAt(0).toUpperCase();
});

// 处理返回
const handle_back = () => {
  emit("back");
  router.push("/dashboard");
};

// 处理GitHub连接
const handle_github = () => {
  emit("github");
  // TODO: 实现GitHub连接逻辑
  console.log("GitHub connection");
};

// 处理分支管理
const handle_branch = () => {
  emit("branch");
  // TODO: 实现分支管理逻辑
  console.log("Branch management");
};

// 处理发布应用
const handle_publish = () => {
  emit("publish");
  // TODO: 实现发布逻辑
  console.log("Publish application");
};
</script>

<style lang="scss" scoped>
.work-nav {
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: #28282d;

  @media (max-width: 768px) {
    padding: 0 1rem;
    height: 3.5rem;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 0;
  }

  &__back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      color: #fff;
      transform: translateX(-2px);
    }

    @media (max-width: 768px) {
      width: 2rem;
      height: 2rem;
    }
  }

  &__back-icon {
    width: 1.25rem;
    height: 1.25rem;

    @media (max-width: 768px) {
      width: 1rem;
      height: 1rem;
    }
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
    font-family: "Source Serif 4", serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    flex: 1;
    min-width: 0;

    @media (max-width: 768px) {
      font-size: 1rem;
    }

    @media (max-width: 480px) {
      font-size: 0.875rem;
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.5rem;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(254, 238, 222, 0.1);
      border-color: rgba(254, 238, 222, 0.2);
      color: #feeede;
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      width: 2rem;
      height: 2rem;
    }
  }

  &__action-icon {
    width: 1.25rem;
    height: 1.25rem;

    @media (max-width: 768px) {
      width: 1rem;
      height: 1rem;
    }
  }

  &__user-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;

    &:hover {
      border-color: rgba(254, 238, 222, 0.3);
      transform: scale(1.05);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media (max-width: 768px) {
      width: 2rem;
      height: 2rem;
    }
  }

  &__user-initial {
    font-size: 1rem;
    font-weight: 600;
    color: #242429;
    font-family: "Source Serif 4", serif;

    @media (max-width: 768px) {
      font-size: 0.875rem;
    }
  }
}
</style>
