<script setup lang="ts">
defineProps<{
  name: string;
}>();
</script>

<template>
  <div class="greetings">Hello {{ name }}</div>
</template>

<style scoped></style>
