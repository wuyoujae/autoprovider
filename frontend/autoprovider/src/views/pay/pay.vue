<template>
  <div class="placeholder-page">
    <div class="placeholder-card">
      <h1>开源版未包含支付功能</h1>
      <p>此页面在开源版本中被移除，仅保留占位。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 开源版不提供支付逻辑，保留空页面占位以避免路由/构建报错。
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

