<script setup lang="ts">
import { onMounted, ref } from "vue";
import ChangelogItem from "./changelog-item.vue";
import request from "@/api/request";

interface ChangelogListItem {
  changelog_id: string;
  version: string;
  title: string;
  summary: string;
  tags?: string[];
  release_date: string;
}

const changelogs = ref<ChangelogListItem[]>([]);
const loading = ref(false);
const errorMessage = ref("");

const fetchList = async () => {
  try {
    loading.value = true;
    errorMessage.value = "";
    const data = await request({
      url: "changelog.getList",
      method: "get",
      showErrorMessage: false,
    });
    changelogs.value = Array.isArray(data) ? data : [];
  } catch (error) {
    errorMessage.value = "获取更新日志失败，请稍后重试";
    console.error(error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="changelog_list">
    <div class="timeline_line"></div>

    <div v-if="loading" class="placeholder">加载中...</div>
    <div v-else-if="errorMessage" class="placeholder error">{{ errorMessage }}</div>
    <div v-else-if="!changelogs.length" class="placeholder">暂无更新日志</div>

    <div
      v-else
      v-for="item in changelogs"
      :key="item.changelog_id"
      class="changelog_wrapper"
    >
      <div class="timeline_dot"></div>
      <ChangelogItem
        :id="item.changelog_id"
        :version="item.version"
        :date="item.release_date"
        :title="item.title"
        :description="item.summary || ''"
        :tags="item.tags"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.changelog_list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding-left: 2rem;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding-left: 1.5rem;
  }
}

.placeholder {
  color: #afb3bc;
  font-size: 0.95rem;
  padding: 0.5rem 0;
}

.placeholder.error {
  color: #ef4444;
}

.timeline_line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
}

.changelog_wrapper {
  position: relative;
}

.timeline_dot {
  position: absolute;
  left: -2.45rem; /* 调整以对齐线条 (padding-left 2rem + dot half width) */
  top: 1.5rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: #242429;
  border: 2px solid rgba(255, 255, 255, 0.3);
  z-index: 1;
  transition: all 0.3s ease;

  .changelog_wrapper:hover & {
    border-color: #fff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    left: -1.95rem;
  }
}
</style>

