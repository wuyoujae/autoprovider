<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { Transition } from "vue";

interface Props {
  message?: string;
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  message: "",
  show: false,
});

const messages = [
  "正在创建项目文件",
  "正在创建远程仓库",
  "正在创建数据库",
  "正在构建后端接口",
  "正在安装依赖",
] as const;

const displayText = ref("");
const currentIndex = ref(0);
const isDeleting = ref(false);
const typingTimer = ref<number | null>(null);

const typingSpeed = 90;
const deletingSpeed = 60;
const pauseDuration = 3000;

const clearTimer = () => {
  if (typingTimer.value !== null) {
    clearTimeout(typingTimer.value);
    typingTimer.value = null;
  }
};

const resetTyping = () => {
  clearTimer();
  displayText.value = "";
  currentIndex.value = 0;
  isDeleting.value = false;
};

const scheduleNext = (delay = typingSpeed) => {
  clearTimer();
  typingTimer.value = window.setTimeout(runTyping, delay);
};

const runTyping = () => {
  const current = messages[currentIndex.value] ?? "";
  if (!current) {
    clearTimer();
    return;
  }
  const isLast = currentIndex.value === messages.length - 1;

  if (!isDeleting.value) {
    const nextLength = displayText.value.length + 1;
    displayText.value = current.slice(0, nextLength);

    if (displayText.value === current) {
      if (isLast) {
        clearTimer();
        return;
      }
      isDeleting.value = true;
      scheduleNext(pauseDuration);
      return;
    }

    scheduleNext(typingSpeed);
    return;
  }

  const nextLength = displayText.value.length - 1;
  displayText.value = current.slice(0, Math.max(0, nextLength));

  if (displayText.value.length === 0) {
    isDeleting.value = false;
    currentIndex.value += 1;
    scheduleNext(typingSpeed);
    return;
  }

  scheduleNext(deletingSpeed);
};

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      resetTyping();
      scheduleNext();
    } else {
      resetTyping();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearTimer();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="loading_fade">
      <div v-if="show" class="loading_pannel">
        <div class="loading_content">
          <!-- 能量汇聚动画 -->
          <div class="energy_scanner">
            <div class="center_core"></div>
            <!-- 生成更多粒子以增强效果 -->
            <div
              v-for="i in 24"
              :key="i"
              class="energy_particle"
              :style="{ '--i': i }"
            ></div>
          </div>

          <!-- 提示文字 -->
          <div class="loading_text">
            <p class="loading_message">
              {{ displayText }}
              <span class="loading_cursor"></span>
            </p>
            <div class="loading_dots">
              <span class="dot dot_1"></span>
              <span class="dot dot_2"></span>
              <span class="dot dot_3"></span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.loading_pannel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100vh;
  background: rgba(36, 36, 41, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 过渡动画 */
.loading_fade-enter-active {
  transition: opacity 0.5s ease;
}

.loading_fade-leave-active {
  transition: opacity 0.5s ease;
}

.loading_fade-enter-from {
  opacity: 0;
}

.loading_fade-enter-to {
  opacity: 1;
}

.loading_fade-leave-from {
  opacity: 1;
}

.loading_fade-leave-to {
  opacity: 0;
}

.loading_content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

/* 主加载动画 - 能量汇聚 */
.energy_scanner {
  position: relative;
  width: 12rem;
  height: 12rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center_core {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: radial-gradient(circle, #feeede 0%, #fbe7e0 60%, #fed9d2 100%);
  box-shadow: 0 0 2.5rem rgba(254, 238, 222, 0.8),
    0 0 1rem rgba(254, 238, 222, 0.6) inset;
  z-index: 10;
  animation: core_pulse 2s ease-in-out infinite;
}

.energy_particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #feeede;
  box-shadow: 0 0 8px #feeede;
  opacity: 0;
  /* 使用变量计算旋转角度，使得粒子分布在圆周上 */
  --angle: calc(360deg / 24 * var(--i));
  transform: rotate(var(--angle)) translateY(120px);
  /* 随机动画时长和延迟，制造无序感 */
  animation: converge calc(1.5s + var(--i) * 0.1s) ease-in infinite;
}

/* 粒子随机大小微调 */
.energy_particle:nth-child(3n) {
  width: 3px;
  height: 3px;
  animation-duration: calc(1.8s + var(--i) * 0.05s);
}
.energy_particle:nth-child(3n + 1) {
  width: 5px;
  height: 5px;
  background: #fbe7e0;
  animation-duration: calc(1.2s + var(--i) * 0.08s);
}
.energy_particle:nth-child(3n + 2) {
  background: #fed9d2;
}

/* 动画定义 */
@keyframes core_pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 2.5rem rgba(254, 238, 222, 0.8),
      0 0 1rem rgba(254, 238, 222, 0.6) inset;
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 3.5rem rgba(254, 238, 222, 0.6),
      0 0 1.5rem rgba(254, 238, 222, 0.4) inset;
    opacity: 0.8;
  }
}

@keyframes converge {
  0% {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(140px) scale(0.5);
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(0px) scale(1.2);
  }
}

/* 提示文字 */
.loading_text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: clamp(2.5rem, 4vw, 3.75rem);
}

