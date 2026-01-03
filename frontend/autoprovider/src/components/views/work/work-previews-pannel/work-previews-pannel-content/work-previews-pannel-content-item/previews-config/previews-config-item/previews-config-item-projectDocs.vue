<template>
  <div class="config-project-docs">
    <div class="config-project-docs__empty">
      <p class="config-project-docs__title">
        {{ t("work.preview.config.projectDocs.title") }}
      </p>
      <p class="config-project-docs__desc">
        {{ t("work.preview.config.projectDocs.desc") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface Props {
  project_id?: string;
}

defineProps<Props>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.config-project-docs {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;

  &__empty {
    text-align: center;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    max-width: 32rem;
  }

  &__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #feeede;
  }

  &__desc {
    margin: 0.5rem 0 0;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
  }
}
</style>
