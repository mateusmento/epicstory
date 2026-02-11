<script lang="ts" setup>
import type { User } from "@/domain/auth";
import { computed } from "vue";
import MentionHoverCard from "./MentionHoverCard.vue";

type Segment = { type: "text"; value: string } | { type: "mention"; id: number; raw: string; user?: User };

const props = defineProps<{
  content: string;
  mentionedUsers?: User[];
}>();

const usersById = computed(() => new Map((props.mentionedUsers ?? []).map((u) => [u.id, u])));

const segments = computed<Segment[]>(() => {
  const text = props.content ?? "";
  const re = /@(\d+)/g;
  const result: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const id = Number(match[1]);

    if (index > lastIndex) {
      result.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    const user = usersById.value.get(id);
    result.push({ type: "mention", id, raw, user });
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    result.push({ type: "text", value: text.slice(lastIndex) });
  }

  return result.length ? result : [{ type: "text", value: text }];
});
</script>

<template>
  <span class="whitespace-pre-wrap break-words">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'">{{ seg.value }}</span>
      <MentionHoverCard v-else :user="seg.user" :raw="seg.raw">
        <span
          class="inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold cursor-pointer"
        >
          @{{ seg.user?.name ?? seg.id }}
        </span>
      </MentionHoverCard>
    </template>
  </span>
</template>
