<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
const { t, locale } = useI18n();

const router = useRouter();
const user_store = useUserStore();

// 用户信息
const is_logged_in = computed(() => user_store.is_logged_in());
const user_name = computed(() => {
  if (is_logged_in.value && user_store.user_info) {
    return user_store.user_info.username;
  }
  return "请登录";
});

// 获取用户名首字母
const user_initial = computed(() => {
  if (!user_name.value || user_name.value === "请登录") {
    return "?";
  }
  return user_name.value.charAt(0).toUpperCase();
});

// 导航项
const nav_items = computed(() => [
  { id: 1, label: t("nav.changelog"), route: "/changelog" },
  { id: 2, label: t("nav.contact"), route: "mailto:dreamyitman@gmail.com" },
]);

// 语言切换
const is_language_dropdown_open = ref(false);
const languages = computed(() => [
  { code: "zh-cn", label: t("language.zh") },
  { code: "en-us", label: t("language.en") },
]);

const current_language_label = computed(() => {
  return locale.value === "zh-cn" ? t("language.zh") : t("language.en");
});

const handle_language_change = (lang: { code: string; label: string }) => {
  locale.value = lang.code;
  is_language_dropdown_open.value = false;
  is_mobile_menu_open.value = false;
  console.log("切换到语言:", lang.code);
};

const handle_user_info_click = () => {
  if (is_logged_in.value) {
    router.push("/dashboard");
  } else {
    router.push("/login");
  }
};

// 点击外部关闭下拉框
const handle_click_outside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".language_selector")) {
    is_language_dropdown_open.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handle_click_outside);
});

onUnmounted(() => {
  document.removeEventListener("click", handle_click_outside);
});

// 处理导航点击
const handle_nav_click = (route: string) => {
  console.log("导航到:", route);
  is_mobile_menu_open.value = false;
  if (route.startsWith("mailto:")) {
    window.location.href = route; // 直接唤起邮箱客户端
    return;
  }
  router.push(route);
};

// 移动端菜单控制
const is_mobile_menu_open = ref(false);
</script>

