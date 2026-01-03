<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff } from "lucide-vue-next";
import logo from "@/static/logo.png";
import request from "@/api/request";
import { useUserStore } from "@/stores/user";
import message from "@/utils/message";

const { t } = useI18n();
const router = useRouter();
const user_store = useUserStore();

interface Emits {
  (e: "switchToRegister"): void;
}

const emit = defineEmits<Emits>();

// 表单数据
const account = ref("");
const password = ref("");
const show_password = ref(false);
const is_loading = ref(false);

// 提交登录
const handle_submit = async () => {
  if (!account.value) {
    message.warning("请输入账号");
    return;
  }

  if (!password.value) {
    message.warning("请输入密码");
    return;
  }

  try {
    is_loading.value = true;
    const request_data: { account: string; password: string } = {
      account: account.value,
      password: password.value,
    };

    const data = await request({
      url: "userinfo.login",
      method: "post",
      data: request_data,
    });

    // 保存 token
    if (data.token) {
      user_store.set_token(data.token);
    }

    // 保存用户信息（不包含 token）
    const { token, ...user_info } = data;
    user_store.set_user_info(user_info);

    message.success("登录成功");

    // 跳转到首页
    setTimeout(() => {
      router.push("/");
    }, 500);
  } catch (error) {
    console.error("登录失败:", error);
  } finally {
    is_loading.value = false;
  }
};

// 切换显示密码
const toggle_password = () => {
  show_password.value = !show_password.value;
};
</script>

<template>
  <div class="login_pannel">
    <!-- Logo -->
    <div class="pannel_logo">
      <img :src="logo" alt="Autoprovider Logo" class="logo_image" />
    </div>

    <div class="pannel_header">
      <h1 class="pannel_title">{{ t("login.title") }}</h1>
      <p class="pannel_subtitle">{{ t("login.subtitle") }}</p>
    </div>

    <form class="login_form" @submit.prevent="handle_submit">
      <!-- 邮箱输入 -->
      <div class="form_group">
        <label class="form_label">{{ t("login.email") }}</label>
        <div class="input_wrapper">
          <Mail class="input_icon" :size="20" />
          <input
            v-model="account"
            type="email"
            class="form_input"
            :placeholder="t('login.email')"
            :disabled="is_loading"
            required
          />
        </div>
      </div>

      <!-- 密码输入 -->
      <div class="form_group">
        <label class="form_label">{{ t("login.password") }}</label>
        <div class="input_wrapper">
          <Lock class="input_icon" :size="20" />
          <input
            v-model="password"
            :type="show_password ? 'text' : 'password'"
            class="form_input"
            :placeholder="t('login.password')"
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

      <!-- 提交按钮 -->
      <Button
        type="submit"
        variant="default"
        size="lg"
        class="submit_button"
        :disabled="is_loading"
      >
        {{ is_loading ? "登录中..." : t("login.signIn") }}
      </Button>
    </form>

    <!-- 切换到注册 -->
    <div class="pannel_footer">
      <span class="footer_text">{{ t("login.noAccount") }}</span>
      <button class="footer_link" @click="emit('switchToRegister')">
        {{ t("login.signUp") }}
      </button>
    </div>

    <!-- 服务条款和隐私政策 -->
    <div class="terms_footer">
      <span class="terms_text">{{ t("login.termsText") }}</span>
      <a href="#" class="terms_link">{{ t("login.terms") }}</a>
      <span class="terms_separator">和</span>
      <a href="#" class="terms_link">{{ t("login.privacy") }}</a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login_pannel {
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

.login_form {
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

.form_options {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  margin-top: 0.5rem;
}

.switch_link {
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: #feeede;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #fbe7e0;
  }
}

.forgot_link {
  font-family: "Source Serif", serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: #feeede;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #fbe7e0;
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
  .login_pannel {
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

  .form_options {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
