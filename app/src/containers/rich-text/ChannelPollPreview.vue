<script lang="ts" setup>
import { cn } from "@/design-system/utils";
import { useDependency } from "@/core/dependency-injection";
import { useChannelStore } from "@/domain/channels";
import type { MessagePollClient as IMessagePollClient } from "@epicstory/contracts";
import { ChannelApi } from "@epicstory/api-client";
import { Check } from "lucide-vue-next";
import { computed, ref } from "vue";

const props = defineProps<{
  messageId: number;
  poll: IMessagePollClient;
}>();

const channelApi = useDependency(ChannelApi);
const channelStore = useChannelStore();

const votingOptionId = ref<string | null>(null);

const question = computed(() => props.poll.question.trim() || "Poll");

const options = computed(() => props.poll.options);

const totalVotes = computed(() => props.poll.totalVotes ?? 0);

function voteShare(optionId: string): number {
  const t = totalVotes.value;
  if (t <= 0) return 0;
  const n = props.poll.optionVotes?.[optionId] ?? 0;
  return Math.round((n / t) * 100);
}

function countFor(optionId: string): number {
  return props.poll.optionVotes?.[optionId] ?? 0;
}

const myOptionId = computed(() => props.poll.myOptionId ?? null);

async function onPick(optionId: string) {
  if (votingOptionId.value) return;
  votingOptionId.value = optionId;
  try {
    const res = await channelApi.voteMessagePoll(props.messageId, optionId);
    const poll = res.poll;
    const acts = [...channelStore.activities];
    const i = acts.findIndex((a) => a.type === "message_sent" && a.messageId === props.messageId);
    if (i >= 0) {
      const act = acts[i];
      const msg = act.message!;
      acts[i] = { ...act, message: { ...msg, poll } };
      channelStore.activities = acts;
    }
  } finally {
    votingOptionId.value = null;
  }
}

function rowClasses(optionId: string): string {
  const selected = myOptionId.value === optionId;
  return cn(
    "border border-transparent transition-colors",
    selected ? "border-primary/35 bg-primary/5" : "hover:bg-muted/40",
  );
}
</script>

<template>
  <div
    class="my-2 w-full max-w-lg rounded-xl border border-border bg-card px-3 py-3 text-sm shadow-sm"
    data-testid="channel-poll-preview"
  >
    <p class="mb-3 font-semibold leading-snug text-foreground">
      {{ question }}
    </p>
    <ul class="flex flex-col gap-2">
      <li v-for="opt in options" :key="opt.id">
        <button
          type="button"
          :class="
            cn(
              rowClasses(opt.id),
              'relative flex w-full items-stretch rounded-full py-0.5 pr-2 text-left cursor-pointer',
            )
          "
          :disabled="votingOptionId != null"
          @click="onPick(opt.id)"
        >
          <span class="relative min-h-10 min-w-0 flex-1 overflow-hidden rounded-full">
            <span
              class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-primary/20 transition-[width] duration-300"
              :style="{ width: `${voteShare(opt.id)}%` }"
              aria-hidden="true"
            />
            <span
              class="relative z-[1] flex min-h-10 items-center px-3 text-[13px] leading-snug text-foreground"
            >
              {{ opt.label }}
            </span>
          </span>
          <span class="relative z-[2] flex shrink-0 items-center gap-1.5 pl-2">
            <span
              v-if="myOptionId === opt.id"
              class="flex size-5 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border"
              aria-hidden="true"
            >
              <Check class="size-3 stroke-[3]" />
            </span>
            <span
              class="min-w-[2.75rem] tabular-nums text-right text-[13px] font-medium text-muted-foreground"
            >
              {{ voteShare(opt.id) }}%
            </span>
          </span>
        </button>
        <span class="sr-only">{{ countFor(opt.id) }} votes</span>
      </li>
    </ul>
    <p v-if="totalVotes > 0" class="mt-2 text-xs text-muted-foreground">{{ totalVotes }} votes</p>
  </div>
</template>
