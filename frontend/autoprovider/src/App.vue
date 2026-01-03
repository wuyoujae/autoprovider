<script setup lang="ts">
// App.vue 现在使用路由系统
import { onMounted } from "vue";
import GlobalMessage from "@/components/global/global-message.vue";
import GlobalAdPopup from "@/components/global/global-ad-popup.vue";
import request from "@/api/request";
import { useAd } from "@/stores/ad";

const { show: showAd } = useAd();
const ADV_CACHE_KEY = "ap_latest_adv_id";

const loadLatestAd = async () => {
  try {
    const adv = await request({
      url: "systeminfo.getlatestadv",
      method: "get",
      showErrorMessage: false,
    });

    if (!adv || !adv.adv_id || !adv.adv_src) return;

    const cachedId = localStorage.getItem(ADV_CACHE_KEY);
    if (cachedId && cachedId === adv.adv_id) return;

    showAd({
      src: adv.adv_src,
      title: adv.adv_title || "广告",
      onClose: () => {
        localStorage.setItem(ADV_CACHE_KEY, adv.adv_id);
      },
    });
  } catch (error) {
    console.error("获取广告失败", error);
  }
};

onMounted(() => {
  loadLatestAd();
});
</script>

<template>
  <div id="app">
    <router-view />
    <GlobalMessage />
    <GlobalAdPopup />
  </div>
</template>

<style scoped>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
