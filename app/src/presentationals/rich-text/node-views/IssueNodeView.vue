<script lang="ts" setup>
import type { IssueReference } from "@epicstory/contracts";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed } from "vue";
import IssueBadge from "../segments/IssueBadge.vue";

const props = defineProps(nodeViewProps);

const issueById = (id: number): IssueReference | undefined => {
  const lookup = (props.extension.options as { issueById?: (id: number) => IssueReference | undefined })
    ?.issueById;
  return lookup?.(id);
};

const attrsRecord = computed(() => props.node.attrs as Record<string, unknown>);
</script>

<template>
  <NodeViewWrapper as="span" class="inline">
    <IssueBadge :attrs="attrsRecord" :issue-by-id="issueById" :navigate-on-click="false" />
  </NodeViewWrapper>
</template>
