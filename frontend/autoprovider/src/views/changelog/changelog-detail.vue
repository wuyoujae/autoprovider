<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, Calendar, Tag } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import request from "@/api/request";
import { computed } from "vue";

interface ChangelogDetail {
  changelog_id: string;
  version: string;
  title: string;
  summary?: string;
  content_html: string;
  tags?: string[];
  release_date: string;
}

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const changelog = ref<ChangelogDetail | null>(null);
const errorMessage = ref("");

const formattedReleaseDate = computed(() => {
  const raw = changelog.value?.release_date;
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
});

const fetchDetail = async () => {
  try {
    loading.value = true;
    errorMessage.value = "";
    const idParam = route.params.id;
    const id = typeof idParam === "string" ? idParam : Array.isArray(idParam) ? idParam[0] : "";
    if (!id) {
      errorMessage.value = "缺少 changelog_id";
      loading.value = false;
      return;
    }
    const data = await request({
      url: "changelog.getDetail",
      method: "get",
      params: { id },
      showErrorMessage: false,
    });
    changelog.value = data || null;
    if (!data) {
      errorMessage.value = "未找到对应的更新日志";
    }
  } catch (error) {
    console.error(error);
    errorMessage.value = "获取更新日志详情失败，请稍后重试";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDetail();
});

const goBack = () => {
  router.push("/changelog");
};
</script>

<template>
  <div class="changelog_detail_container">
    <!-- 返回按钮 -->
    <button class="back-button" @click="goBack">
      <ArrowLeft :size="20" />
      <span class="back-text">Back to List</span>
    </button>

    <div class="content_wrapper">
      <div v-if="loading" class="loading_skeleton">
        <Skeleton class="h-12 w-3/4 mb-4 bg-white/10" />
        <Skeleton class="h-6 w-1/4 mb-8 bg-white/10" />
        <Skeleton class="h-4 w-full mb-2 bg-white/10" />
        <Skeleton class="h-4 w-full mb-2 bg-white/10" />
        <Skeleton class="h-4 w-2/3 bg-white/10" />
      </div>

      <div v-else-if="changelog" class="detail_content">
        <div class="header">
          <div class="meta_info">
            <Badge variant="outline" class="version_badge">{{
              changelog.version
            }}</Badge>
            <span class="date"
              ><Calendar class="w-4 h-4 mr-2 inline" />{{
                formattedReleaseDate
              }}</span
            >
          </div>
          <h1 class="title">{{ changelog.title }}</h1>
          <div class="tags">
            <Badge
              v-for="tag in changelog.tags"
              :key="tag"
              variant="secondary"
              class="tag_badge"
            >
              <Tag class="w-3 h-3 mr-1" /> {{ tag }}
            </Badge>
          </div>
        </div>

        <div class="markdown_body" v-html="changelog.content_html"></div>
      </div>

      <div v-else class="not_found">
        <h2>{{ errorMessage || "Changelog not found" }}</h2>
        <Button @click="goBack">Return to list</Button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.changelog_detail_container {
  width: 100%;
  min-height: 100vh;
  background-color: #242429;
  color: #fff;
  font-family: "Source Serif 4", serif;
}

.back-button {
  position: fixed;
  top: 2rem;
  left: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(254, 238, 222, 0.1);
  border: 1px solid rgba(254, 238, 222, 0.2);
  border-radius: 0.5rem;
  color: #fff;
  font-family: "Source Serif 4", serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;

  &:hover {
    background: rgba(254, 238, 222, 0.15);
    color: #fdc4c4;
    border-color: rgba(254, 238, 222, 0.3);
  }

  @media (max-width: 768px) {
    top: 1rem;
    left: 1rem;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;

    .back-text {
      display: none;
    }
  }
}

.content_wrapper {
  padding-top: 120px;
  padding-bottom: 60px;
  max-width: 800px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}

.header {
  margin-bottom: 3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 2rem;
}

.meta_info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  color: #afb3bc;
}

.version_badge {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 0.9rem;
  padding: 0.25rem 0.75rem;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  background: linear-gradient(135deg, #fff 0%, #feeede 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tags {
  display: flex;
  gap: 0.5rem;
}

.tag_badge {
  background-color: rgba(255, 255, 255, 0.05);
  color: #afb3bc;
  font-weight: normal;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

/* Markdown Content Styling */
.markdown_body {
  color: #d1d5db;
  line-height: 1.8;
  font-size: 1.1rem;

  :deep(h2) {
    font-size: 1.8rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #fff;
    font-weight: 600;
  }

  :deep(h3) {
    font-size: 1.4rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #feeede;
    font-weight: 500;
  }

  :deep(p) {
    margin-bottom: 1.25rem;
  }

  :deep(ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin-bottom: 1.5rem;
  }

  :deep(li) {
    margin-bottom: 0.5rem;
  }

  :deep(strong) {
    color: #fff;
    font-weight: 600;
  }
}

.not_found {
  text-align: center;
  padding: 4rem 0;

  h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
}

@media (max-width: 768px) {
  .content_wrapper {
    padding-top: 100px;
  }

  .title {
    font-size: 2rem;
  }
}
</style>
