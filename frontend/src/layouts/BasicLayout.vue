<script setup lang="ts">
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <a-layout class="basic-layout">
    <GlobalHeader />

    <a-layout-content class="main-content">
      <RouterView />
    </a-layout-content>

    <GlobalFooter />
  </a-layout>
</template>

<style scoped>
.basic-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 24px;
  background: #f5f7fa;
}
</style>
