<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">
          {{ isEdit ? $t('preferences.llm.editProvider') : $t('preferences.llm.addProvider') }}
        </h2>
        <button @click="handleClose" class="btn-close">
          <X :size="24" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 供应商名称 -->
        <div class="form-group">
          <label class="form-label">
            {{ $t('preferences.llm.providerName') }}
            <span class="required">*</span>
          </label>
          <input
            v-model="formData.provider"
            type="text"
            class="form-input"
            :placeholder="$t('preferences.llm.providerPlaceholder')"
          />
        </div>

        <!-- Base URL -->
        <div class="form-group">
          <label class="form-label">
            {{ $t('preferences.llm.baseUrl') }}
            <span class="required">*</span>
          </label>
          <input
            v-model="formData.baseUrl"
            type="text"
            class="form-input"
            :placeholder="$t('preferences.llm.baseUrlPlaceholder')"
          />
        </div>

        <!-- API Key -->
        <div class="form-group">
          <label class="form-label">
            {{ $t('preferences.llm.apiKey') }}
            <span class="required">*</span>
          </label>
          <input
            v-model="formData.apiKey"
            type="password"
            class="form-input"
            :placeholder="$t('preferences.llm.apiKeyPlaceholder')"
          />
        </div>

        <!-- 模型列表 -->
        <div class="form-group">
          <label class="form-label">
            {{ $t('preferences.llm.models') }}
            <span class="required">*</span>
          </label>
          <div class="models-list">
            <div
              v-for="(model, index) in formData.models"
              :key="`model-${index}`"
              class="model-item"
            >
              <div class="model-inputs">
                <input
                  v-model="model.model"
                  type="text"
                  class="form-input model-name-input"
                  :placeholder="$t('preferences.llm.modelNamePlaceholder')"
                />
                <input
                  v-model.number="model.tokenLimit"
                  type="number"
                  class="form-input token-limit-input"
                  :placeholder="$t('preferences.llm.tokenLimitPlaceholder')"
                />
              </div>
              <button
                @click="removeModel(index)"
                class="btn-remove-model"
                :title="$t('common.delete')"
              >
                <Trash2 :size="18" />
              </button>
            </div>

            <button @click="addModel" class="btn-add-model">
              <Plus :size="18" />
              {{ $t('preferences.llm.addModel') }}
            </button>
          </div>
        </div>

        <!-- 提示信息 -->
        <div class="form-hint">
          <Info :size="16" />
          <span>{{ $t('preferences.llm.modelOrderHint') }}</span>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" class="btn-secondary">
          {{ $t('common.cancel') }}
        </button>
        <button @click="handleSave" class="btn-primary" :disabled="!isValid">
          {{ $t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { X, Plus, Trash2, Info } from "lucide-vue-next";

const { t } = useI18n();

interface ModelConfig {
  model: string;
  tokenLimit?: number;
}

interface ProviderConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  models: ModelConfig[];
}

interface Props {
  modelType: "agent" | "editfile" | "mini";
  provider: ProviderConfig | null;
  isEdit: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  save: [provider: ProviderConfig];
  close: [];
}>();

const formData = reactive<ProviderConfig>({
  provider: "",
  baseUrl: "",
  apiKey: "",
  models: [],
});

// 初始化表单数据
watch(
  () => props.provider,
  (newProvider) => {
    if (newProvider) {
      formData.provider = newProvider.provider;
      formData.baseUrl = newProvider.baseUrl;
      formData.apiKey = newProvider.apiKey;
      formData.models = newProvider.models.length > 0
        ? JSON.parse(JSON.stringify(newProvider.models))
        : [{ model: "", tokenLimit: undefined }];
    } else {
      formData.provider = "";
      formData.baseUrl = "";
      formData.apiKey = "";
      formData.models = [{ model: "", tokenLimit: undefined }];
    }
  },
  { immediate: true }
);

// 表单验证
const isValid = computed(() => {
  if (!formData.provider || !formData.baseUrl || !formData.apiKey) {
    return false;
  }
  
  // 至少有一个有效的模型
  const hasValidModel = formData.models.some((m) => m.model && m.model.trim());
  return hasValidModel;
});

// 添加模型
const addModel = () => {
  formData.models.push({ model: "", tokenLimit: undefined });
};

// 删除模型
const removeModel = (index: number) => {
  if (formData.models.length > 1) {
    formData.models.splice(index, 1);
  }
};

// 保存
const handleSave = () => {
  if (!isValid.value) return;
  
  // 过滤掉空的模型
  const validModels = formData.models
    .filter((m) => m.model && m.model.trim())
    .map((m) => ({
      model: m.model.trim(),
      tokenLimit: m.tokenLimit && m.tokenLimit > 0 ? m.tokenLimit : undefined,
    }));
  
  emit("save", {
    provider: formData.provider.trim(),
    baseUrl: formData.baseUrl.trim(),
    apiKey: formData.apiKey.trim(),
    models: validModels,
  });
};

// 关闭
const handleClose = () => {
  emit("close");
};
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: #1e1e23;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  font-family: "Source Serif 4", serif;
}

.btn-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

.required {
  color: #ef4444;
  margin-left: 0.25rem;
}

.form-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  color: #fff;
  font-size: 0.9375rem;
  transition: all 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.08);
  }
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.model-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.model-inputs {
  flex: 1;
  display: flex;
  gap: 0.5rem;
}

.model-name-input {
  flex: 2;
}

.token-limit-input {
  flex: 1;
}

.btn-remove-model {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
  }
}

.btn-add-model {
  background: rgba(59, 130, 246, 0.1);
  border: 1px dashed rgba(59, 130, 246, 0.4);
  color: #3b82f6;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  margin-top: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary,
.btn-primary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

.btn-primary {
  background: #3b82f6;
  color: #fff;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 响应式设计
@media (max-width: 640px) {
  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .model-inputs {
    flex-direction: column;
  }

  .model-name-input,
  .token-limit-input {
    flex: 1;
  }
}
</style>