.loading_message {
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 1.125rem;
  font-weight: 400;
  margin: 0;
  text-align: center;
  min-height: 1.5em;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.loading_cursor {
  width: 0.12rem;
  height: 1.2em;
  background: #feeede;
  display: inline-block;
  animation: cursor_blink 1s step-start infinite;
}

.loading_dots {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #feeede;
  animation: dot_bounce 1.4s ease-in-out infinite;
}

.dot_1 {
  animation-delay: 0s;
}

.dot_2 {
  animation-delay: 0.2s;
}

.dot_3 {
  animation-delay: 0.4s;
}

/* 动画定义 */

@keyframes dot_bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-0.5rem);
    opacity: 1;
  }
}

@keyframes cursor_blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* 响应式设计 */
/* 平板端：1024px 以下 */
@media (max-width: 1024px) {
  .loading_spinner {
    width: 7rem;
    height: 7rem;
  }

  .spinner_ring_1 {
    width: 7rem;
    height: 7rem;
  }

  .spinner_ring_2 {
    width: 5.25rem;
    height: 5.25rem;
  }

  .spinner_ring_3 {
    width: 3.5rem;
    height: 3.5rem;
  }

  .loading_message {
    font-size: 1rem;
  }
}

/* 移动端：768px 以下 */
@media (max-width: 768px) {
  .loading_content {
    gap: 1.5rem;
  }

  .loading_spinner {
    width: 6rem;
    height: 6rem;
  }

  .spinner_ring_1 {
    width: 6rem;
    height: 6rem;
  }

  .spinner_ring_2 {
    width: 4.5rem;
    height: 4.5rem;
  }

  .spinner_ring_3 {
    width: 3rem;
    height: 3rem;
  }

  .spinner_center {
    width: 1.5rem;
    height: 1.5rem;
  }

  .loading_message {
    font-size: 0.95rem;
  }

  .particle {
    width: 0.4rem;
    height: 0.4rem;
  }

  .dot {
    width: 0.4rem;
    height: 0.4rem;
  }
}

/* 小屏移动端：480px 以下 */
@media (max-width: 480px) {
  .loading_content {
    gap: 1.25rem;
  }

  .loading_spinner {
    width: 5rem;
    height: 5rem;
  }

  .spinner_ring_1 {
    width: 5rem;
    height: 5rem;
  }

  .spinner_ring_2 {
    width: 3.75rem;
    height: 3.75rem;
  }

  .spinner_ring_3 {
    width: 2.5rem;
    height: 2.5rem;
  }

  .spinner_center {
    width: 1.25rem;
    height: 1.25rem;
  }

  .loading_message {
    font-size: 0.875rem;
  }

  .particle {
    width: 0.35rem;
    height: 0.35rem;
  }

  .dot {
    width: 0.35rem;
    height: 0.35rem;
  }
}
</style>
