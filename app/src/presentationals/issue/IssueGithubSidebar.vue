<script lang="ts" setup>
defineProps<{
  showGithubSection: boolean;
}>();
</script>

<template>
  <div v-if="showGithubSection" class="flex:col-sm border-t border-border pt-4">
    <slot name="pull-requests" />
    <div class="flex:col-md mt-4 pt-3 border-t border-dashed border-border min-w-0">
      <slot name="workflow" />
      <slot name="create-branch-dialog" />
    </div>
  </div>
</template>
