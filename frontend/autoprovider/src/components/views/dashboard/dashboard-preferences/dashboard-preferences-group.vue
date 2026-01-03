<template>
  <div class="preferences-group">
    <!-- 分组标题 -->
    <div v-if="title || description" class="preferences-group__header">
      <h3 v-if="title" class="preferences-group__title">{{ title }}</h3>
      <p v-if="description" class="preferences-group__description">
        {{ description }}
      </p>
    </div>

    <!-- 设置项容器 -->
    <div class="preferences-group__items">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<style lang="scss" scoped>
.preferences-group {
  width: 100%;
  margin-bottom: 2.5rem;

  &__header {
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #fff;
    font-family: "Source Serif 4", serif;
    margin-bottom: 0.375rem;
    line-height: 1.3;
  }

  &__description {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Source Serif 4", serif;
    line-height: 1.5;
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .preferences-group {
    margin-bottom: 2rem;

    &__header {
      margin-bottom: 1rem;
      padding-bottom: 0.625rem;
    }

    &__title {
      font-size: 1.25rem;
    }

    &__description {
      font-size: 0.875rem;
    }

    &__items {
      gap: 0.625rem;
    }
  }
}
</style>
