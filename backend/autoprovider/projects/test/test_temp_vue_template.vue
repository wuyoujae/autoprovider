<script setup lang="ts">
import { ref, onMounted } from "vue";
import MarkdownEditor from "../components/MarkdownEditor.vue";

const articleTitle = ref('');
const articleContent = ref('');

const submitArticle = () => {
  console.log('Title:', articleTitle.value);
  console.log('Content:', articleContent.value);
  // Here you would typically send this data to your backend API
};

</script>

<template>
  <main class="min-h-screen flex items-center justify-center">
    <h1 class="text-4xl font-bold">Admin Dashboard Page</h1>
  </main>
</template>

<style scoped></style>