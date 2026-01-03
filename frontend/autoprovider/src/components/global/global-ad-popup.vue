<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useAdStore } from "@/stores/ad";

const adStore = useAdStore();

const visible = computed(() => adStore.visible);
const config = computed(() => adStore.adConfig);

const iframeKey = ref(0);
const loading = ref(false);
const errored = ref(false);
const originalOverflow = ref("");

const lockBodyScroll = () => {
  if (config.value.disableScroll === false) return;
  originalOverflow.value = document.body.style.overflow;
  document.body.style.overflow = "hidden";
};

const unlockBodyScroll = () => {
  if (config.value.disableScroll === false) return;
  document.body.style.overflow = originalOverflow.value;
};

const handleMaskClick = () => {
  if (config.value.maskClosable === false) return;
  adStore.close("mask");
};

const handleClose = () => {
  if (config.value.closable === false) return;
  adStore.close("manual");
};

const handleIframeLoad = () => {
  loading.value = false;
  errored.value = false;
};

const handleIframeError = () => {
  loading.value = false;
  errored.value = true;
};

const retryLoad = () => {
  errored.value = false;
  loading.value = true;
  iframeKey.value += 1;
};

watch(
  visible,
  (show) => {
    if (show) {
      loading.value = true;
      errored.value = false;
      iframeKey.value += 1;
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  unlockBodyScroll();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="ad_fade">
      <div
        v-if="visible && config.src"
        class="ad_popup__mask"
        :style="{ zIndex: config.zIndex ?? 9998 }"
        @click="handleMaskClick"
      >
        <div
          class="ad_popup__container"
          :style="{
            width: config.width || 'calc(100vw - 48px)',
            height: config.height || 'calc(100vh - 48px)',
            zIndex: (config.zIndex ?? 9998) + 1,
          }"
          @click.stop
        >
          <button
            v-if="config.closable !== false"
            class="ad_popup__close"
            aria-label="关闭广告"
            @click="handleClose"
          >
            ×
          </button>

          <div class="ad_popup__body">
            <div v-if="loading" class="ad_popup__loading">
              <div class="ad_popup__spinner"></div>
              <span>广告加载中…</span>
            </div>

            <div v-if="errored" class="ad_popup__error">
              <p>广告加载失败，请重试。</p>
              <button class="ad_popup__retry" @click="retryLoad">重新加载</button>
            </div>

            <iframe
              v-show="!errored"
              :key="iframeKey"
              class="ad_popup__iframe"
              :src="config.src"
              frameborder="0"
              :allowfullscreen="config.allowFullscreen !== false"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              @load="handleIframeLoad"
              @error="handleIframeError"
            ></iframe>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.ad_popup__mask {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(255, 107, 107, 0.16), rgba(0, 0, 0, 0.6)),
    radial-gradient(circle at 80% 30%, rgba(251, 191, 36, 0.14), rgba(0, 0, 0, 0.55)),
    rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.ad_popup__container {
  position: relative;
  background: #0c0c0f;
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 100%;
}

.ad_popup__close {
  border: none;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 35%, #fadb14 100%);
  color: #fff;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  transition: all 0.2s ease;
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 2px rgba(255, 255, 255, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.65);
  z-index: 3;

  &:hover {
    transform: translateY(-1px) scale(1.03);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.55);
  }
}

.ad_popup__body {
  position: relative;
  flex: 1;
  background: #0c0c0f;
}

.ad_popup__iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.ad_popup__loading,
.ad_popup__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #fff;
  background: linear-gradient(180deg, rgba(36, 36, 41, 0.8), rgba(15, 15, 18, 0.9));
  z-index: 1;
}

.ad_popup__spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid rgba(254, 238, 222, 0.25);
  border-top-color: #feeede;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.ad_popup__retry {
  padding: 0.6rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(254, 238, 222, 0.4);
  background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
  color: #242429;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.15s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ad_fade-enter-active,
.ad_fade-leave-active {
  transition: opacity 0.2s ease;
}

.ad_fade-enter-from,
.ad_fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .ad_popup__container {
    width: 100% !important;
    height: 90vh !important;
  }

  .ad_popup__mask {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .ad_popup__container {
    border-radius: 12px;
  }

  .ad_popup__header {
    padding: 0.65rem 0.85rem;
  }
}
</style>

