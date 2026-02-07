<script lang="ts" setup>
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/design-system";
import type { User } from "@/domain/auth";
import { computed } from "vue";

type Segment =
  | { type: "text"; value: string }
  | { type: "mention"; id: number; raw: string; user?: User };

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
      <HoverCard v-else :open-delay="100" :close-delay="0">
        <HoverCardTrigger as-child>
          <span class="inline-flex items-center px-1 rounded-md bg-[#c7f9ff] text-[#008194] font-bold cursor-pointer">
            @{{ seg.user?.name ?? seg.id }}
          </span>
        </HoverCardTrigger>
        <HoverCardContent class="w-64">
          <div v-if="seg.user" class="flex:row-md items-center">
            <img v-if="seg.user.picture" :src="seg.user.picture" :alt="seg.user.name"
              class="w-10 h-10 rounded-full flex-shrink-0" />
            <div v-else
              class="w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold">
              {{ seg.user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex:col min-w-0">
              <div class="text-sm font-semibold text-foreground truncate">{{ seg.user.name }}</div>
              <div class="text-xs text-secondary-foreground font-dmSans truncate">{{ seg.user.email }}</div>
            </div>
          </div>
          <div v-else class="text-sm text-secondary-foreground font-dmSans">
            Unknown user {{ seg.raw }}
          </div>
        </HoverCardContent>
      </HoverCard>
    </template>
  </span>
</template>
