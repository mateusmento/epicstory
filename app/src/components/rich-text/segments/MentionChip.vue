<script lang="ts" setup>
import type { User } from "@/domain/auth";
import { useAuth } from "@/domain/auth";
import { computed } from "vue";
import MentionHoverCard from "./MentionHoverCard.vue";

/**
 * Shared mention chip (hover + “me” highlight). Used by the TipTap node view and the JSON preview renderer.
 */
const props = defineProps<{
  attrs: Record<string, unknown> | undefined;
  mentionMeId: number | undefined;
  userById: (id: number) => User | undefined;
}>();

const { user: currentUser } = useAuth();

const id = computed(() => Number(props.attrs?.id ?? props.attrs?.userId));
const label = computed(() => String(props.attrs?.label ?? props.attrs?.id ?? props.attrs?.userId ?? ""));

const user = computed<User | undefined>(() =>
  Number.isFinite(id.value) ? props.userById(id.value) : undefined,
);

const raw = computed(() => `@${id.value}`);
const display = computed(() => `@${user.value?.name ?? (label.value || id.value)}`);

const selfId = computed(() => props.mentionMeId ?? currentUser.value?.id);

const isSelf = computed(() => selfId.value != null && !Number.isNaN(id.value) && selfId.value === id.value);
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
