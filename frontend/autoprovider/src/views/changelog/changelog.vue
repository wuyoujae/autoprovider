<script setup lang="ts">
import { useRouter } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
import ChangelogList from "@/components/views/changelog/changelog-list.vue";

const router = useRouter();

const handle_back = () => {
  router.push("/");
};
</script>

<template>
  <div class="changelog_container">
    <!-- 返回按钮 -->
    <button class="back-button" @click="handle_back">
      <ArrowLeft :size="20" />
      <span class="back-text">Back</span>
    </button>

    <div class="content_wrapper">
      <div class="header_section">
        <h1 class="page_title">Changelog</h1>
        <p class="page_subtitle">
          Latest updates and improvements to our platform.
        </p>
      </div>
      <ChangelogList />
    </div>
  </div>
</template>

<style scoped lang="scss">
.changelog_container {
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
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}

.header_section {
  text-align: center;
  margin-bottom: 60px;
}

.page_title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff 0%, #feeede 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page_subtitle {
  font-size: 1.2rem;
  color: #afb3bc;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .content_wrapper {
    padding-top: 100px;
  }

  .page_title {
    font-size: 2.5rem;
  }

  .page_subtitle {
    font-size: 1rem;
  }
}
</style>
