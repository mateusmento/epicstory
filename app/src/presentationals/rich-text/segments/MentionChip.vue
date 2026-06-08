<script lang="ts" setup>
import type { IUser as IUser } from "@epicstory/contracts";
import { computed } from "vue";
import MentionHoverCard from "./MentionHoverCard.vue";

/**
 * Shared mention chip (hover + “me” highlight). Used by the TipTap node view and the JSON preview renderer.
 */
const props = defineProps<{
  attrs: Record<string, unknown> | undefined;
  mentionMeId: number | undefined;
  userById: (id: number) => IUser | undefined;
}>();

const id = computed(() => Number(props.attrs?.id ?? props.attrs?.userId));
const label = computed(() => String(props.attrs?.label ?? props.attrs?.id ?? props.attrs?.userId ?? ""));

const user = computed<IUser | undefined>(() =>
  Number.isFinite(id.value) ? props.userById(id.value) : undefined,
);

const raw = computed(() => `@${id.value}`);
const display = computed(() => `@${user.value?.name ?? (label.value || id.value)}`);

const isSelf = computed(
  () => props.mentionMeId != null && !Number.isNaN(id.value) && props.mentionMeId === id.value,
);
</script>

<template>
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
</template>
