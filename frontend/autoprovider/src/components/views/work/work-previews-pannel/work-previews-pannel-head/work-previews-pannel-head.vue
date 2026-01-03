<template>
  <div class="work-previews-pannel-head">
    <div class="work-previews-pannel-head__left">
      <button
        v-for="item in menu_items"
        :key="item.value"
        class="work-previews-pannel-head__button"
        :class="{
          'work-previews-pannel-head__button--active':
            item.value === props.active_tab,
        }"
        @click="handle_tab_click(item.value)"
      >
        <component :is="item.icon" class="work-previews-pannel-head__icon" />
        <span class="work-previews-pannel-head__text">{{ item.label }}</span>
      </button>
    </div>

    <div class="work-previews-pannel-head__right">
      <!-- 导航按钮 -->
      <button
        class="work-previews-pannel-head__action-btn"
        :class="{ 'work-previews-pannel-head__action-btn--disabled': !props.can_go_back }"
        :disabled="!props.can_go_back"
        @click="handle_nav_prev"
      >
        <ChevronLeft class="work-previews-pannel-head__action-icon" />
      </button>
      <button
        class="work-previews-pannel-head__action-btn"
        :class="{ 'work-previews-pannel-head__action-btn--disabled': !props.can_go_forward }"
        :disabled="!props.can_go_forward"
        @click="handle_nav_next"
      >
        <ChevronRight class="work-previews-pannel-head__action-icon" />
      </button>

      <!-- 设备选择器 -->
      <Select v-model="selected_device">
        <SelectTrigger class="work-previews-pannel-head__device-trigger">
          <component
            :is="selected_device_icon"
            class="work-previews-pannel-head__device-icon"
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desktop">
            <Monitor class="work-previews-pannel-head__select-icon" />
            <span style="margin-left: 0.5rem">{{
              t("work.preview.head.devices.desktop")
            }}</span>
          </SelectItem>
          <SelectItem value="tablet">
            <Tablet class="work-previews-pannel-head__select-icon" />
            <span style="margin-left: 0.5rem">{{
              t("work.preview.head.devices.tablet")
            }}</span>
          </SelectItem>
          <SelectItem value="phone">
            <Smartphone class="work-previews-pannel-head__select-icon" />
            <span style="margin-left: 0.5rem">{{
              t("work.preview.head.devices.phone")
            }}</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- 刷新按钮 -->
      <button
        class="work-previews-pannel-head__action-btn"
        @click="handle_refresh"
      >
        <RefreshCw class="work-previews-pannel-head__action-icon" />
      </button>

      <!-- URL 输入框 -->
      <div class="work-previews-pannel-head__url-container">
        <input
          v-model="preview_url"
          type="text"
          class="work-previews-pannel-head__url-input"
          :placeholder="t('work.preview.head.urlPlaceholder')"
          @keyup.enter="handle_submit_path"
        />
        <ArrowUpRight
          class="work-previews-pannel-head__url-icon"
          @click="handle_submit_path"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Smartphone,
  Code,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Tablet,
  RefreshCw,
  Globe,
  ArrowUpRight,
} from "lucide-vue-next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const { t } = useI18n();

// Props
interface Props {
  active_tab: string;
  selected_device: string;
  current_path?: string;
  can_go_back?: boolean;
  can_go_forward?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  current_path: "/",
  can_go_back: false,
  can_go_forward: false,
});

// Emits
const emit = defineEmits<{
  "tab-click": [value: string];
  "device-change": [value: string];
  refresh: [];
  "nav-prev": [];
  "nav-next": [];
  "navigate-path": [path: string];
}>();

// 当前选中的设备（使用 props）
const selected_device = computed({
  get: () => props.selected_device,
  set: (value) => {
    emit("device-change", value);
  },
});

// URL 地址
const preview_url = ref<string>("/");

// 同步父组件传入的 current_path 到输入框
watch(
  () => props.current_path,
  (val) => {
    if (typeof val === "string") {
      preview_url.value = val || "/";
    }
  },
  { immediate: true }
);

// 菜单项配置
const menu_items = [
  {
    value: "app",
    label: t("work.preview.head.app"),
    icon: Globe, // 在移动端使用 Globe 而不是 Smartphone
  },
  {
    value: "code",
    label: t("work.preview.head.code"),
    icon: Code,
  },
  {
    value: "database",
    label: t("work.preview.head.database"),
    icon: Database,
  },
  {
    value: "config",
    label: t("work.preview.head.config"),
    icon: Settings,
  },
];

// 根据选中的设备返回对应的图标
const selected_device_icon = computed(() => {
  switch (props.selected_device) {
    case "desktop":
      return Monitor;
    case "tablet":
      return Tablet;
    case "phone":
      return Smartphone;
    default:
      return Monitor;
  }
});

// 处理标签点击
const handle_tab_click = (value: string) => {
  emit("tab-click", value);
};

// 处理导航上一页
const handle_nav_prev = () => {
  emit("nav-prev");
};

