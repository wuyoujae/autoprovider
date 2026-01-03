<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import WelcomeNav from "@/components/views/welcome/nav/welcome-nav.vue";
import WelcomePrompt from "@/components/views/welcome/prompt/welcome-prompt.vue";
import LoadingPannel from "@/components/global/loading-pannel.vue";
import logo from "@/static/logo.png";

const { t } = useI18n();

// 定义响应式变量
const welcome_text = ref("Welcome");
const is_creating = ref(false);

// 处理创建状态变化
const handle_creating_change = (value: boolean) => {
  is_creating.value = value;
};
</script>

<template>
  <div class="welcome_container" :class="{ page_fade_out: is_creating }">
    <!-- 导航栏 -->
    <WelcomeNav />

    <!-- 背景渐变层 -->
    <div class="gradient_background">
      <!-- 渐变圆形装饰 -->
      <div class="gradient_circle circle_1"></div>
      <div class="gradient_circle circle_2"></div>
      <div class="gradient_circle circle_3"></div>
      <div class="gradient_circle circle_4"></div>
      <div class="gradient_circle circle_5"></div>
      <div class="gradient_circle circle_6"></div>
      <div class="gradient_circle circle_7"></div>
      <div class="gradient_circle circle_8"></div>
      <div class="gradient_circle circle_9"></div>
      <div class="gradient_circle circle_10"></div>

      <!-- 额外的大气层效果 -->
      <div class="atmosphere_layer atmosphere_1"></div>
      <div class="atmosphere_layer atmosphere_2"></div>
    </div>

    <!-- 内容区域 -->
    <div class="content_area">
      <!-- 平台名称和Logo -->
      <div class="platform_brand">
        <img :src="logo" alt="Autoprovider Logo" class="platform_logo" />
        <h1 class="platform_name">{{ t("platform.name") }}</h1>
      </div>

      <!-- Prompt输入框 -->
      <WelcomePrompt @creating-change="handle_creating_change" />
    </div>

    <!-- Loading 面板 -->
    <LoadingPannel :show="is_creating" :message="t('loading.creating')" />
  </div>
</template>

<style scoped>
.welcome_container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #242429;
  transition: opacity 0.5s ease;
}

.welcome_container.page_fade_out {
  opacity: 0;
}

.gradient_background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 渐变色参考
主背景：#242429
辅助色：#FEEEDE（米白）, #FBE7E0（淡粉）, #FED9D2（粉色）, 
       #E2C9C5（灰粉）, #EBD3CF（淡紫）, #FDC4C4（亮粉）, 
       #F7DDDC（粉白）, #AFB3BC（灰蓝）
*/

.gradient_circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  animation: float 20s ease-in-out infinite;
}

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

.circle_6 {
  width: 650px;
  height: 650px;
  background: radial-gradient(circle, #fdc4c4 0%, #feeede 50%, transparent 70%);
  top: 50%;
  left: -8%;
  animation-delay: 1s;
}

.circle_7 {
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, #e2c9c5 0%, #f7dddc 50%, transparent 70%);
  top: 65%;
  right: 20%;
  animation-delay: 5s;
}

.circle_8 {
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, #afb3bc 0%, #ebd3cf 50%, transparent 70%);
  top: 15%;
  left: 25%;
  animation-delay: 7s;
}

.circle_9 {
  width: 580px;
  height: 580px;
  background: radial-gradient(circle, #fed9d2 0%, #fdc4c4 50%, transparent 70%);
  bottom: 5%;
  right: -3%;
  animation-delay: 4.5s;
}

.circle_10 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #fbe7e0 0%, #f7dddc 50%, transparent 70%);
  top: 40%;
  left: 60%;
  animation-delay: 2.5s;
}

/* 大气层效果 */
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
  animation-delay: 0s;
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
  color: #fff;
}

/* 平台品牌区域 */
.platform_brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 6rem;
  padding: 2rem;
  margin-bottom: 3rem;
}

.platform_logo {
  width: 4rem;
  height: 4rem;
  user-select: none;
  object-fit: contain;
  /* animation: logo_float 3s ease-in-out infinite; */
}

.platform_name {
  font-family: "Source Serif", serif;
  font-size: 3.5rem;
  font-weight: 400;
  color: #fff;
  margin: 0;
  margin-left: -1rem;
  letter-spacing: 0.02em;
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

@keyframes logo_float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-0.5rem) scale(1.05);
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
/* 平板端：1024px 以下 */
@media (max-width: 1024px) {
  .platform_brand {
    gap: 0.875rem;
    margin-top: 5rem;
    padding: 1.5rem;
  }

  .platform_logo {
    width: 3.5rem;
    height: 3.5rem;
  }

  .platform_name {
    font-size: 3rem;
  }
}

/* 移动端：768px 以下 */
@media (max-width: 768px) {
  .platform_brand {
    gap: 0.75rem;
    margin-top: 4rem;
    padding: 1rem;
  }

  .platform_logo {
    width: 3rem;
    height: 3rem;
  }

  .platform_name {
    font-size: 2.5rem;
  }
}

/* 小屏移动端：480px 以下 */
@media (max-width: 480px) {
  .platform_brand {
    gap: 0.625rem;
    margin-top: 3rem;
    padding: 0.75rem;
  }

  .platform_logo {
    width: 2.5rem;
    height: 2.5rem;
  }

  .platform_name {
    font-size: 2rem;
  }
}
</style>
