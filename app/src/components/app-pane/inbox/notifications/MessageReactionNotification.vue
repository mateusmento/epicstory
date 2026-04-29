<script lang="ts" setup>
import { UserAvatar } from "@/components/user";
import type {
  MessageReactionNotificationPayload,
  ReplyReactionNotificationPayload,
} from "@/domain/notifications/types/notification.types";
import { formatDistanceToNow } from "date-fns";
import { computed } from "vue";

const props = defineProps<{
  kind: "message_reaction" | "reply_reaction";
  payload: MessageReactionNotificationPayload | ReplyReactionNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

const reactor = computed(() => props.payload.reactor);

const reactorName = computed(() => reactor.value?.name ?? "Someone");

/** Human channel context — never "Channel #id"; API sends labels like DMs / Team / Chat. */
const channelContext = computed(() => props.payload.channelName?.trim() || "");

const headline = computed(() =>
  props.kind === "reply_reaction" ? "reacted to your reply" : "reacted to your message",
);

const emoji = computed(() => props.payload.emoji || "👍");

const excerpt = computed(() => props.payload.messageExcerpt?.trim() ?? "");
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col gap-md text-left font-dmSans">
    <div class="flex items-start justify-between gap-2">
      <p class="min-w-0 text-sm leading-snug text-foreground">
        <span class="text-base leading-none" aria-hidden="true">{{ emoji }}</span>
        <span class="ml-1.5 text-muted-foreground">{{ headline }}</span>
      </p>
      <time class="shrink-0 whitespace-nowrap text-xs text-muted-foreground" :datetime="createdAt">
        {{ formatTime(createdAt) }}
      </time>
    </div>

    <div class="flex gap-3 min-w-0">
      <UserAvatar v-if="reactor" :name="reactor.name" :picture="reactor.picture" size="lg" class="shrink-0" />
      <div
        v-else
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
      >
        ?
      </div>
      <div class="min-w-0 flex-1 flex flex-col">
        <div class="line-clamp-1">
          <span class="leading-tight text-foreground font-lato">{{ reactorName }}</span>
          <span v-if="channelContext" class="ml-1 text-xs text-muted-foreground">
            <template v-if="channelContext !== reactorName"> in {{ channelContext }} </template>
            <template v-else> in direct message </template>
          </span>
        </div>

        <p v-if="excerpt" class="line-clamp-1 text-sm leading-relaxed text-secondary-foreground font-lato">
          <span class="text-base leading-none" aria-hidden="true">{{ emoji }}</span>
          <span class="ml-1.5">{{ excerpt }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