// 处理导航下一页
const handle_nav_next = () => {
  emit("nav-next");
};

// 路径提交（回车或点击图标）
const handle_submit_path = () => {
  const path = (preview_url.value || "").trim();
  if (!path) return;
  if (!path.startsWith("/")) {
    window.alert("路径必须以 / 开头");
    return;
  }
  emit("navigate-path", path);
};

// 监听设备切换
watch(
  () => selected_device.value,
  (value) => {
    console.log("Device changed to:", value);
    // computed setter 会自动触发 emit，这里只是打印日志
  }
);

// 处理刷新
const handle_refresh = () => {
  emit("refresh");
};
</script>

<style lang="scss" scoped>
.work-previews-pannel-head {
  width: 100%;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);

  @media (max-width: 768px) {
    padding: 0.375rem 1.25rem;
  }

  @media (max-width: 480px) {
    padding: 0.375rem 1rem;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 0.375rem;

    @media (max-width: 480px) {
      gap: 0.25rem;

      // 移动端只显示 APP 按钮
      :deep(.work-previews-pannel-head__button:not(:first-child)) {
        display: none;
      }
    }
  }

  &__button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.8125rem;
    font-family: "Source Serif 4", serif;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;

    @media (max-width: 480px) {
      padding: 0.25rem 0.625rem;
      gap: 0.25rem;
      font-size: 0.75rem;
    }

    &:hover {
      color: rgba(255, 255, 255, 0.7);
    }

    &--active {
      color: #feeede;
      font-weight: 600;
    }
  }

  &__icon {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
    color: currentColor;

    @media (max-width: 480px) {
      width: 0.75rem;
      height: 0.75rem;
    }
  }

  &__text {
    font-family: "Source Serif 4", serif;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    @media (max-width: 480px) {
      gap: 0.375rem;
    }
  }

  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.375rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 0.375rem;

    @media (max-width: 480px) {
      padding: 0.25rem;
    }

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.8);
    }

    &:active:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
    }

    &--disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &__action-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__device-trigger {
    width: 2rem;
    height: 2rem;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 0.375rem !important;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;

    @media (max-width: 480px) {
      width: 1.75rem;
      height: 1.75rem;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }

    // 隐藏默认的下拉箭头
    // 保留第一个 svg（设备图标），隐藏其他的 svg（ChevronDown）
    :deep(svg:not(:first-child)) {
      display: none !important;
    }
  }

  &__device-icon {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;

    @media (max-width: 480px) {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  &__select-icon {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }

  &__url-container {
    flex: 1;
    min-width: 10rem;
    display: flex;
    align-items: center;
    position: relative;

    @media (max-width: 768px) {
      min-width: 8rem;
    }

    @media (max-width: 480px) {
      min-width: 6rem;
    }
  }

  &__url-input {
    width: 100%;
    padding: 0.375rem 2rem 0.375rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8125rem;
    font-family: "Source Serif 4", serif;
    outline: none;
    transition: all 0.2s ease;

    @media (max-width: 480px) {
      padding: 0.25rem 1.5rem 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    &:focus {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.8);
    }
  }

  &__url-icon {
    position: absolute;
    right: 0.5rem;
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    flex-shrink: 0;

    @media (max-width: 480px) {
      right: 0.375rem;
      width: 0.875rem;
      height: 0.875rem;
    }
  }
}
</style>

<style lang="scss">
// 全局样式覆盖，修复 shadcn select 背景色和下拉面板样式
// 由于使用 SelectPortal，样式会被渲染到 body 中，所以使用全局选择器
[data-slot="select-content"] {
  background: linear-gradient(
    135deg,
    rgba(36, 36, 41, 0.98) 0%,
    rgba(36, 36, 41, 0.95) 100%
  ) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 0.75rem !important;
  color: #fff !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(254, 238, 222, 0.05) !important;
  backdrop-filter: blur(1rem) !important;
  outline: none !important;

  &::-webkit-scrollbar {
    width: 0.375rem !important;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03) !important;
    border-radius: 0.25rem !important;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(254, 238, 222, 0.2) !important;
    border-radius: 0.25rem !important;
    transition: background 0.2s ease !important;

    &:hover {
      background: rgba(254, 238, 222, 0.35) !important;
    }
  }
}

// 覆盖 select item 的样式
[data-slot="select-item"] {
  color: rgba(255, 255, 255, 0.85) !important;
  background: transparent !important;
  border-radius: 0.5rem !important;
  padding: 0.625rem 0.875rem !important;
  margin: 0.125rem 0 !important;
  transition: color 0.2s ease !important;
  font-size: 0.9375rem !important;
  font-family: "Source Serif 4", serif !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  outline: none !important;

  &:hover {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #fff !important;
  }

  &[data-highlighted] {
    background: rgba(254, 238, 222, 0.12) !important;
    color: #feeede !important;
  }

  &[data-disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    font-size: 0.875rem !important;
    padding: 0.5625rem 0.75rem !important;
  }
}
</style>
