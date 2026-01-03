<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff } from "lucide-vue-next";
import logo from "@/static/logo.png";
import request from "@/api/request";
import message from "@/utils/message";

const { t } = useI18n();

interface Emits {
  (e: "switchToLogin"): void;
}

const emit = defineEmits<Emits>();

// 表单数据
const account = ref("");
const password = ref("");
const confirm_password = ref("");
const show_password = ref(false);
const show_confirm_password = ref(false);
const is_loading = ref(false);

// 验证密码格式
const validate_password = (pwd: string): boolean => {
  const has_letter = /[a-zA-Z]/.test(pwd);
  const has_number = /[0-9]/.test(pwd);
  const has_min_length = pwd.length >= 8;
  return has_letter && has_number && has_min_length;
};

// 提交注册
const handle_submit = async () => {
  if (!account.value || !password.value || !confirm_password.value) {
    message.warning("请填写所有必填项");
    return;
  }

  if (!validate_password(password.value)) {
    message.warning("密码必须包含英文和数字，且长度不少于8位");
    return;
  }

  if (password.value !== confirm_password.value) {
    message.warning("两次输入的密码不一致");
    return;
  }

  try {
    is_loading.value = true;
    const data = await request({
      url: "uservec.register",
      method: "post",
      data: {
        account: account.value,
        password: password.value,
      },
    });

    message.success("注册成功，请登录");
    
    // 切换到登录页面
    setTimeout(() => {
      emit("switchToLogin");
    }, 1000);
  } catch (error) {
    console.error("注册失败:", error);
  } finally {
    is_loading.value = false;
  }
};

// 切换显示密码
const toggle_password = () => {
  show_password.value = !show_password.value;
};

const toggle_confirm_password = () => {
  show_confirm_password.value = !show_confirm_password.value;
};
</script>

<template>
  <div class="register_pannel">
    <!-- Logo -->
    <div class="pannel_logo">
      <img :src="logo" alt="Autoprovider Logo" class="logo_image" />
    </div>

    <div class="pannel_header">
      <h1 class="pannel_title">{{ t("register.title") }}</h1>
      <p class="pannel_subtitle">{{ t("register.subtitle") }}</p>
    </div>

    <form class="register_form" @submit.prevent="handle_submit">
      <!-- 邮箱输入 -->
      <div class="form_group">
        <label class="form_label">{{ t("register.email") }}</label>
        <div class="input_wrapper">
          <Mail class="input_icon" :size="20" />
          <input
            v-model="account"
            type="email"
            class="form_input"
            :placeholder="t('register.email')"
            :disabled="is_loading"
            required
          />
        </div>
      </div>

      <!-- 密码输入 -->
      <div class="form_group">
        <label class="form_label">{{ t("register.password") }}</label>
        <div class="input_wrapper">
          <Lock class="input_icon" :size="20" />
          <input
            v-model="password"
            :type="show_password ? 'text' : 'password'"
            class="form_input"
            :placeholder="t('register.password')"
            :disabled="is_loading"
            required
          />
          <button
            type="button"
            class="password_toggle"
            :disabled="is_loading"
            @click="toggle_password"
          >
            <Eye v-if="!show_password" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
      </div>

      <!-- 确认密码 -->
      <div class="form_group">
        <label class="form_label">确认密码</label>
        <div class="input_wrapper">
          <Lock class="input_icon" :size="20" />
          <input
            v-model="confirm_password"
            :type="show_confirm_password ? 'text' : 'password'"
            class="form_input"
            placeholder="请再次输入密码"
            :disabled="is_loading"
            required
          />
          <button
            type="button"
            class="password_toggle"
            :disabled="is_loading"
            @click="toggle_confirm_password"
          >
            <Eye v-if="!show_confirm_password" :size="18" />
            <EyeOff v-else :size="18" />
          </button>
        </div>
        <p class="password_hint">密码必须包含英文和数字，且长度不少于8位</p>
      </div>

      <!-- 提交按钮 -->
      <Button
        type="submit"
        variant="default"
        size="lg"
        class="submit_button"
        :disabled="is_loading"
      >
        {{ is_loading ? "注册中..." : t("register.signUp") }}
      </Button>
    </form>

    <!-- 切换到登录 -->
    <div class="pannel_footer">
      <span class="footer_text">{{ t("register.hasAccount") }}</span>
      <button class="footer_link" @click="emit('switchToLogin')">
        {{ t("register.signIn") }}
      </button>
    </div>

    <!-- 服务条款和隐私政策 -->
    <div class="terms_footer">
      <span class="terms_text">{{ t("register.termsText") }}</span>
      <a href="#" class="terms_link">{{ t("register.terms") }}</a>
      <span class="terms_separator">和</span>
      <a href="#" class="terms_link">{{ t("register.privacy") }}</a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register_pannel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.pannel_logo {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: -1rem;
}

.logo_image {
  width: 3.5rem;
  height: 3.5rem;
  object-fit: contain;
}

.pannel_header {
  text-align: center;
}

.pannel_title {
  font-family: "Source Serif", serif;
  font-size: 2rem;
  font-weight: 400;
  color: #fff;
  margin: 0 0 0.5rem 0;
}

.pannel_subtitle {
  font-family: "Source Serif", serif;
  font-size: 0.95rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.register_form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form_group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.form_label {
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
}

.input_wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input_icon {
  position: absolute;
  left: 1rem;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

.form_input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  color: #fff;
  font-family: "Source Serif", serif;
  font-size: 0.95rem;
  font-weight: 400;
  outline: none;
  transition: all 0.3s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(254, 238, 222, 0.3);
  }
}

.password_toggle {
  position: absolute;
  right: 1rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: #feeede;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.verification_wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.verification_wrapper .input_wrapper {
  flex: 1;
}

.send_code_button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  background: rgba(254, 238, 222, 0.1);
  border: 1px solid rgba(254, 238, 222, 0.3);
  border-radius: 0.5rem;
  color: #feeede;
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(254, 238, 222, 0.15);
    border-color: rgba(254, 238, 222, 0.5);
    color: #fbe7e0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.password_hint {
  margin: 0.5rem 0 0 0;
  font-family: "Source Serif", serif;
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.submit_button {
  width: 100%;
  background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
  color: #242429;
  font-family: "Source Serif", serif;
  font-size: 1rem;
  font-weight: 400;
  border: none;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #fbe7e0 0%, #fed9d2 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(254, 238, 222, 0.3);
  }
}

.pannel_footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.footer_text {
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
}

.footer_link {
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: #feeede;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: #fbe7e0;
  }
}

.terms_footer {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.terms_text {
  font-family: "Source Serif", serif;
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.terms_link {
  font-family: "Source Serif", serif;
  font-size: 0.75rem;
  font-weight: 400;
  color: #feeede;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #fbe7e0;
    text-decoration: underline;
  }
}

.terms_separator {
  font-family: "Source Serif", serif;
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pannel_title {
    font-size: 1.75rem;
  }

  .pannel_subtitle {
    font-size: 0.875rem;
  }

  .form_input {
    font-size: 0.9rem;
    padding: 0.75rem 0.875rem 0.75rem 2.75rem;
  }

  .input_icon {
    left: 0.875rem;
  }

  .password_toggle {
    right: 0.875rem;
  }
}

@media (max-width: 480px) {
  .register_pannel {
    gap: 1.5rem;
  }

  .logo_image {
    width: 3rem;
    height: 3rem;
  }

  .pannel_title {
    font-size: 1.5rem;
  }

  .form_input {
    font-size: 0.875rem;
  }
}
</style>
