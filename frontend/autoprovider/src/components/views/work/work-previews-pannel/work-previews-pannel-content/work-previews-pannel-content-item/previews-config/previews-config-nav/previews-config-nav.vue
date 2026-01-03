<template>
  <nav class="previews-config-nav">
    <p class="previews-config-nav__title">
      {{ t("work.preview.config.nav.title") }}
    </p>
    <div class="previews-config-nav__list">
      <button
        v-for="item in nav_items"
        :key="item.key"
        class="previews-config-nav__item"
        :class="{
          'previews-config-nav__item--active': item.key === active_key,
        }"
        @click="handle_change(item.key)"
      >
        <component :is="item.icon" class="previews-config-nav__icon" />
        <span class="previews-config-nav__label">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { FileCode2, Settings2 } from "lucide-vue-next";

interface Props {
  active_key: "rules" | "envConfig";
}

const props = defineProps<Props>();
const emit = defineEmits<{
  change: ["rules" | "envConfig"];
}>();

const { t } = useI18n();

const nav_items = computed(() => [
  {
    key: "rules" as const,
    label: t("work.preview.config.nav.rules"),
    icon: FileCode2,
  },
  {
    key: "envConfig" as const,
    label: t("work.preview.config.nav.envConfig"),
    icon: Settings2,
  },
]);

const active_key = computed(() => props.active_key);

const handle_change = (key: "rules" | "envConfig") => {
  if (key !== active_key.value) {
    emit("change", key);
  }
};
</script>

<style lang="scss" scoped>
.previews-config-nav {
  width: 100%;
  height: 100%;
  background: #242429;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 768px) {
    height: auto;
    flex-direction: row;
    align-items: center;
    padding: 1rem;
    gap: 0.75rem;
  }

  &__title {
    margin: 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    @media (max-width: 768px) {
      flex-direction: row;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }

  &__item {
    width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 0.5rem;
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
    outline: none;

    @media (max-width: 768px) {
      width: auto;
      padding: 0.55rem 0.85rem;
    }

    &:hover {
      color: #feeede;
    }

    &--active {
      color: #feeede;
      background: rgba(254, 238, 222, 0.08);
      border-color: rgba(254, 238, 222, 0.25);
    }
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    color: currentColor;
  }

  &__label {
    font-family: "Source Serif 4", serif;
  }
}
</style>
