<template>
  <div class="preferences">
    <div class="preferences__container">
      <!-- 页面标题 -->
      <div class="preferences__header">
        <h1 class="preferences__title">{{ $t("preferences.title") }}</h1>
        <p class="preferences__subtitle">{{ $t("preferences.subtitle") }}</p>
      </div>

      <!-- AI 模型配置区域 -->
      <div class="preferences__content">
        <!-- Agent 模型配置 -->
        <DashboardPreferencesGroup
          :title="$t('preferences.sections.agentModels')"
        >
          <p class="model-hint">{{ $t("preferences.llm.hintAgent") }}</p>
          <div class="model-list">
            <div
              v-for="(provider, index) in agentProviders"
              :key="`agent-${index}`"
              class="model-provider-card"
            >
              <div class="provider-header">
                <div class="provider-info">
                  <h3 class="provider-name">{{ provider.provider }}</h3>
                  <p class="provider-url">{{ provider.baseUrl }}</p>
                </div>
                <div class="provider-actions">
                  <button
                    @click="editProvider('agent', index)"
                    class="btn-icon"
                    :title="$t('common.edit')"
                  >
                    <Edit2 :size="16" />
                  </button>
                  <button
                    @click="deleteProvider('agent', index)"
                    class="btn-icon btn-delete"
                    :title="$t('common.delete')"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
              <div class="provider-models">
                <div
                  v-for="(model, mIdx) in provider.models"
                  :key="`model-${mIdx}`"
                  class="model-tag"
                >
                  {{ model.model || model }}
                  <span v-if="model.tokenLimit" class="token-limit">
                    ({{ formatTokenLimit(model.tokenLimit) }})
                  </span>
                </div>
              </div>
            </div>

            <button @click="addProvider('agent')" class="btn-add-provider">
              <Plus :size="20" />
              {{ $t("preferences.llm.addProvider") }}
            </button>
          </div>
        </DashboardPreferencesGroup>

        <!-- Mini 模型配置 -->
        <DashboardPreferencesGroup
          :title="$t('preferences.sections.miniModels')"
        >
          <p class="model-hint">{{ $t("preferences.llm.hintMini") }}</p>
          <div class="model-list">
            <div
              v-for="(provider, index) in miniProviders"
              :key="`mini-${index}`"
              class="model-provider-card"
            >
              <div class="provider-header">
                <div class="provider-info">
                  <h3 class="provider-name">{{ provider.provider }}</h3>
                  <p class="provider-url">{{ provider.baseUrl }}</p>
                </div>
                <div class="provider-actions">
                  <button
                    @click="editProvider('mini', index)"
                    class="btn-icon"
                    :title="$t('common.edit')"
                  >
                    <Edit2 :size="16" />
                  </button>
                  <button
                    @click="deleteProvider('mini', index)"
                    class="btn-icon btn-delete"
                    :title="$t('common.delete')"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
              <div class="provider-models">
                <div
                  v-for="(model, mIdx) in provider.models"
                  :key="`model-${mIdx}`"
                  class="model-tag"
                >
                  {{ model.model || model }}
                  <span v-if="model.tokenLimit" class="token-limit">
                    ({{ formatTokenLimit(model.tokenLimit) }})
                  </span>
                </div>
              </div>
            </div>

            <button @click="addProvider('mini')" class="btn-add-provider">
              <Plus :size="20" />
              {{ $t("preferences.llm.addProvider") }}
            </button>
          </div>
        </DashboardPreferencesGroup>

        <!-- EditFile 模型配置 -->
        <DashboardPreferencesGroup
          :title="$t('preferences.sections.editFileModels')"
        >
          <p class="model-hint">{{ $t("preferences.llm.hintEdit") }}</p>
          <div class="model-list">
            <div
              v-for="(provider, index) in editFileProviders"
              :key="`editfile-${index}`"
              class="model-provider-card"
            >
              <div class="provider-header">
                <div class="provider-info">
                  <h3 class="provider-name">{{ provider.provider }}</h3>
                  <p class="provider-url">{{ provider.baseUrl }}</p>
                </div>
                <div class="provider-actions">
                  <button
                    @click="editProvider('editfile', index)"
                    class="btn-icon"
                    :title="$t('common.edit')"
                  >
                    <Edit2 :size="16" />
                  </button>
                  <button
                    @click="deleteProvider('editfile', index)"
                    class="btn-icon btn-delete"
                    :title="$t('common.delete')"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
              <div class="provider-models">
                <div
                  v-for="(model, mIdx) in provider.models"
                  :key="`model-${mIdx}`"
                  class="model-tag"
                >
                  {{ model.model || model }}
                  <span v-if="model.tokenLimit" class="token-limit">
                    ({{ formatTokenLimit(model.tokenLimit) }})
                  </span>
                </div>
              </div>
            </div>

            <button @click="addProvider('editfile')" class="btn-add-provider">
              <Plus :size="20" />
              {{ $t("preferences.llm.addProvider") }}
            </button>
          </div>
        </DashboardPreferencesGroup>

        <!-- 保存按钮 -->
        <div class="preferences__actions">
          <button @click="saveConfig" :disabled="isSaving" class="btn-save">
            <Save :size="18" />
            {{
              isSaving
                ? $t("preferences.actions.saving")
                : $t("preferences.actions.save")
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- 模型供应商编辑弹窗 -->
    <DashboardPreferencesProviderModal
      v-if="showModal"
      :modelType="currentModelType"
      :provider="currentProvider"
      :isEdit="isEdit"
      @save="handleSaveProvider"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, Edit2, Trash2, Save } from "lucide-vue-next";
import DashboardPreferencesGroup from "@/components/views/dashboard/dashboard-preferences/dashboard-preferences-group.vue";
import DashboardPreferencesProviderModal from "@/components/views/dashboard/dashboard-preferences/dashboard-preferences-provider-modal.vue";
import request from "@/api/request";
import message from "@/utils/message";

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

const agentProviders = ref<ProviderConfig[]>([]);
const editFileProviders = ref<ProviderConfig[]>([]);
const miniProviders = ref<ProviderConfig[]>([]);

const showModal = ref(false);
const currentModelType = ref<"agent" | "editfile" | "mini">("agent");
const currentProvider = ref<ProviderConfig | null>(null);
const currentIndex = ref(-1);
const isEdit = ref(false);
const isSaving = ref(false);

// 加载配置
const loadConfig = async () => {
  try {
    const response: any = await request({
      url: "llmconfig.get",
      method: "get",
    });
    if (response) {
      // 将扁平的模型列表重新组合为供应商列表
      agentProviders.value = groupByProvider(response.agentModels || []);
      editFileProviders.value = groupByProvider(response.editFileModels || []);
      miniProviders.value = groupByProvider(response.miniModels || []);
    }
  } catch (error) {
    console.error("加载模型配置失败:", error);
    message.requestError(t("preferences.llm.saveFailed"));
  }
};

// 将扁平模型列表按供应商分组
const groupByProvider = (models: any[]): ProviderConfig[] => {
  const groups = new Map<string, ProviderConfig>();

  for (const model of models) {
    const key = `${model.provider}|||${model.baseUrl}|||${model.apiKey}`;

    if (!groups.has(key)) {
      groups.set(key, {
        provider: model.provider,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        models: [],
      });
    }

    groups.get(key)!.models.push({
      model: model.model,
      tokenLimit: model.tokenLimit,
    });
  }

  return Array.from(groups.values());
};

// 格式化 token 限制
const formatTokenLimit = (limit: number) => {
  if (limit >= 1000000) {
    return `${(limit / 1000000).toFixed(1)}M`;
  } else if (limit >= 1000) {
    return `${(limit / 1000).toFixed(0)}K`;
  }
  return limit.toString();
};

// 添加供应商
const addProvider = (modelType: "agent" | "editfile" | "mini") => {
  currentModelType.value = modelType;
  currentProvider.value = {
    provider: "",
    baseUrl: "",
    apiKey: "",
    models: [],
  };
  currentIndex.value = -1;
  isEdit.value = false;
  showModal.value = true;
};

// 编辑供应商
const editProvider = (
  modelType: "agent" | "editfile" | "mini",
  index: number
) => {
  currentModelType.value = modelType;
  const providers =
    modelType === "agent"
      ? agentProviders.value
      : modelType === "editfile"
      ? editFileProviders.value
      : miniProviders.value;
  currentProvider.value = JSON.parse(JSON.stringify(providers[index])); // 深拷贝
  currentIndex.value = index;
  isEdit.value = true;
  showModal.value = true;
};

// 删除供应商
const deleteProvider = (
  modelType: "agent" | "editfile" | "mini",
  index: number
) => {
  if (!confirm(t("preferences.llm.confirmDelete"))) return;

  if (modelType === "agent") {
    agentProviders.value.splice(index, 1);
  } else if (modelType === "editfile") {
    editFileProviders.value.splice(index, 1);
  } else {
    miniProviders.value.splice(index, 1);
  }
};

// 保存供应商
const handleSaveProvider = (provider: ProviderConfig) => {
  const providers =
    currentModelType.value === "agent"
      ? agentProviders.value
      : currentModelType.value === "editfile"
      ? editFileProviders.value
      : miniProviders.value;

  if (isEdit.value && currentIndex.value >= 0) {
    providers[currentIndex.value] = provider;
  } else {
    providers.push(provider);
  }

  closeModal();
};

// 关闭弹窗
const closeModal = () => {
  showModal.value = false;
  currentProvider.value = null;
  currentIndex.value = -1;
};

// 保存配置
const saveConfig = async () => {
  isSaving.value = true;
  try {
    await request({
      url: "llmconfig.save",
      method: "post",
      data: {
        agentProviders: agentProviders.value,
        editFileProviders: editFileProviders.value,
        miniProviders: miniProviders.value,
      },
    });

    message.requestSuccess(t("preferences.llm.saveSuccess"));
  } catch (error) {
    console.error("保存模型配置失败:", error);
    message.requestError(t("preferences.llm.saveFailed"));
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadConfig();
});
</script>

<style lang="scss" scoped>
.preferences {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #242429;

  &__container {
    max-width: 60rem;
    margin: 0 auto;
    padding: 2rem;
  }

  &__header {
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 2.25rem;
    font-weight: 700;
    color: #fff;
    font-family: "Source Serif 4", serif;
    margin-bottom: 0.5rem;
    line-height: 1.2;
  }

  &__subtitle {
    font-size: 1.125rem;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Source Serif 4", serif;
    line-height: 1.5;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__actions {
    margin-top: 2rem;
    display: flex;
    justify-content: flex-end;
  }
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.model-provider-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(254, 238, 222, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.provider-info {
  flex: 1;
}

.provider-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.25rem;
  font-family: "Source Serif 4", serif;
}

.provider-url {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

.provider-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
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

  &.btn-delete:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
}

.provider-models {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.model-tag {
  background: rgba(254, 238, 222, 0.15);
  color: #feeede;
  padding: 0.375rem 0.875rem;
  border-radius: 1rem;
  font-size: 0.8125rem;
  font-family: "Source Code Pro", monospace;
  border: 1px solid rgba(254, 238, 222, 0.2);
}

.token-limit {
  color: rgba(255, 255, 255, 0.5);
  margin-left: 0.25rem;
}

.btn-add-provider {
  background: rgba(254, 238, 222, 0.05);
  border: 2px dashed rgba(254, 238, 222, 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-family: "Source Serif 4", serif;

  &:hover {
    background: rgba(254, 238, 222, 0.08);
    border-color: rgba(254, 238, 222, 0.4);
    color: #feeede;
  }
}

.btn-save {
  background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
  color: #242429;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: "Source Serif 4", serif;
  box-shadow: 0 4px 12px rgba(254, 238, 222, 0.2);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(254, 238, 222, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

.model-hint {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: "Source Serif 4", serif;
}

// 响应式设计
@media (max-width: 768px) {
  .preferences {
    &__container {
      padding: 1rem;
    }

    &__title {
      font-size: 1.875rem;
    }

    &__subtitle {
      font-size: 1rem;
    }
  }

  .provider-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .provider-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
