<script lang="ts" setup>
import { useIssue } from "@/domain/issues/composables/issue";
import { onMounted } from "vue";

const props = defineProps<{
  issueId: number;
}>();

const { issue, fetchIssue } = useIssue();

onMounted(() => {
  fetchIssue(props.issueId);
});
</script>

<template>
  <div>
    <div>{{ issue?.title }}</div>
    <div>{{ issue?.description }}</div>
  </div>
</template>
