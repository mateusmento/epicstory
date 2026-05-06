<script lang="ts" setup>
import { computed } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import type { User } from "@/domain/auth";
import MentionChip from "../segments/MentionChip.vue";

const props = defineProps(nodeViewProps);

const mentionContext = computed(
  () => (props.extension.options as { mentionContext?: { meId?: number } }).mentionContext,
);

const mentionMeId = computed(() => mentionContext.value?.meId);

const userById = (id: number): User | undefined => {
  const lookup = (props.extension.options as { userById?: (id: number) => User | undefined })?.userById;
  return lookup ? lookup(id) : undefined;
};
</script>

<template>
  <NodeViewWrapper as="span" class="inline">
    <MentionChip :attrs="props.node.attrs" :mention-me-id="mentionMeId" :user-by-id="userById" />
  </NodeViewWrapper>
</template>
