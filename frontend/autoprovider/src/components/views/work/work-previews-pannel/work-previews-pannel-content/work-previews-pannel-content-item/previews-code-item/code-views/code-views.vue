<template>
  <div class="code-views">
    <div
      v-show="props.value"
      ref="monaco_editor_container"
      class="code-views__editor"
    ></div>
    <div v-if="!props.value" class="code-views__empty">
      <div class="code-views__empty-content">
        <p>这里空空如也</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as monaco from "monaco-editor";

interface Props {
  language?: string;
  value?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: "typescript",
  value: "",
});

const monaco_editor_container = ref<HTMLDivElement | null>(null);
let editor_instance: monaco.editor.IStandaloneCodeEditor | null = null;

onMounted(() => {
  if (!monaco_editor_container.value) return;

  // 定义主题
  monaco.editor.defineTheme("autoprovider-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "ffffff", background: "242429" },
      { token: "comment", foreground: "6a9955", fontStyle: "italic" },
      { token: "keyword", foreground: "569cd6" },
      { token: "string", foreground: "ce9178" },
      { token: "number", foreground: "b5cea8" },
      { token: "type", foreground: "4ec9b0" },
      { token: "function", foreground: "dcdcaa" },
      { token: "variable", foreground: "9cdcfe" },
    ],
    colors: {
      "editor.background": "#242429",
      "editor.foreground": "#ffffff",
      "editor.lineHighlightBackground": "#2a2a2e",
      "editor.selectionBackground": "#3a3a40",
      "editorIndentGuide.background": "#3e3e42",
      "editorIndentGuide.activeBackground": "#707070",
      "editorLineNumber.foreground": "#858585",
      "editorLineNumber.activeForeground": "#c6c6c6",
      "editorCursor.foreground": "#ffffff",
      "editorWhitespace.foreground": "#3e3e42",
    },
  });

  // 创建编辑器实例
  editor_instance = monaco.editor.create(monaco_editor_container.value, {
    value: props.value,
    language: props.language,
    theme: "autoprovider-dark",
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'Source Serif 4', monospace",
    lineHeight: 24,
    minimap: {
      enabled: true,
      side: "right",
    },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    readOnly: true, // 设置为只读，因为是预览
    contextmenu: true,
    mouseWheelZoom: true,
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: false,
    renderWhitespace: "selection",
    bracketPairColorization: {
      enabled: true,
    },
  });

  // 监听值变化
  watch(
    () => props.value,
    (newValue) => {
      if (editor_instance && newValue !== editor_instance.getValue()) {
        editor_instance.setValue(newValue);
      }
    }
  );

  // 监听语言变化
  watch(
    () => props.language,
    (newLanguage) => {
      if (editor_instance) {
        monaco.editor.setModelLanguage(
          editor_instance.getModel()!,
          newLanguage
        );
      }
    }
  );
});

onUnmounted(() => {
  if (editor_instance) {
    editor_instance.dispose();
    editor_instance = null;
  }
});
</script>

<style lang="scss" scoped>
.code-views {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: #242429;

  &__editor {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  &__empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    font-family: "Source Serif 4", serif;
    font-size: 1rem;
  }
}
</style>
