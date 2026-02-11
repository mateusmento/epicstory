<script lang="ts" setup>
import { computed } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import type { User } from "@/domain/auth";
import MentionHoverCard from "./MentionHoverCard.vue";

const props = defineProps(nodeViewProps);

const id = computed(() => Number(props.node.attrs.id ?? props.node.attrs.userId));
const label = computed(() =>
  String(props.node.attrs.label ?? props.node.attrs.id ?? props.node.attrs.userId ?? ""),
);

const user = computed<User | undefined>(() => {
  const lookup = (props.extension.options as any)?.userById as ((id: number) => User | undefined) | undefined;
  return lookup ? lookup(id.value) : undefined;
});

const raw = computed(() => `@${id.value}`);
const display = computed(() => `@${user.value?.name ?? (label.value || id.value)}`);
</script>

<template>
  <NodeViewWrapper as="span" class="inline">
    <MentionHoverCard :user="user" :raw="raw">
      <span
        class="mention-chip inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold cursor-pointer"
      >
        {{ display }}
      </span>
    </MentionHoverCard>
  </NodeViewWrapper>
</template>
