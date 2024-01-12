<script setup lang="ts">
import { provideDependencyInjection } from '@/core/dependency-injection';
import { RouterView } from 'vue-router';

provideDependencyInjection();
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
