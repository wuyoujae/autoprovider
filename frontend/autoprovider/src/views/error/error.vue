<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";

const router = useRouter();
const { t } = useI18n();

const goHome = () => {
  router.push("/");
};
</script>

<template>
  <div class="error_container">
    <!-- 背景渐变层 -->
    <div class="gradient_background">
      <!-- 渐变圆形装饰 - 保持与Welcome页面一致的氛围 -->
      <div class="gradient_circle circle_1"></div>
      <div class="gradient_circle circle_2"></div>
      <div class="gradient_circle circle_3"></div>
      <div class="gradient_circle circle_4"></div>
      <div class="gradient_circle circle_5"></div>

      <!-- 额外的大气层效果 -->
      <div class="atmosphere_layer atmosphere_1"></div>
      <div class="atmosphere_layer atmosphere_2"></div>
    </div>

    <!-- 内容区域 -->
    <div class="content_area">
      <div class="error_content">
        <h1 class="error_code">404</h1>
        <h2 class="error_title">{{ t("error.page_not_found") }}</h2>
        <p class="error_description">{{ t("error.page_not_found_desc") }}</p>

        <div class="action_area">
          <Button
            @click="goHome"
            variant="default"
            size="lg"
            class="home_button"
          >
            {{ t("error.back_home") }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.error_container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #242429;
  color: #fff;
}

.gradient_background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.gradient_circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  animation: float 20s ease-in-out infinite;
}

/* 复用部分渐变色配置 */
.circle_1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #feeede 0%, #fbe7e0 50%, transparent 70%);
  top: -10%;
  left: -5%;
  animation-delay: 0s;
}

.circle_2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #fed9d2 0%, #e2c9c5 50%, transparent 70%);
  top: 30%;
  right: -5%;
  animation-delay: 3s;
}

.circle_3 {
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, #ebd3cf 0%, #fdc4c4 50%, transparent 70%);
  bottom: -10%;
  left: 20%;
  animation-delay: 6s;
}

.circle_4 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, #f7dddc 0%, #afb3bc 50%, transparent 70%);
  top: 10%;
  left: 50%;
  animation-delay: 4s;
}

.circle_5 {
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, #fbe7e0 0%, #ebd3cf 50%, transparent 70%);
  bottom: 20%;
  right: 15%;
  animation-delay: 2s;
}

.atmosphere_layer {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.25;
  animation: atmosphere_float 30s ease-in-out infinite;
}

.atmosphere_1 {
  width: 1200px;
  height: 1200px;
  background: radial-gradient(
    circle,
    rgba(254, 238, 222, 0.3) 0%,
    rgba(251, 231, 224, 0.2) 30%,
    rgba(254, 217, 210, 0.15) 50%,
    transparent 70%
  );
  top: -15%;
  left: -10%;
}

.atmosphere_2 {
  width: 1000px;
  height: 1000px;
  background: radial-gradient(
    circle,
    rgba(253, 196, 196, 0.25) 0%,
    rgba(229, 201, 197, 0.2) 30%,
    rgba(175, 179, 188, 0.15) 50%,
    transparent 70%
  );
  bottom: -10%;
  right: -8%;
  animation-delay: 15s;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.1);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  75% {
    transform: translate(20px, 30px) scale(1.05);
  }
}

@keyframes atmosphere_float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(50px, -50px) scale(1.15);
  }
  66% {
    transform: translate(-40px, 40px) scale(0.95);
  }
}

.content_area {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.error_content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.error_code {
  font-family: "Source Serif 4", "Source Serif", serif;
  font-size: 12rem;
  line-height: 1;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(
    135deg,
    #fff 0%,
    #feeede 25%,
    #fbe7e0 50%,
    #feeede 75%,
    #fff 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient_shift 5s ease infinite;
  user-select: none;
}

.error_title {
  font-family: "Source Serif 4", "Source Serif", serif;
  font-size: 2.5rem;
  font-weight: 400;
  color: #fff;
  margin: 0;
  letter-spacing: 0.02em;
}

.error_description {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  max-width: 600px;
}

.action_area {
  margin-top: 2rem;
}

.home_button {
  font-family: "Source Serif 4", "Source Serif", serif;
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(254, 238, 222, 0.5);
  }
}

@keyframes gradient_shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .error_code {
    font-size: 10rem;
  }
  .error_title {
    font-size: 2rem;
  }
}

@media (max-width: 768px) {
  .error_code {
    font-size: 8rem;
  }
  .error_title {
    font-size: 1.75rem;
  }
  .error_description {
    font-size: 1rem;
    padding: 0 1rem;
  }
}

@media (max-width: 480px) {
  .error_code {
    font-size: 6rem;
  }
  .error_title {
    font-size: 1.5rem;
  }
}
</style>
