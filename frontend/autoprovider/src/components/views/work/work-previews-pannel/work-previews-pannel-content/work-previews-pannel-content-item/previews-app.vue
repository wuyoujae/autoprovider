<template>
  <div
    class="previews-app"
    :class="{
      'previews-app--desktop': props.selected_device === 'desktop',
      'previews-app--tablet': props.selected_device === 'tablet',
      'previews-app--phone': props.selected_device === 'phone',
    }"
  >
    <div
      class="previews-app__container"
      :class="{
        'previews-app__container--desktop': props.selected_device === 'desktop',
        'previews-app__container--tablet': props.selected_device === 'tablet',
        'previews-app__container--phone': props.selected_device === 'phone',
      }"
    >
      <div class="previews-app__content">
        <!-- 加载中蒙版：URL 为空或 iframe 还没准备好时显示 -->
        <div v-if="showMask" class="previews-app__mask">
          <div class="previews-app__mask-content">
            <div class="previews-app__mask-icon-wrapper">
              <Loader2 class="previews-app__mask-icon" />
            </div>
            <p class="previews-app__mask-text">
              {{ maskMessage }}
            </p>
            <p v-if="status === 'probing'" class="previews-app__mask-subtext">
              正在第 {{ attempt }} /
              {{ MAX_PROBE_ATTEMPTS }} 次尝试，可能是容器或证书未就绪…
            </p>
            <p v-if="status === 'failed'" class="previews-app__mask-subtext">
              可能是证书未就绪或服务未启动。<br />
              请先点击下方按钮在新标签页访问，接受证书警告后返回重试。
            </p>
            <div v-if="status === 'failed'" class="previews-app__action-btns">
              <button
                class="previews-app__open-btn"
                @click.stop="handleOpenInNewTab"
              >
                在新标签页打开
              </button>
              <button class="previews-app__retry-btn" @click.stop="handleRetry">
                重试
              </button>
            </div>
          </div>
        </div>
        <!-- iframe：始终渲染但在未就绪时隐藏，通过 key 触发刷新 -->
        <iframe
          v-if="iframeSrc"
          ref="iframeRef"
          :key="iframeKey"
          :src="iframeSrc"
          class="previews-app__iframe"
          :class="{ 'previews-app__iframe--hidden': !iframeReady }"
          frameborder="0"
          allowfullscreen
          @load="handleIframeLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Loader2 } from "lucide-vue-next";

const { t } = useI18n();

// Props
interface Props {
  selected_device: string;
  project_url?: string;
  refresh_token?: number;
}

const props = withDefaults(defineProps<Props>(), {
  project_url: "",
  refresh_token: 0,
});

const iframeRef = ref<HTMLIFrameElement | null>(null);
const iframeSrc = ref("");
const iframeKey = ref(0);
const loadCount = ref(0);
const iframeReady = ref(false);
const status = ref<"idle" | "probing" | "loading" | "ready" | "failed">("idle");
const attempt = ref(0);
const maskMessage = computed(() => {
  if (status.value === "failed") return "预览加载失败";
  if (status.value === "ready") return "";
  return t("work.preview.content.app.building");
});

// 显示蒙版条件：没有 URL 或 iframe 还没准备好
const showMask = computed(() => status.value !== "ready");

// 需要自动刷新的次数（第一次加载用于预热证书，第二次才是真正显示）
const AUTO_REFRESH_COUNT = 1;
// 首次加载前的延迟（给证书/服务一些启动时间）
const INITIAL_DELAY_MS = 3000;
// 自动刷新前的延迟
const REFRESH_DELAY_MS = 2000;
// 探测参数
const MAX_PROBE_ATTEMPTS = 8;
const PROBE_DELAY_MS = 4000;

let urlToken = 0;

const normalizeUrl = (url: string) => {
  try {
    const targetUrl = new URL(url);

    // 开源/本地预览场景：localhost 或内网 IP 必须保持 http，否则会变成 https://localhost:xxxx 导致证书/服务不可用
    const host = targetUrl.hostname;
    const isLocalhost =
      host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    const isPrivateIp = (() => {
      // 仅做简单 IPv4 私网判断（10.x / 192.168.x / 172.16-31.x）
      const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (!m) return false;
      const a = Number(m[1]);
      const b = Number(m[2]);
      if ([a, b].some((n) => Number.isNaN(n))) return false;
      if (a === 10) return true;
      if (a === 192 && b === 168) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      return false;
    })();

    // 仅对“非本地/非内网”的 http URL 才尝试升级到 https（避免混合内容被浏览器拦截）
    if (targetUrl.protocol === "http:" && !isLocalhost && !isPrivateIp) {
      targetUrl.protocol = "https:";
    }
    return targetUrl.toString();
  } catch {
    return url || "";
  }
};

const handleIframeLoad = () => {
  loadCount.value++;

  if (loadCount.value <= AUTO_REFRESH_COUNT) {
    // 还没达到自动刷新次数，延迟后刷新 iframe
    setTimeout(() => {
      iframeKey.value++;
    }, REFRESH_DELAY_MS);
  } else {
    // 刷新完成，显示 iframe
    iframeReady.value = true;
    status.value = "ready";
  }
};

