<template>
  <div class="agent-message-item-sql">
    <Database class="agent-message-item-sql__icon" />
    <span class="agent-message-item-sql__text">正在进行 SQL 操作</span>
  </div>
</template>

<script setup lang="ts">
import { Database } from "lucide-vue-next";
</script>

<style lang="scss" scoped>
.agent-message-item-sql {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.5rem;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.875rem;
  font-family: "Source Serif 4", serif;

  &__icon {
    width: 1rem;
    height: 1rem;
    color: rgba(254, 238, 222, 0.7);
    flex-shrink: 0;
  }

  &__text {
    flex: 1;
  }
}
</style>