<style lang="scss">
// 全局样式覆盖Sheet组件 - welcome页面
.mobile_menu_content {
  background: rgba(36, 36, 41, 0.7) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.mobile_menu_content [data-slot="sheet-content"] {
  background: rgba(36, 36, 41, 0.7) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.mobile_menu_content .absolute.top-4.right-4 {
  color: #fff !important;
  background: transparent !important;
  border: none !important;
}

.mobile_menu_content .absolute.top-4.right-4:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 0.5rem !important;
}
</style>

<template>
  <nav class="welcome_nav">
    <!-- 桌面端布局 -->
    <div class="desktop_nav">
      <!-- 左侧空位 -->
      <div class="nav_left"></div>

      <!-- 中间导航栏 - 玻璃质感 -->
      <div class="nav_center">
        <button
          v-for="item in nav_items"
          :key="item.id"
          class="nav_item"
          @click="handle_nav_click(item.route)"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 右侧用户信息 -->
      <div class="nav_right">
        <!-- 语言切换 -->
        <div class="language_selector">
          <button
            class="language_button"
            @click="is_language_dropdown_open = !is_language_dropdown_open"
          >
            {{ current_language_label }}
            <svg
              class="dropdown_icon"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            v-if="is_language_dropdown_open"
            class="language_dropdown"
            @click.stop
          >
            <button
              v-for="lang in languages"
              :key="lang.code"
              class="language_option"
              :class="{ active: locale === lang.code }"
              @click="handle_language_change(lang)"
            >
              {{ lang.label }}
            </button>
          </div>
        </div>

        <div
          class="user_info"
          :class="{ not_logged_in: !is_logged_in }"
          @click="handle_user_info_click"
        >
          <span class="user_name">{{ user_name }}</span>
          <div class="user_avatar">{{ user_initial }}</div>
        </div>
      </div>
    </div>

    <!-- 移动端和平板端布局 -->
    <div class="mobile_nav">
      <!-- 左侧菜单按钮 -->
      <Sheet v-model:open="is_mobile_menu_open">
        <SheetTrigger as-child>
          <button class="menu_button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 12H21M3 6H21M3 18H21"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </SheetTrigger>

        <SheetContent side="left" class="mobile_menu_content">
          <div class="menu_sections">
            <!-- 导航项 -->
            <div class="menu_section">
              <button
                v-for="item in nav_items"
                :key="item.id"
                class="menu_nav_item"
                @click="handle_nav_click(item.route)"
              >
                {{ item.label }}
              </button>
            </div>

            <!-- 语言切换 -->
            <div class="menu_section">
              <div class="menu_section_title">{{ t("language.title") }}</div>
              <button
                v-for="lang in languages"
                :key="lang.code"
                class="menu_language_item"
                :class="{ active: locale === lang.code }"
                @click="handle_language_change(lang)"
              >
                {{ lang.label }}
              </button>
            </div>

            <!-- 我的项目 -->
            <div class="menu_section">
              <button class="menu_project_item" @click="handle_user_info_click">
                <div class="menu_project_content">
                  <div class="menu_project_avatar">{{ user_initial }}</div>
                  <div class="menu_project_info">
                    <div class="menu_project_name">{{ user_name }}</div>
                    <div class="menu_project_subtitle">
                      {{
                        is_logged_in
                          ? t("nav.myProjects")
                          : t("nav.pleaseLogin")
                      }}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <!-- 右侧用户信息 -->
      <div
        class="mobile_user_info"
        :class="{ hidden: is_mobile_menu_open, not_logged_in: !is_logged_in }"
        @click="handle_user_info_click"
      >
        <span class="mobile_user_name">{{ user_name }}</span>
        <div class="mobile_user_avatar">{{ user_initial }}</div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.welcome_nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 1.5rem 3rem;
}

/* 桌面端布局 */
.desktop_nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav_left {
  flex: 1;
}

/* 玻璃质感导航栏 */
.nav_center {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border-radius: 4rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav_item {
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: none;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.95rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 0.5rem;
  position: relative;
}

.nav_item:hover {
  color: #feeede;
}

/* 用户信息区域 */
.nav_right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
}

.user_info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user_info:hover .user_name {
  color: #feeede;
}

.user_info.not_logged_in {
  cursor: pointer;
}

.user_info.not_logged_in .user_name {
  color: rgba(255, 255, 255, 0.6);
}

.user_info.not_logged_in:hover .user_name {
  color: #feeede;
}

.user_name {
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.9rem;
  font-weight: 400;
  transition: color 0.3s ease;
}

.user_avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #fbe7e0;
  color: #242429;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Source Serif", serif;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

/* 语言切换 */
.language_selector {
  position: relative;
  margin-right: 1.5rem;
}

.language_button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.9rem;
  font-weight: 400;
  cursor: pointer;
  transition: color 0.3s ease;
}

.language_button:hover {
  color: #feeede;
}

.dropdown_icon {
  transition: transform 0.3s ease;
}

.language_button:hover .dropdown_icon {
  transform: rotate(180deg);
}

.language_dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 120px;
  background: rgba(36, 36, 41, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.language_option {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.9rem;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.3s ease;
}

.language_option:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #feeede;
}

.language_option.active {
  color: #feeede;
  background: rgba(254, 238, 222, 0.1);
}

/* 移动端和平板端布局 */
.mobile_nav {
  display: none;
  position: relative;
  z-index: 40;
  padding: 0.75rem 1rem;
  height: 3.5rem;
}

