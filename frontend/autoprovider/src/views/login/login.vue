<script setup lang="ts">
import { ref } from "vue";
import LoginPannel from "@/components/views/login/login-pannel/login-pannel.vue";
import RegisterPannel from "@/components/views/login/register-pannel/register-pannel.vue";

// 当前显示的面板：'login' 或 'register'
const current_pannel = ref<"login" | "register">("login");

// 切换到注册面板
const switch_to_register = () => {
  current_pannel.value = "register";
};

// 切换到登录面板
const switch_to_login = () => {
  current_pannel.value = "login";
};
</script>

<template>
  <div class="login_page">
    <!-- 背景渐变层 -->
    <div class="gradient_background">
      <div class="gradient_circle circle_1"></div>
      <div class="gradient_circle circle_2"></div>
      <div class="gradient_circle circle_3"></div>
      <div class="gradient_circle circle_4"></div>
    </div>

    <!-- 内容区域 -->
    <div class="login_content">
      <div class="login_card">
        <!-- 登录面板 -->
        <LoginPannel
          v-if="current_pannel === 'login'"
          @switch-to-register="switch_to_register"
        />

        <!-- 注册面板 -->
        <RegisterPannel v-else @switch-to-login="switch_to_login" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login_page {
  width: 100%;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #242429;
}

.gradient_background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100%;
  height: auto;
  overflow: hidden;
  z-index: 0;
}

.gradient_circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
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
  top: 50%;
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
  top: 30%;
  left: 60%;
  animation-delay: 4s;
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

.login_content {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login_card {
  width: 100%;
  max-width: 28rem;
  background: rgba(36, 36, 41, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  padding: 3rem 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login_page {
    overflow-y: auto;
  }

  .login_content {
    padding: 1.5rem;
    align-items: flex-start;
    padding-top: 3rem;
    padding-bottom: 3rem;
  }

  .login_card {
    padding: 2.5rem 2rem;
    border-radius: 1.25rem;
  }
}

@media (max-width: 480px) {
  .login_page {
    overflow-y: auto;
  }

  .login_content {
    padding: 1rem;
    align-items: flex-start;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }

  .login_card {
    padding: 2rem 1.5rem;
    border-radius: 1rem;
  }
}
</style>
