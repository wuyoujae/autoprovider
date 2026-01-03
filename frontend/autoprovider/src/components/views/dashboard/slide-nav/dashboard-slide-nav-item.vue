<template>
  <div
    class="nav-item"
    :class="{ 'nav-item--active': isActive }"
    @click="handleClick"
  >
    <component :is="icon" class="nav-item__icon" />
    <span class="nav-item__text">{{ $t(`dashboard.nav.${name}`) }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { FolderOpen, CreditCard, Settings } from "lucide-vue-next";

interface Props {
  name: "projects" | "credits" | "preferences";
  isActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
});

const emit = defineEmits<{
  click: [name: string];
}>();

const { t } = useI18n();

const icon = computed(() => {
  const iconMap = {
    projects: FolderOpen,
    credits: CreditCard,
    preferences: Settings,
  };
  return iconMap[props.name];
});

const handleClick = () => {
  emit("click", props.name);
};
</script>

<style lang="scss" scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &--active {
    background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
    color: #242429;

    .nav-item__icon {
      color: #242429;
    }

    &:hover {
      background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
    }
  }

  &__icon {
    width: 1.25rem;
    height: 1.25rem;
    color: #afb3bc;
    transition: color 0.2s ease;
  }

  &__text {
    font-family: "Source Serif 4", serif;
    letter-spacing: 0.025em;
  }
}
</style>
