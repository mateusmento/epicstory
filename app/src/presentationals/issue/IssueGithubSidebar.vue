<script lang="ts" setup>
defineProps<{
  showGithubSection: boolean;
}>();
</script>

<template>
  <div v-if="showGithubSection" class="flex:col-sm min-w-0 border-t border-border pt-4">
    <slot name="banners" />
    <slot name="list" />
    <slot name="workflow" />
    <slot name="create-branch-dialog" />
  </div>
</template>
