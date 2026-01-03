<template>
  <div class="placeholder-page">
    <div class="placeholder-card">
      <h1>支付结果页已移除</h1>
      <p>开源版不包含支付功能，本页面仅为占位。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 支付结果展示在开源版中被移除。
</script>

<style scoped>
.placeholder-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #242429;
  color: #fff;
  padding: 2rem;
}

.placeholder-card {
  max-width: 520px;
  width: 100%;
  padding: 2rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}

.placeholder-card h1 {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.placeholder-card p {
  margin: 0;
  color: #afb3bc;
}
</style>

