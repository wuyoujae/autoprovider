<template>
  <div class="previews-config">
    <div class="previews-config__panel">
      <PreviewsConfigNav :active_key="active_key" @change="handle_nav_change" />

      <div class="previews-config__content">
        <PreviewsConfigItemRules
          v-if="active_key === 'rules'"
          :project_id="props.project_id"
        />
        <PreviewsConfigItemEnvConfig
          v-else
          :project_id="props.project_id"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PreviewsConfigNav from "./previews-config-nav/previews-config-nav.vue";
import PreviewsConfigItemRules from "./previews-config-item/previews-config-item-rules.vue";
import PreviewsConfigItemEnvConfig from "./previews-config-item/previews-config-item-envConfig.vue";

interface Props {
  project_id?: string;
}

const props = defineProps<Props>();

const active_key = ref<"rules" | "envConfig">("rules");

const handle_nav_change = (key: "rules" | "envConfig") => {
  active_key.value = key;
};
</script>

<style lang="scss" scoped>
.previews-config {
  width: 100%;
  height: 100%;
  background: #242429;
  color: #fff;
  font-family: "Source Serif 4", serif;

  &__panel {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 12rem 1fr;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 0.75rem;
    overflow: hidden;

    @media (max-width: 1024px) {
      grid-template-columns: 11rem 1fr;
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }
  }

  &__content {
    width: 100%;
    height: 100%;
    background: #242429;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;

    @media (max-width: 768px) {
      border-left: none;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem;
    }
  }
}
</style>
