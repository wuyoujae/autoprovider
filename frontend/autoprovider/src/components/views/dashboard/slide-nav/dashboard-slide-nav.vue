<template>
  <!-- 桌面端固定侧边栏 -->
  <aside class="slide-nav slide-nav--desktop">
    <div class="slide-nav__content">
      <!-- Logo区域 -->
      <div class="slide-nav__logo">
        <img
          src="/src/static/logo.png"
          alt="AutoProvider"
          class="slide-nav__logo-img"
        />
        <span class="slide-nav__logo-text">{{ $t("platform.name") }}</span>
      </div>

      <!-- 导航菜单 -->
      <nav class="slide-nav__menu">
        <DashboardSlideNavItem
          v-for="item in navItems"
          :key="item.name"
          :name="item.name"
          :is-active="activeItem === item.name"
          @click="handleNavClick"
        />
      </nav>

      <!-- 用户信息 -->
      <DashboardSlideNavUserinfo
        :user-name="userName"
        :user-email="userEmail"
        @logout-click="handleLogoutClick"
        @delete-account-click="handleDeleteAccountClick"
      />
    </div>
  </aside>

  <!-- 移动端导航栏 -->
  <div class="mobile-nav">
    <!-- 移动端顶部栏 -->
    <div class="mobile-nav__header">
      <button class="mobile-nav__menu-btn" @click="isSheetOpen = true">
        <Menu class="mobile-nav__menu-icon" />
      </button>
      <div class="mobile-nav__logo">
        <img
          src="/src/static/logo.png"
          alt="AutoProvider"
          class="mobile-nav__logo-img"
        />
        <span class="mobile-nav__logo-text">{{ $t("platform.name") }}</span>
      </div>
    </div>
  </div>

  <!-- 移动端抽屉菜单 -->
  <Sheet v-model:open="isSheetOpen">
    <SheetContent side="left" class="mobile-sheet-content">
      <div class="mobile-sheet__content">
        <!-- Logo区域 -->
        <div class="mobile-sheet__logo">
          <img
            src="/src/static/logo.png"
            alt="AutoProvider"
            class="mobile-sheet__logo-img"
          />
          <span class="mobile-sheet__logo-text">{{ $t("platform.name") }}</span>
        </div>

        <!-- 导航菜单 -->
        <nav class="mobile-sheet__menu">
          <DashboardSlideNavItem
            v-for="item in navItems"
            :key="item.name"
            :name="item.name"
            :is-active="activeItem === item.name"
            @click="handleMobileNavClick"
          />
        </nav>

        <!-- 用户信息 -->
        <DashboardSlideNavUserinfo
          :user-name="userName"
          :user-email="userEmail"
          @logout-click="handleLogoutClick"
          @delete-account-click="handleDeleteAccountClick"
        />
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, useRoute } from "vue-router";
import { Menu } from "lucide-vue-next";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import DashboardSlideNavItem from "./dashboard-slide-nav-item.vue";
import DashboardSlideNavUserinfo from "./dashboard-slide-nav-userinfo.vue";
import { useUserStore } from "@/stores/user";

interface NavItem {
  name: "projects" | "credits" | "preferences";
}

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const user_store = useUserStore();

// 移动端抽屉菜单状态
const isSheetOpen = ref(false);

// 导航项配置
const navItems: NavItem[] = [
  { name: "projects" },
  { name: "credits" },
  { name: "preferences" },
];

// 当前激活的导航项
const activeItem = ref<"projects" | "credits" | "preferences">("projects");

// 用户信息 - 从 store 获取
const userName = computed(() => user_store.user_info?.username || "");
const userEmail = computed(() => user_store.user_info?.account || "");

// 组件挂载时获取用户信息
onMounted(async () => {
  // 如果已登录但没有完整的用户信息，则重新获取
  if (user_store.is_logged_in() && !user_store.user_info) {
    await user_store.fetch_user_info();
  }
});

// 根据当前路由设置激活项
const updateActiveItem = () => {
  const currentPath = route.path;
  if (currentPath.includes("/credits")) {
    activeItem.value = "credits";
  } else if (currentPath.includes("/preferences")) {
    activeItem.value = "preferences";
  } else {
    activeItem.value = "projects";
  }
};

// 监听路由变化
watch(() => route.path, updateActiveItem, { immediate: true });

// 桌面端导航点击处理
const handleNavClick = (name: string) => {
  activeItem.value = name as "projects" | "credits" | "preferences";
  router.push(`/dashboard/${name}`);
};

// 移动端导航点击处理
const handleMobileNavClick = (name: string) => {
  activeItem.value = name as "projects" | "credits" | "preferences";
  // 关闭抽屉菜单
  isSheetOpen.value = false;
  router.push(`/dashboard/${name}`);
};

// 退出登录处理
const handleLogoutClick = () => {
  console.log("Logout");
  // 清除用户信息和 token
  user_store.clear_user_token();
  // 跳转到登录页面
  router.push("/login");
};

// 注销账号处理
const handleDeleteAccountClick = () => {
  console.log("Delete account");
  // TODO: 添加确认对话框和注销账号 API 调用
  // 暂时只执行退出登录
  user_store.clear_user_token();
  router.push("/login");
};
</script>

<style lang="scss">
// 全局样式覆盖Sheet组件
.mobile-sheet-content {
  background: #242429 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.mobile-sheet-content [data-slot="sheet-content"] {
  background: #242429 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.mobile-sheet-content .absolute.top-4.right-4 {
  color: #fff !important;
  background: transparent !important;
  border: none !important;
}

.mobile-sheet-content .absolute.top-4.right-4:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 0.5rem !important;
}
</style>

<style lang="scss" scoped>
.slide-nav {
  width: 16rem;
  height: 100vh;
  background: #242429;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  user-select: none;

  &__content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem 0 0 0;
  }

  &__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.5rem;
    margin-bottom: 2rem;

    &-img {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
    }

    &-text {
      color: #fff;
      font-size: 1.25rem;
      font-weight: 700;
      font-family: "Source Serif 4", serif;
      letter-spacing: 0.025em;
    }
  }

  &__menu {
    flex: 1;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
}

// 桌面端显示
.slide-nav--desktop {
  @media (max-width: 768px) {
    display: none;
  }
}

// 移动端导航栏样式
.mobile-nav {
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    background: #242429;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  &__header {
    display: grid;
    grid-template-columns: 2.5rem 1fr 2.5rem;
    align-items: center;
    padding: 0.75rem 1rem;
    height: 3.5rem;
  }

  &__menu-btn {
    width: 2.5rem;
    height: 2.5rem;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: #fff;
    grid-column: 1;
    justify-self: start;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
    }
  }

  &__menu-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  &__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    grid-column: 2;
  }

  &__logo-img {
    width: 1.75rem;
    height: 1.75rem;
    object-fit: contain;
  }

  &__logo-text {
    color: #fff;
    font-size: 1.125rem;
    font-weight: 700;
    font-family: "Source Serif 4", serif;
    letter-spacing: 0.025em;
  }
}

// 移动端抽屉菜单样式
.mobile-sheet {
  &__content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1.5rem 0 0 0;
  }

  &__logo {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 1.5rem;
    margin-bottom: 2rem;
  }

  &__logo-img {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
  }

  &__logo-text {
    color: #fff;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: "Source Serif 4", serif;
    letter-spacing: 0.025em;
  }

  &__menu {
    flex: 1;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .slide-nav--desktop {
    display: none;
  }
}

@media (min-width: 769px) {
  .mobile-nav {
    display: none !important;
  }
}
</style>
