<template>
  <div
    class="database-catalogue-item"
    :class="{
      'database-catalogue-item--active': is_active,
    }"
    @click="handle_click"
  >
    <Table class="database-catalogue-item__icon" />
    <span class="database-catalogue-item__name">{{ table_name }}</span>
  </div>
</template>

<script setup lang="ts">
import { Table } from "lucide-vue-next";

interface Props {
  table_name: string;
  is_active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  is_active: false,
});

const emit = defineEmits<{
  click: [];
}>();

const handle_click = () => {
  emit("click");
};
</script>

<style lang="scss" scoped>
.database-catalogue-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-family: "Source Serif 4", serif;
  transition: color 0.2s ease, background-color 0.2s ease;
  border-radius: 0.25rem;
  cursor: pointer;
  outline: none;

  @media (max-width: 768px) {
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    gap: 0.4rem;
  }

  @media (max-width: 480px) {
    padding: 0.3125rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.375rem;
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
  }

  &--active {
    background-color: rgba(254, 238, 222, 0.1);
    color: rgba(254, 238, 222, 0.95);

    &:hover {
      background-color: rgba(254, 238, 222, 0.12);
      color: rgba(254, 238, 222, 1);
    }

    .database-catalogue-item__icon {
      color: rgba(254, 238, 222, 0.8);
    }
  }

  &__icon {
    width: 0.9375rem;
    height: 0.9375rem;
    flex-shrink: 0;
    color: rgba(251, 231, 224, 0.5);
    transition: color 0.2s ease;

    @media (max-width: 768px) {
      width: 0.875rem;
      height: 0.875rem;
    }

    @media (max-width: 480px) {
      width: 0.8125rem;
      height: 0.8125rem;
    }
  }

  &__name {
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
