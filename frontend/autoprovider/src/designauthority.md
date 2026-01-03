# 所有代码和设计均需要遵循下面标准

## 当前项目的大概：

本平台核心功能是帮助用户使用自然语言构建全栈应用并且自动部署上线，自动进行项目版本管理。

## 设计配色

整体页面风格设计简约高级

配色方案：
背景色：#242429。
辅助色
：#FEEEDE，#FBE7E0，#FED9D2，#E2C9C5，#EBD3CF，#FDC4C4，#F7DDDC，#AFB3BC。（可以偶尔使用渐变搭配使用）
文字色：#fff

## 设计字体

默认字体使用 Source Seri 4

字体单位都需要使用 rem

## 设计代码

代码风格需要使用 setup 语法糖，变量需要使用\_作为分割

css 代码需要使用 scss 语法

所有组件都必须要封装 shadcn 的组件来进行使用，尽量不要自己自定义组件，能有组件库中的优先使用

我们平台需要配置 18n 语言，在设计每个页面的内容的时候，都需要考虑同时配置 18n 的配置项

icon 都要使用 lucide-icons。

使用 logo+"utoprovider"展示的时候，logo 和 utoprovider 之间不能有空隙（不能设置 gap），要保持视觉连贯，并且要整体居中。

所有元素的 hover 效果不能有 transform 和边框，只需要使用字体颜色的变化来表示即可

所有组件不能有 outline，有 outline 的必须要去掉

写完的代码不需要写功能说明文档，除非我有明确要求

## 设计思维

每一个内容的设计和制作都需要考虑移动端视频和平板端适配。

## 接口代码设计

- 本平台需要使用请求拦截器 request.js
- 所有接口你需要根据接口文档，sdkdoc.md 中进行开发，不能使用虚假的接口
- 需要提前将接口存放在 api.js 中，设计例如：
  const NwAPI = {
  userinfo: {
  login: `${APIversion}/userinfo/login`,
  },
  };
  这个 json 可以无限嵌套，例如接口是:"/api/v1/userinfo/login/demo/js/ok"
  你应该写成
  const NwAPI = {
  userinfo: {
  login: {
  demo: {
  js: {
  ok: `${APIversion}/userinfo/login/demo/js/ok`
  }
  }
  }
  }
  }
