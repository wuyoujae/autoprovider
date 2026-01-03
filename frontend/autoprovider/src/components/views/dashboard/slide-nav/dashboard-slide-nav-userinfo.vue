<template>
  <div class="user-info-wrapper">
    <!-- 用户信息展示区域 - 点击打开弹出层 -->
    <div class="user-info" @click="isPopupOpen = !isPopupOpen">
      <div class="user-info__avatar">
        <img
          v-if="userAvatar"
          :src="userAvatar"
          :alt="userName"
          class="user-info__avatar-img"
        />
        <div v-else class="user-info__avatar-placeholder">
          {{ userName?.charAt(0)?.toUpperCase() || "U" }}
        </div>
      </div>
      <div class="user-info__details">
        <div class="user-info__name">{{ userName || $t("user.name") }}</div>
        <div class="user-info__email">{{ userEmail }}</div>
      </div>
    </div>

    <!-- 移动端：底部Sheet弹出层 -->
    <Sheet v-model:open="isPopupOpen" v-if="isMobile">
      <SheetContent side="bottom" class="user-info-sheet-content">
        <div class="user-info-popup">
          <!-- 用户信息区域 -->
          <div class="user-info-popup__header">
            <div class="user-info-popup__avatar">
              <img
                v-if="userAvatar"
                :src="userAvatar"
                :alt="userName"
                class="user-info-popup__avatar-img"
              />
              <div v-else class="user-info-popup__avatar-placeholder">
                {{ userName?.charAt(0)?.toUpperCase() || "U" }}
              </div>
            </div>
            <div class="user-info-popup__info">
              <div class="user-info-popup__name">
                {{ userName || $t("user.name") }}
              </div>
              <div class="user-info-popup__email">{{ userEmail }}</div>
            </div>
          </div>

          <!-- 语言切换 -->
          <div class="user-info-popup__section">
            <div class="user-info-popup__section-title">
              {{ $t("language.title") }}
            </div>
            <div class="user-info-popup__language-list">
              <button
                v-for="lang in languages"
                :key="lang.code"
                class="user-info-popup__language-btn"
                :class="{ active: locale === lang.code }"
                @click="handleLanguageChange(lang.code)"
              >
                {{ lang.label }}
              </button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="user-info-popup__actions">
            <button
              class="user-info-popup__action-btn user-info-popup__action-btn--logout"
              @click="handleLogout"
            >
              <LogOut class="user-info-popup__action-icon" />
              {{ $t("dashboard.user.logout") }}
            </button>
            <button
              class="user-info-popup__action-btn user-info-popup__action-btn--delete"
              @click="handleDeleteAccount"
            >
              <Trash2 class="user-info-popup__action-icon" />
              {{ $t("dashboard.user.delete") }}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <!-- 桌面端：居中Dialog弹出层 -->
    <div
      v-if="!isMobile && isPopupOpen"
      class="user-info-dialog-overlay"
      @click="isPopupOpen = false"
    >
      <div class="user-info-dialog" @click.stop>
        <!-- 关闭按钮 -->
        <button class="user-info-dialog__close" @click="isPopupOpen = false">
          <X class="user-info-dialog__close-icon" />
        </button>

        <!-- 用户信息区域 -->
        <div class="user-info-popup__header">
          <div class="user-info-popup__avatar">
            <img
              v-if="userAvatar"
              :src="userAvatar"
              :alt="userName"
              class="user-info-popup__avatar-img"
            />
            <div v-else class="user-info-popup__avatar-placeholder">
              {{ userName?.charAt(0)?.toUpperCase() || "U" }}
            </div>
          </div>
          <div class="user-info-popup__info">
            <div class="user-info-popup__name">
              {{ userName || $t("user.name") }}
            </div>
            <div class="user-info-popup__email">{{ userEmail }}</div>
          </div>
        </div>

        <!-- 语言切换 -->
        <div class="user-info-popup__section">
          <div class="user-info-popup__section-title">
            {{ $t("language.title") }}
          </div>
          <div class="user-info-popup__language-list">
            <button
              v-for="lang in languages"
              :key="lang.code"
              class="user-info-popup__language-btn"
              :class="{ active: locale === lang.code }"
              @click="handleLanguageChange(lang.code)"
            >
              {{ lang.label }}
            </button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="user-info-popup__actions">
          <button
            class="user-info-popup__action-btn user-info-popup__action-btn--logout"
            @click="handleLogout"
          >
            <LogOut class="user-info-popup__action-icon" />
            {{ $t("dashboard.user.logout") }}
          </button>
          <button
            class="user-info-popup__action-btn user-info-popup__action-btn--delete"
            @click="handleDeleteAccount"
          >
            <Trash2 class="user-info-popup__action-icon" />
            {{ $t("dashboard.user.delete") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LogOut, Trash2, X } from "lucide-vue-next";

interface Props {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

const props = withDefaults(defineProps<Props>(), {
  userName: "",
  userEmail: "",
  userAvatar: "",
});

const emit = defineEmits<{
  logoutClick: [];
  deleteAccountClick: [];
}>();

const { t, locale } = useI18n();

// 弹出层状态
const isPopupOpen = ref(false);

// 响应式判断
const isMobile = ref(false);

const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  checkIsMobile();
  window.addEventListener("resize", checkIsMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkIsMobile);
});

