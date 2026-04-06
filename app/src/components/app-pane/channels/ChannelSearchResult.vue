<script setup lang="ts">
import { ScrollArea } from "@/design-system";
import type { ISearchChannelsAndUsersItem } from "@/domain/channels/types";
import { HashIcon, Loader2Icon } from "lucide-vue-next";

const props = defineProps<{
  items: ISearchChannelsAndUsersItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "reached-bottom"): void;
  (e: "select-channel", channelId: number): void;
  (e: "select-user", email: string): void;
}>();

const getItemKey = (item: ISearchChannelsAndUsersItem) =>
  item.kind === "channel" ? `c-${item.channel.id}` : `u-${item.user.id}`;

const shouldShowPeopleHeader = (
  items: ISearchChannelsAndUsersItem[],
  index: number,
) => {
  const item = items[index];
  if (!item || item.kind !== "user") return false;
  return index === 0 || items[index - 1]?.kind === "channel";
};
</script>

<template>
  <ScrollArea class="min-h-0 flex-1" @reached-bottom="emit('reached-bottom')">
    <div class="block !min-h-0">
      <div
        v-if="!props.loading && props.items.length === 0"
        class="px-3 py-8 text-center text-xs text-secondary-foreground"
      >
        No channels or people match your search.
      </div>

      <template v-for="(item, index) in props.items" :key="getItemKey(item)">
        <div
          v-if="shouldShowPeopleHeader(props.items, index)"
          class="border-t border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground first:border-t-0"
        >
          Start a direct message
        </div>

        <button
          v-if="item.kind === 'channel'"
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-secondary"
          @click="emit('select-channel', item.channel.id)"
        >
          <img
            v-if="item.channel.speakingTo?.picture"
            :src="item.channel.speakingTo.picture"
            class="h-8 w-8 shrink-0 rounded-full"
          />
          <HashIcon
            v-else
            class="h-5 w-5 shrink-0 text-muted-foreground"
            stroke-width="2.5"
          />
          <span class="truncate font-medium">
            {{ item.channel.name || item.channel.speakingTo?.name }}
          </span>
        </button>

        <button
          v-else
          type="button"
          class="flex w-full flex-col items-stretch gap-0.5 px-3 py-2.5 text-left text-xs hover:bg-secondary sm:flex-row sm:items-center sm:gap-3"
          @click="emit('select-user', item.user.email)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <img
              v-if="item.user.picture"
              :src="item.user.picture"
              class="h-8 w-8 shrink-0 rounded-full"
            />
            <div v-else class="h-8 w-8 shrink-0 rounded-full bg-muted" />
            <span class="truncate font-medium">{{ item.user.name }}</span>
          </div>
          <span class="truncate text-[11px] text-secondary-foreground sm:ml-auto">
            {{ item.user.email }}
          </span>
        </button>
      </template>

      <div v-if="props.loading && props.items.length > 0" class="flex justify-center py-3">
        <Loader2Icon class="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    </div>
  </ScrollArea>
</template>
