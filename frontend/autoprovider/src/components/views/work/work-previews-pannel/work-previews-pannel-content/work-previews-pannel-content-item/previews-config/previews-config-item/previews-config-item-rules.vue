<template>
  <div class="config-rules">
    <div class="config-rules__header">
      <div class="config-rules__title-block">
        <h3 class="config-rules__title">
          {{ t("work.preview.config.rules.title") }}
        </h3>
        <p class="config-rules__subtitle">
          {{ t("work.preview.config.rules.subtitle") }}
        </p>
      </div>
      <div class="config-rules__actions">
        <button
          class="config-rules__btn config-rules__btn--primary"
          @click="handle_save"
        >
          <Save class="config-rules__btn-icon" />
          {{ t("common.save") }}
        </button>
      </div>
    </div>

    <div class="config-rules__editor">
      <textarea
        v-model="rules_content"
        class="config-rules__textarea"
        :placeholder="t('work.preview.config.rules.placeholder')"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { Save } from "lucide-vue-next";
import request from "@/api/request";

interface Props {
  project_id?: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

const rules_content = ref<string>("");
const rule_id = ref<string | null>(null);
const rule_version = ref<number>(0);
const loading = ref(false);
const saving = ref(false);

const fetch_rules = async () => {
  if (!props.project_id) {
    return;
  }
  loading.value = true;
  try {
    const result = await request({
      url: "rules.getrules",
      method: "post",
      data: { project_id: props.project_id },
      showSuccessMessage: false,
      showErrorMessage: true,
    });
    if (result) {
      rule_id.value = result.rule_id || null;
      rule_version.value = result.rule_version || 0;
      rules_content.value = result.rule_content || "";
    }
  } catch (error) {
    console.error("获取规则失败", error);
  } finally {
    loading.value = false;
  }
};

const handle_save = async () => {
  if (!props.project_id) {
    return;
  }
  saving.value = true;
  try {
    const result = await request({
      url: "rules.saverules",
      method: "post",
      data: {
        project_id: props.project_id,
        rule_content: rules_content.value,
      },
      showSuccessMessage: true,
      showErrorMessage: true,
    });
    if (result) {
      rule_id.value = result.rule_id || rule_id.value;
      rule_version.value = result.rule_version || rule_version.value;
    }
  } catch (error) {
    console.error("保存规则失败", error);
  } finally {
    saving.value = false;
  }
};

watch(
  () => props.project_id,
  (newProjectId) => {
    if (newProjectId) {
      fetch_rules();
    } else {
      rules_content.value = "";
      rule_id.value = null;
      rule_version.value = 0;
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.project_id) {
    fetch_rules();
  }
});
</script>

<style lang="scss" scoped>
.config-rules {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #fff;

  &__header {
    display: flex;
    align-items: center;
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
    color: rgba(255, 255, 255, 0.65);
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
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.55rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    outline: none;

    &:hover {
      color: #feeede;
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
    }

    &--primary {
      background: linear-gradient(135deg, #feeede 0%, #fbe7e0 100%);
      color: #242429;
      border-color: transparent;

      &:hover {
        color: #242429;
        background: linear-gradient(135deg, #fbe7e0 0%, #fed9d2 100%);
      }
    }
  }

  &__btn-icon {
    width: 1rem;
    height: 1rem;
  }

  &__editor {
    flex: 1;
    display: flex;
  }

  &__textarea {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    padding: 1rem;
    color: #fff;
    font-size: 0.95rem;
    font-family: "Source Serif 4", serif;
    resize: none;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
      border-color: rgba(255, 255, 255, 0.12);
    }

    &:focus {
      border-color: rgba(254, 238, 222, 0.25);
      background: rgba(255, 255, 255, 0.04);
    }
  }
}
</style>
