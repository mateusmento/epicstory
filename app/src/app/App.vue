<script setup lang="ts">
import { provideDependencyContainer } from '@/core/dependency-injection';
import { RouterView } from 'vue-router';

provideDependencyContainer();
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