.menu_button {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu_button:hover {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: #feeede;
}

.mobile_user_info {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 30;
  transition: opacity 0.2s ease;
}

.mobile_user_info.hidden {
  opacity: 0;
  pointer-events: none;
}

.mobile_user_info {
  cursor: pointer;
}

.mobile_user_info.not_logged_in .mobile_user_name {
  color: rgba(255, 255, 255, 0.6);
}

.mobile_user_name {
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.9rem;
  font-weight: 400;
}

.mobile_user_avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #fbe7e0;
  color: #242429;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Source Serif", serif;
  font-size: 1rem;
  font-weight: 500;
}

/* 移动端菜单内容 */
.mobile_menu_content {
  padding: 1.5rem !important;
  /* 确保内容左对齐且占满宽度 */
  align-items: flex-start !important;
  gap: 0 !important;
}

/* 覆盖 SheetContent 组件内部的所有默认样式 */
:deep(.mobile_menu_content.flex) {
  gap: 0 !important;
}

:deep(.mobile_menu_content > *:not([data-slot="sheet-close"])) {
  width: 100%;
}

/* 调整 overlay 背景透明度 */
:deep([data-slot="sheet-overlay"]) {
  background-color: rgba(0, 0, 0, 0.5) !important;
}

.sheet_header {
  padding: 0 !important;
  gap: 0 !important;
  width: 100% !important;
  margin-bottom: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
}

.menu_title {
  color: #fff !important;
  font-family: "Source Serif", serif !important;
  font-size: 1.25rem !important;
  font-weight: 400 !important;
  text-align: left !important;
}

.menu_sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 5rem;
  padding-top: 1rem;
  width: 100%;
  align-items: flex-start;
  margin-left: 0;
  margin-right: 0;
  padding-left: 1rem;
}

.menu_section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  align-items: flex-start;
}

.menu_section_title {
  color: #afb3bc;
  font-family: "Source Serif", serif;
  font-size: 0.85rem;
  font-weight: 400;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu_nav_item {
  padding: 1rem 1.25rem;
  background: transparent;
  border: none;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 1rem;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  width: 100%;
}

.menu_nav_item:hover {
  background: rgba(254, 238, 222, 0.05);
  color: #feeede;
}

.menu_language_item {
  padding: 0.875rem 1.25rem;
  background: transparent;
  border: none;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.95rem;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  width: 100%;
}

.menu_language_item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #feeede;
}

.menu_language_item.active {
  background: rgba(254, 238, 222, 0.1);
  color: #feeede;
}

/* 我的项目 */
.menu_project_item {
  width: 100%;
  padding: 1rem 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.menu_project_item:hover {
  background: rgba(254, 238, 222, 0.05);
}

.menu_project_content {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.menu_project_avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: #fbe7e0;
  color: #242429;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Source Serif", serif;
  font-size: 1.25rem;
  font-weight: 500;
  flex-shrink: 0;
}

.menu_project_info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}

.menu_project_name {
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 1rem;
  font-weight: 400;
}

.menu_project_subtitle {
  color: #afb3bc;
  font-family: "Source Serif", serif;
  font-size: 0.85rem;
  font-weight: 400;
}

/* 响应式设计 */
/* 平板端：1024px 以下 */
@media (max-width: 1024px) {
  .welcome_nav {
    padding: 1.25rem 2rem;
  }

  .desktop_nav {
    display: none;
  }

  .mobile_nav {
    display: flex;
  }
}

/* 移动端：768px 以下 */
@media (max-width: 768px) {
  .welcome_nav {
    padding: 1rem 1.5rem;
  }

  .mobile_user_avatar {
    width: 2rem;
    height: 2rem;
    font-size: 0.9rem;
  }

  .menu_button {
    width: 2.25rem;
    height: 2.25rem;
  }

  .mobile_user_name {
    font-size: 0.85rem;
  }
}

/* 小屏移动端：480px 以下 */
@media (max-width: 480px) {
  .welcome_nav {
    padding: 0.875rem 1rem;
  }

  .mobile_user_name {
    display: none;
  }

  .menu_nav_item {
    padding: 0.875rem 1rem;
    font-size: 0.95rem;
  }

  .menu_language_item {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}
</style>
