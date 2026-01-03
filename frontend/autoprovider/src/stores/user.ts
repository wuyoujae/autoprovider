import { ref } from "vue";
import { defineStore } from "pinia";
import request from "@/api/request";

interface UserInfo {
  user_id: string;
  account: string;
  username: string;
  vip_type: "free" | "pro" | "ultra" | "ultimate";
  credits: number;
  create_time: string;
}

export const useUserStore = defineStore("user", () => {
  const user_info = ref<UserInfo | null>(null);
  const token = ref<string | null>(null);
  const is_loading = ref<boolean>(false);

  // 初始化时从 localStorage 读取
  const init_from_storage = () => {
    const stored_token = localStorage.getItem("token");
    const stored_user_info = localStorage.getItem("user_info");

    if (stored_token) {
      token.value = stored_token;
    }

    if (stored_user_info) {
      try {
        user_info.value = JSON.parse(stored_user_info);
      } catch (error) {
        console.error("解析用户信息失败:", error);
        localStorage.removeItem("user_info");
      }
    }
  };

  // 设置用户信息
  const set_user_info = (info: UserInfo) => {
    user_info.value = info;
    localStorage.setItem("user_info", JSON.stringify(info));
  };

  // 设置 token
  const set_token = (new_token: string) => {
    token.value = new_token;
    localStorage.setItem("token", new_token);
  };

  // 清除用户信息和 token
  const clear_user_token = () => {
    user_info.value = null;
    token.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user_info");
  };

  // 检查是否已登录
  const is_logged_in = () => {
    return !!user_info.value && !!token.value;
  };

  // 获取用户信息
  const fetch_user_info = async () => {
    if (!token.value) {
      console.error("未提供 token");
      return null;
    }

    is_loading.value = true;
    try {
      const data = await request({
        url: "userinfo.getuserinfo",
        method: "get",
        showErrorMessage: false, // 不显示错误消息，由调用方处理
      });

      if (data) {
        set_user_info(data);
        return data;
      }
      return null;
    } catch (error: unknown) {
      console.error("获取用户信息失败:", error);
      // 如果是 Error 类型，检查是否为 token 过期
      if (error instanceof Error && error.message.includes("无效的登录信息")) {
        clear_user_token();
      }
      return null;
    } finally {
      is_loading.value = false;
    }
  };

  // 初始化
  init_from_storage();

  return {
    user_info,
    token,
    is_loading,
    set_user_info,
    set_token,
    clear_user_token,
    clearUserToken: clear_user_token, // 兼容旧代码
    is_logged_in,
    fetch_user_info,
  };
});
