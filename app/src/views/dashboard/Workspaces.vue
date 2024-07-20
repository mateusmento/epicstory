<script setup lang="ts">
defineProps<{
  currentWorkspace: {
    name: string;
  };
}>();
</script>

<template>
  <div class="flex:rows-sm">
    <div class="text-xs text-zinc-500">Workspace</div>
    <div class="text-lg text-neutral-800">{{ currentWorkspace.name }}</div>
  </div>
</template>
