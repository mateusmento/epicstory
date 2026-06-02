<script setup lang="ts">
import { IssueKey } from "@/components/issue";

defineProps<{
  issueKey?: string;
  issueId: number;
  title: string;
}>();
</script>

<template>
  <span class="inline-flex items-center gap-1.5 min-w-0 truncate">
    <IssueKey v-if="issueKey" :issue-key="issueKey" />
    <span v-else class="text-xs font-mono tabular-nums text-muted-foreground shrink-0">#{{ issueId }}</span>
    <span class="truncate">{{ title }}</span>
  </span>
</template>
