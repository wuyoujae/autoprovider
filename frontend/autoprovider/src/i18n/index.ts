import { createI18n } from "vue-i18n";
import zh_cn from "./locales/zh-cn.json";
import en_us from "./locales/en-us.json";

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: "zh-cn", // 默认语言
  fallbackLocale: "en-us", // 回退语言
  messages: {
    "zh-cn": zh_cn,
    "en-us": en_us,
    "en": en_us, // 添加 'en' 作为 'en-us' 的别名，解决回退时的 locale 匹配问题
  },
});

export default i18n;