const startLoading = async (rawUrl: string) => {
  const token = ++urlToken;
  const safeUrl = normalizeUrl(rawUrl);

  // 重置状态
  iframeSrc.value = "";
  iframeKey.value = 0;
  loadCount.value = 0;
  iframeReady.value = false;
  status.value = "idle";
  attempt.value = 0;

  if (!safeUrl) return;

  // 初始延迟，给服务/证书一些启动时间
  await new Promise((resolve) => setTimeout(resolve, INITIAL_DELAY_MS));

  // 检查是否被新的 URL 取代
  if (token !== urlToken) return;

  // 探测并加载
  status.value = "probing";
  while (attempt.value < MAX_PROBE_ATTEMPTS) {
    attempt.value += 1;
    try {
      await fetch(safeUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
      });
      if (token !== urlToken) return;
      status.value = "loading";
      iframeSrc.value = safeUrl;
      return;
    } catch {
      if (attempt.value >= MAX_PROBE_ATTEMPTS) {
        status.value = "failed";
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, PROBE_DELAY_MS));
      if (token !== urlToken) return;
    }
  }
};

const handleRetry = () => {
  if (!props.project_url) return;
  startLoading(props.project_url);
};

const handleOpenInNewTab = () => {
  const url = normalizeUrl(props.project_url || "");
  if (url) {
    window.open(url, "_blank");
  }
};

watch(
  () => props.project_url,
  (url) => {
    if (!url || !url.trim()) {
      iframeSrc.value = "";
      iframeReady.value = false;
      return;
    }
    startLoading(url);
  },
  { immediate: true }
);

// 手动刷新：令牌变化时重新加载当前 URL
watch(
  () => props.refresh_token,
  () => {
    if (props.project_url && props.project_url.trim()) {
      startLoading(props.project_url);
    }
  }
);
</script>

<style lang="scss" scoped>
.previews-app {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  // 桌面端保持原样，不需要 padding 和 border-radius
  &--desktop {
    padding: 0;
    border-radius: 0;
  }

  // 平板端和移动端添加 padding 和 border-radius
  &--tablet,
  &--phone {
    padding: 0.8rem;
  }

  &__container {
    background: transparent;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    overflow: hidden;
    transform: translateZ(0);

    // 桌面端：占满整个容器
    &--desktop {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }

    // 平板端：768px * 1024px，居中
    &--tablet {
      width: 48rem; // 768px
      height: 64rem; // 1024px
      max-width: 100%;
      max-height: 100%;
      border-radius: 1rem;
    }

    // 移动端：375px * 812px，居中
    &--phone {
      width: 23.4375rem; // 375px
      height: 50.75rem; // 812px
      max-width: 100%;
      max-height: 100%;
      border-radius: 1rem;
    }
  }

  &__content {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  &__iframe {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;

    // 预热阶段隐藏 iframe，避免显示错误页面
    &--hidden {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
  }

  &__mask {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #242429 0%, #2a2a30 100%);
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(
        circle at 30% 50%,
        rgba(254, 238, 222, 0.1) 0%,
        transparent 50%
      );
      pointer-events: none;
    }

    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(
        circle at 70% 50%,
        rgba(251, 231, 224, 0.08) 0%,
        transparent 50%
      );
      pointer-events: none;
    }
  }

  &__mask-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    text-align: center;
    padding: 2rem;
    position: relative;
    z-index: 1;

    @media (max-width: 768px) {
      gap: 1.25rem;
      padding: 1.5rem;
    }

    @media (max-width: 480px) {
      gap: 1rem;
      padding: 1rem;
    }
  }

  &__mask-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(254, 238, 222, 0.15) 0%,
      rgba(251, 231, 224, 0.1) 100%
    );
    backdrop-filter: blur(10px);
    position: relative;

    @media (max-width: 480px) {
      width: 4rem;
      height: 4rem;
    }

    &::before {
      content: "";
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      background: linear-gradient(
        135deg,
        rgba(254, 238, 222, 0.3),
        rgba(251, 231, 224, 0.2)
      );
      opacity: 0.5;
      z-index: -1;
    }
  }

  &__mask-icon {
    width: 2.5rem;
    height: 2.5rem;
    color: #feeede;
    animation: spin 2s linear infinite;

    @media (max-width: 480px) {
      width: 2rem;
      height: 2rem;
    }
  }

  &__mask-text {
    font-size: 1.25rem;
    color: #fff;
    font-family: "Source Serif 4", serif;
    font-weight: 500;
    margin: 0;

    @media (max-width: 768px) {
      font-size: 1.125rem;
    }

    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }

  &__mask-subtext {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.7);
    font-family: "Source Serif 4", serif;
    margin: 0;
    max-width: 20rem;

    @media (max-width: 768px) {
      font-size: 0.875rem;
      max-width: 18rem;
    }

    @media (max-width: 480px) {
      font-size: 0.8125rem;
      max-width: 16rem;
    }
  }

  &__action-btns {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__open-btn {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
    color: #242429;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(254, 238, 222, 0.3);
    }
  }

  &__retry-btn {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(254, 238, 222, 0.4);
    background: rgba(254, 238, 222, 0.1);
    color: #feeede;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(254, 238, 222, 0.2);
      border-color: rgba(254, 238, 222, 0.6);
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
