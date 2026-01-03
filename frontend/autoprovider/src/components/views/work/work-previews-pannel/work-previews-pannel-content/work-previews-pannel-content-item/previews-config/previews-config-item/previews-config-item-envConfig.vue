<template>
  <div class="env-config">
    <div class="env-config__header">
      <div class="env-config__title-block">
        <h3 class="env-config__title">
          {{ t("work.preview.config.envConfig.title") }}
        </h3>
        <p class="env-config__subtitle">
          {{ t("work.preview.config.envConfig.subtitle") }}
        </p>
      </div>

      <div class="env-config__actions">
        <button
          class="env-config__btn env-config__btn--ghost"
          :disabled="loading || saving"
          @click="handle_reset"
        >
          <RotateCcw class="env-config__btn-icon" />
          {{ t("work.preview.config.envConfig.reset") }}
        </button>
        <button
          class="env-config__btn env-config__btn--primary"
          :disabled="saving || loading"
          @click="handle_save"
        >
          <Save class="env-config__btn-icon" />
          {{ t("common.save") }}
        </button>
      </div>
    </div>

    <div class="env-config__body" :aria-busy="loading">
      <div class="env-config__table">
        <div class="env-config__table-head">
          <span>{{ t("work.preview.config.envConfig.key") }}</span>
          <span>{{ t("work.preview.config.envConfig.value") }}</span>
          <span>{{ t("work.preview.config.envConfig.commented") }}</span>
          <span class="env-config__table-head-action">
            {{ t("work.preview.config.envConfig.actions") }}
          </span>
        </div>

        <div class="env-config__rows">
          <div
            v-for="(item, index) in env_items"
            :key="`env-row-${index}`"
            class="env-config__row"
          >
            <input
              v-model="item.key"
              class="env-config__input"
              :placeholder="t('work.preview.config.envConfig.keyPlaceholder')"
            />
            <input
              v-model="item.value"
              class="env-config__input"
              :placeholder="t('work.preview.config.envConfig.valuePlaceholder')"
            />
            <label class="env-config__checkbox">
              <input
                type="checkbox"
                v-model="item.commented"
                :aria-label="t('work.preview.config.envConfig.commented')"
              />
              <span>{{
                t("work.preview.config.envConfig.commentedLabel")
              }}</span>
            </label>
            <button
              class="env-config__icon-btn"
              :disabled="env_items.length === 1"
              @click="handle_remove_item(index)"
            >
              <Trash2 class="env-config__icon" />
            </button>
          </div>
        </div>
      </div>

      <button class="env-config__add" @click="handle_add_item">
        <Plus class="env-config__add-icon" />
        <span>{{ t("work.preview.config.envConfig.add") }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-vue-next";
import request from "@/api/request";

interface Props {
  project_id?: string;
}

interface EnvItem {
  key: string;
  value: string;
  commented?: boolean;
}

const props = defineProps<Props>();
const { t } = useI18n();

const env_items = ref<EnvItem[]>([{ key: "", value: "", commented: false }]);
const initial_env_items = ref<EnvItem[]>([
  { key: "", value: "", commented: false },
]);
const loading = ref(false);
const saving = ref(false);

const normalize_items = (items: EnvItem[]) => {
  const normalized = items?.length ? items : [{ key: "", value: "" }];
  return normalized.map((item) => ({
    key: item.key || "",
    value: item.value || "",
    commented: Boolean(item.commented),
  }));
};

const fetch_env_config = async () => {
  if (!props.project_id) {
    env_items.value = [{ key: "", value: "", commented: false }];
    initial_env_items.value = [{ key: "", value: "", commented: false }];
    return;
  }
  loading.value = true;
  try {
    const result = await request({
      url: "workinfo.getenv",
      method: "get",
      params: { project_id: props.project_id },
      showSuccessMessage: false,
      showErrorMessage: true,
    });
    const fetched_items: EnvItem[] = Array.isArray(result?.env_items)
      ? result.env_items
      : [];
    env_items.value = normalize_items(fetched_items);
    initial_env_items.value = normalize_items(fetched_items);
  } catch (error) {
    console.error("获取环境配置失败", error);
  } finally {
    loading.value = false;
  }
};

const handle_add_item = () => {
  env_items.value.push({ key: "", value: "", commented: false });
};

const handle_remove_item = (index: number) => {
  if (env_items.value.length === 1) {
    env_items.value = [{ key: "", value: "", commented: false }];
    return;
  }
  env_items.value.splice(index, 1);
  if (!env_items.value.length) {
    env_items.value = [{ key: "", value: "", commented: false }];
  }
};

const handle_reset = () => {
  env_items.value = normalize_items(initial_env_items.value);
};

const handle_save = async () => {
  if (!props.project_id) {
    return;
  }
  saving.value = true;
  const payload = env_items.value
    .map((item) => ({
      key: item.key.trim(),
      value: item.value.trim(),
      commented: Boolean(item.commented),
    }))
    .filter((item) => item.key || item.value);

  try {
    const result = await request({
      url: "workinfo.saveenv",
      method: "post",
      data: {
        project_id: props.project_id,
        env_items: payload,
      },
      showSuccessMessage: true,
      showErrorMessage: true,
    });

    const returned_items: EnvItem[] = Array.isArray(result?.env_items)
      ? result.env_items
      : payload;
    env_items.value = normalize_items(returned_items);
  } catch (error) {
    console.error("保存环境配置失败", error);
  } finally {
    saving.value = false;
  }
};

watch(
  () => props.project_id,
  (new_project_id) => {
    if (new_project_id) {
      fetch_env_config();
    } else {
      env_items.value = [{ key: "", value: "", commented: false }];
      initial_env_items.value = [{ key: "", value: "", commented: false }];
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.project_id) {
    fetch_env_config();
  }
});
</script>

<style lang="scss" scoped>
.env-config {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #fff;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__title-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #feeede;
  }

  &__subtitle {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.55rem 0.95rem;
    border-radius: 0.55rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
    transition: color 0.15s ease;
    outline: none;

    &:hover {
      color: #feeede;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &--primary {
      background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
      color: #242429;
      border-color: transparent;
    }

    &--ghost {
      background: rgba(255, 255, 255, 0.04);
    }
  }

  &__btn-icon {
    width: 1rem;
    height: 1rem;
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
  }

  &__table {
    width: 100%;
    flex: 1;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow: hidden;
  }

  &__table-head {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 3.5rem;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);

    @media (max-width: 768px) {
      grid-template-columns: 1fr 1fr 2.75rem;
    }
  }

  &__table-head-action {
    text-align: right;
  }

  &__rows {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 3.5rem;
    gap: 0.75rem;
    align-items: center;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(4, auto);
      gap: 0.5rem;
    }
  }

  &__input {
    width: 100%;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.6rem;
    padding: 0.75rem 0.9rem;
    color: #fff;
    font-size: 0.95rem;
    font-family: "Source Serif 4", serif;
    outline: none;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;

    &:hover {
      color: #feeede;
    }

    &:focus {
      border-color: rgba(254, 238, 222, 0.35);
      background: rgba(255, 255, 255, 0.04);
    }
  }

  &__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem;
    border-radius: 0.55rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    transition: color 0.15s ease;
    outline: none;

    &:hover {
      color: #feeede;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    @media (max-width: 768px) {
      justify-content: flex-start;
      width: fit-content;
    }
  }

  &__icon {
    width: 1rem;
    height: 1rem;
  }

  &__checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;

    input {
      width: 1rem;
      height: 1rem;
      accent-color: #feeede;
      cursor: pointer;
    }
  }

  &__add {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    width: fit-content;
    padding: 0.55rem 0.9rem;
    border-radius: 0.55rem;
    border: 1px dashed rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.02);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    transition: color 0.15s ease;
    outline: none;

    &:hover {
      color: #feeede;
    }
  }

  &__add-icon {
    width: 1rem;
    height: 1rem;
  }
}
</style>
