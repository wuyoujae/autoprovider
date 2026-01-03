<template>
  <div
    class="preferences-item"
    :class="{ 'preferences-item--disabled': disabled }"
  >
    <div class="preferences-item__content">
      <!-- 左侧：标题和描述 -->
      <div class="preferences-item__info">
        <div class="preferences-item__title-wrapper">
          <Label
            v-if="type !== 'button'"
            :for="item_id"
            class="preferences-item__label"
          >
            {{ label }}
            <span v-if="required" class="preferences-item__required">*</span>
          </Label>
          <button
            v-if="help_text"
            class="preferences-item__help-trigger"
            :title="help_text"
            type="button"
          >
            <HelpCircle class="preferences-item__help-icon" />
          </button>
        </div>
        <p v-if="description" class="preferences-item__description">
          {{ description }}
        </p>
      </div>

      <!-- 右侧：控件 -->
      <div class="preferences-item__control">
        <!-- Switch 开关 -->
        <Switch
          v-if="type === 'switch'"
          :id="item_id"
          :checked="model_value"
          :disabled="disabled"
          @update:checked="handleUpdate"
        />

        <!-- Checkbox 复选框 -->
        <Checkbox
          v-else-if="type === 'checkbox'"
          :id="item_id"
          :checked="model_value"
          :disabled="disabled"
          @update:checked="handleUpdate"
        />

        <!-- Input 输入框 -->
        <Input
          v-else-if="
            type === 'input' || type === 'email' || type === 'password'
          "
          :id="item_id"
          v-model="input_value"
          :type="type"
          :placeholder="placeholder"
          :disabled="disabled"
          class="preferences-item__input"
          @input="handleInputChange"
        />

        <!-- Select 下拉选择 -->
        <Select
          v-else-if="type === 'select'"
          v-model="select_value"
          :disabled="disabled"
        >
          <SelectTrigger :id="item_id" class="preferences-item__select">
            <SelectValue :placeholder="placeholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Textarea 文本域 -->
        <Textarea
          v-else-if="type === 'textarea'"
          :id="item_id"
          v-model="textarea_value"
          :placeholder="placeholder"
          :disabled="disabled"
          :rows="rows"
          class="preferences-item__textarea"
          @input="handleTextareaChange"
        />

        <!-- Button 按钮 -->
        <Button
          v-else-if="type === 'button'"
          :variant="button_variant"
          :disabled="disabled"
          @click="handleButtonClick"
        >
          {{ label }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { HelpCircle } from "lucide-vue-next";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  type:
    | "switch"
    | "checkbox"
    | "input"
    | "email"
    | "password"
    | "select"
    | "textarea"
    | "button";
  label: string;
  description?: string;
  help_text?: string;
  model_value?: boolean | string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  options?: SelectOption[];
  rows?: number;
  button_variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  rows: 3,
  button_variant: "default",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean | string];
  click: [];
}>();

// 生成唯一 ID
const item_id = computed(
  () => `preference-item-${props.label.toLowerCase().replace(/\s+/g, "-")}`
);

// Input 值
const input_value = ref(
  typeof props.model_value === "string" ? props.model_value : ""
);

// Select 值
const select_value = ref(
  typeof props.model_value === "string" ? props.model_value : ""
);

// Textarea 值
const textarea_value = ref(
  typeof props.model_value === "string" ? props.model_value : ""
);

// 监听 model_value 变化
watch(
  () => props.model_value,
  (new_value) => {
    if (typeof new_value === "string") {
      input_value.value = new_value;
      select_value.value = new_value;
      textarea_value.value = new_value;
    }
  }
);

// 处理 Switch/Checkbox 更新
const handleUpdate = (value: boolean) => {
  emit("update:modelValue", value);
};

// 处理 Input 变化
const handleInputChange = () => {
  emit("update:modelValue", input_value.value);
};

// 处理 Textarea 变化
const handleTextareaChange = () => {
  emit("update:modelValue", textarea_value.value);
};

// 处理按钮点击
const handleButtonClick = () => {
  emit("click");
};

// 监听 select_value 变化
watch(select_value, (new_value) => {
  emit("update:modelValue", new_value);
});
</script>

<style lang="scss" scoped>
.preferences-item {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.2s ease;

  &:hover:not(&--disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__title-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  &__label {
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
    font-family: "Source Serif 4", serif;
    cursor: pointer;
    line-height: 1.5;
  }

  &__required {
    color: #fdc4c4;
    margin-left: 0.125rem;
  }

  &__help-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: help;
    padding: 0;
    color: rgba(255, 255, 255, 0.5);
    transition: color 0.2s ease;

    &:hover {
      color: #feeede;
    }
  }

  &__help-icon {
    width: 1rem;
    height: 1rem;
  }

  &__description {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Source Serif 4", serif;
    line-height: 1.5;
    margin-top: 0.25rem;
  }

  &__control {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    min-width: 12rem;
    justify-content: flex-end;
  }

  &__input,
  &__select,
  &__textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    color: #fff;
    font-size: 0.9375rem;
    font-family: "Source Serif 4", serif;
    transition: all 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    &:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(254, 238, 222, 0.3);
      box-shadow: 0 0 0 2px rgba(254, 238, 222, 0.1);
    }

    &:hover:not(:disabled) {
      border-color: rgba(255, 255, 255, 0.2);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__input {
    padding: 0.5rem 0.75rem;
    height: 2.5rem;
  }

  &__textarea {
    padding: 0.625rem 0.75rem;
    resize: vertical;
    min-height: 5rem;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .preferences-item {
    padding: 1rem;

    &__content {
      flex-direction: column;
      gap: 1rem;
    }

    &__control {
      width: 100%;
      min-width: auto;
      justify-content: flex-start;
    }

    &__label {
      font-size: 0.9375rem;
    }

    &__description {
      font-size: 0.8125rem;
    }
  }
}

@media (max-width: 480px) {
  .preferences-item {
    padding: 0.875rem;
    border-radius: 0.625rem;

    &__label {
      font-size: 0.875rem;
    }

    &__description {
      font-size: 0.8125rem;
    }
  }
}
</style>