// 语言列表
const languages = computed(() => [
  { code: "zh-cn", label: t("language.zh") },
  { code: "en-us", label: t("language.en") },
]);

// 语言切换
const handleLanguageChange = (langCode: string) => {
  locale.value = langCode;
  console.log("切换到语言:", langCode);
};

// 退出登录
const handleLogout = () => {
  isPopupOpen.value = false;
  emit("logoutClick");
  console.log("退出登录");
};

// 注销账号
const handleDeleteAccount = () => {
  isPopupOpen.value = false;
  emit("deleteAccountClick");
  console.log("注销账号");
};
</script>

<style lang="scss" scoped>
.user-info-wrapper {
  width: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &__avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: #fbe7e0;
    display: flex;
    align-items: center;
    justify-content: center;

    &-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &-placeholder {
      color: #242429;
      font-size: 1rem;
      font-weight: 600;
      font-family: "Source Serif 4", serif;
    }
  }

  &__details {
    flex: 1;
    min-width: 0;
  }

  &__name {
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: "Source Serif 4", serif;
    margin-bottom: 0.125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__email {
    color: #afb3bc;
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 用户信息弹出层样式
.user-info-popup {
  padding: 1.5rem;

  &__header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  &__avatar {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: #fbe7e0;
    display: flex;
    align-items: center;
    justify-content: center;

    &-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &-placeholder {
      color: #242429;
      font-size: 2rem;
      font-weight: 600;
      font-family: "Source Serif 4", serif;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    color: #fff;
    font-size: 1.25rem;
    font-weight: 600;
    font-family: "Source Serif 4", serif;
    margin-bottom: 0.25rem;
  }

  &__email {
    color: #afb3bc;
    font-size: 0.875rem;
  }

  &__section {
    margin-bottom: 2rem;
  }

  &__section-title {
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: "Source Serif 4", serif;
    margin-bottom: 0.75rem;
  }

  &__language-list {
    display: flex;
    gap: 0.5rem;
  }

  &__language-btn {
    padding: 0.5rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    border-radius: 0.5rem;
    color: #afb3bc;
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.3);
    }

    &.active {
      background: #fbe7e0;
      color: #242429;
      border-color: transparent;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__action-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    border-radius: 0.5rem;
    color: #fff;
    font-size: 0.875rem;
    font-family: "Source Serif 4", serif;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &--logout {
      color: #fff;
    }

    &--delete {
      color: #fdc4c4;
      border-color: rgba(253, 196, 196, 0.3);

      &:hover {
        background: rgba(253, 196, 196, 0.1);
        border-color: rgba(253, 196, 196, 0.5);
      }
    }
  }

  &__action-icon {
    width: 1.125rem;
    height: 1.125rem;
  }
}

// 桌面端Dialog样式
.user-info-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.user-info-dialog {
  position: relative;
  background: #242429;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 24rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
  animation: dialog-fade-in 0.2s ease-out;

  &__close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2rem;
    height: 2rem;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: #fff;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &__close-icon {
    width: 1rem;
    height: 1rem;
  }
}

@keyframes dialog-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

<style lang="scss">
// 全局样式覆盖Sheet组件
.user-info-sheet-content {
  background: #242429 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.user-info-sheet-content [data-slot="sheet-content"] {
  background: #242429 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
}
</style>
