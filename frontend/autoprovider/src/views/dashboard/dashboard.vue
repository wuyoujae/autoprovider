<template>
  <div class="dashboard">
    <!-- 侧边导航栏 -->
    <DashboardSlideNav />

    <!-- 主内容区域 -->
    <main class="dashboard__main">
      <div class="dashboard__content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import DashboardSlideNav from "../../components/views/dashboard/slide-nav/dashboard-slide-nav.vue";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: #242429;

  &__main {
    flex: 1;
    margin-left: 16rem; // 为侧边导航栏留出空间
    padding: 2rem;
    background: #242429;

    @media (max-width: 768px) {
      margin-left: 0;
      padding-top: 6rem; // 为移动端顶部导航栏(3.5rem)留出空间，加上内容padding
    }
  }

  &__content {
    max-width: 1200px;
    margin: 0 auto;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard {
    &__main {
      padding: 1.5rem;
      padding-top: 6rem; // 确保移动端有足够的顶部空间
    }
  }
}

@media (max-width: 480px) {
  .dashboard {
    &__main {
      padding: 1rem;
      padding-top: 5rem; // 移动端更小的顶部padding
    }
  }
}
</style>
