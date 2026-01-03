<template>
  <Textarea
    v-model="input_text"
    :placeholder="props.placeholder || t('work.chat.placeholder')"
    class="work-chat-pannel-prompt-input"
    :rows="4"
    @keydown="handleKeydown"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  modelValue?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
}>();

const { t } = useI18n();

// 计算属性用于双向绑定
const input_text = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    emit("update:modelValue", value);
  },
});

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    emit("submit");
  }
};
</script>

<style lang="scss" scoped>
.work-chat-pannel-prompt-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.9375rem;
  font-family: "Source Serif 4", serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  resize: none;
  overflow-y: auto;
  padding: 0 0.5rem;
  padding-top: 0.3rem;

  // 使用mask-image实现顶部渐变，与文件预览区形成过渡效果
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 10px,
    black 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 10px,
    black 100%
  );

  // 隐藏滚动条但保留滚动功能
  &::-webkit-scrollbar {
    display: none;
  }

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }

  &:focus {
    outline: none;
    border: none;
    box-shadow: none;
  }

  &:hover:not(:focus) {
    outline: none;
  }

  &:focus-visible {
    outline: none;
  }

  @media (max-width: 768px) {
    font-size: 0.875rem;
    border-radius: 0.5625rem;
    padding: 0.4375rem 0.375rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8125rem;
    padding: 0.375rem 0.25rem;
  }
}
</style>
