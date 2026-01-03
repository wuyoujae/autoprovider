<template>
  <div class="preferences-search">
    <div class="preferences-search__input-wrapper">
      <Search class="preferences-search__icon" />
      <Input
        v-model="search_value"
        type="text"
        :placeholder="$t('preferences.search.placeholder')"
        class="preferences-search__input"
        @input="handleSearchInput"
      />
      <button
        v-if="search_value"
        class="preferences-search__clear"
        @click="handleClear"
      >
        <X class="preferences-search__clear-icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Search, X } from "lucide-vue-next";
import { Input } from "@/components/ui/input";

const { t } = useI18n();

// 搜索值
const search_value = ref("");

// 定义 emit
const emit = defineEmits<{
  search: [value: string];
}>();

// 处理搜索输入
const handleSearchInput = () => {
  emit("search", search_value.value);
};

// 清除搜索
const handleClear = () => {
  search_value.value = "";
  emit("search", "");
};
</script>

<style lang="scss" scoped>
.preferences-search {
  width: 100%;
  margin-bottom: 2rem;

  &__input-wrapper {
    position: relative;
    width: 100%;
    max-width: 40rem;
  }

  &__icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
    z-index: 1;
  }

  &__input {
    width: 100%;
    height: 3rem;
    padding: 0 3rem 0 3rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    color: #fff;
    font-size: 1rem;
    font-family: "Source Serif 4", serif;
    transition: all 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    &:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(254, 238, 222, 0.3);
      box-shadow: 0 0 0 3px rgba(254, 238, 222, 0.1);
    }

    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  &__clear {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.5);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &-icon {
      width: 1rem;
      height: 1rem;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .preferences-search {
    margin-bottom: 1.5rem;

    &__input-wrapper {
      max-width: 100%;
    }

    &__input {
      height: 2.75rem;
      font-size: 0.9375rem;
    }
  }
}
</style>
