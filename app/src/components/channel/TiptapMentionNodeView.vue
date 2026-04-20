<script lang="ts" setup>
import { computed } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import type { User } from "@/domain/auth";
import { useAuth } from "@/domain/auth";
import MentionHoverCard from "./MentionHoverCard.vue";

const props = defineProps(nodeViewProps);

const { user: currentUser } = useAuth();

/** Set on the mention extension as `mentionContext` (reactive) so “me” matches `meId`, not only the auth store. */
const mentionContext = computed(
  () => (props.extension.options as { mentionContext?: { meId?: number } }).mentionContext,
);

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

const selfId = computed(() => mentionContext.value?.meId ?? currentUser.value?.id);

const isSelf = computed(() => selfId.value != null && !Number.isNaN(id.value) && selfId.value === id.value);
</script>

<template>
  <NodeViewWrapper as="span" class="inline">
    <MentionHoverCard :user="user" :raw="raw">
      <span
        class="mention-chip inline-flex items-center cursor-pointer"
        :class="
          isSelf
            ? 'px-0.5 rounded-sm bg-mentionHighlight text-mentionHighlight-foreground font-medium'
            : 'px-0.5 rounded-sm bg-mention-chip text-mention font-medium'
        "
      >
        {{ display }}
      </span>
    </MentionHoverCard>
  </NodeViewWrapper>
</template>
