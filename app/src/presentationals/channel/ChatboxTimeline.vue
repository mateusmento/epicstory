<script lang="ts" setup>
import { ScrollArea } from "@/design-system";
import type { OlderPageState } from "@/lib/async";
import type { ChatTimelineItem } from "@/lib/chat-timeline";
import { chatTimelineRowCount } from "@/lib/chat-timeline";
import MessageGroup from "@/presentationals/channel/MessageGroup.vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import { useThrottleFn } from "@vueuse/core";
import type { VNodeRef } from "vue";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  channelId: number;
  timeline: ChatTimelineItem[];
  olderPage: OlderPageState;
  loadOlder: () => Promise<void>;
  meId: number;
}>();

const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null);

const introEl = ref<HTMLElement | null>(null);
const introHeight = ref(0);
let introResizeObserver: ResizeObserver | null = null;

/** Intro marks the true start of history — hide while older pages can still load. */
const showIntro = computed(() => !props.olderPage.hasOlder);

function timelineRowKey(item: ChatTimelineItem) {
  return item.kind === "messages" ? `g-${item.group.id}` : `a-${item.activity.id}`;
}

function messageRow(index: number): Extract<ChatTimelineItem, { kind: "messages" }> | undefined {
  const item = props.timeline[index];
  return item?.kind === "messages" ? item : undefined;
}

function activityRow(index: number): Extract<ChatTimelineItem, { kind: "activity" }> | undefined {
  const item = props.timeline[index];
  return item?.kind === "activity" ? item : undefined;
}

function timelineRowKeyAt(index: number) {
  const item = props.timeline[index];
  return item ? timelineRowKey(item) : String(index);
}

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.timeline.length,
    getScrollElement: () => scrollAreaRef.value?.getScrollElement() ?? null,
    estimateSize: () => 150,
    overscan: 8,
    paddingStart: introHeight.value,
    scrollPaddingStart: introHeight.value,
    getItemKey: (index: number) => {
      const item = props.timeline[index];
      return item ? timelineRowKey(item) : index;
    },
  })),
);

const measureTimelineRow: VNodeRef = (el) => {
  rowVirtualizer.value.measureElement(el as HTMLElement | null);
};

watch(
  [introEl, showIntro],
  ([el, visible]) => {
    introResizeObserver?.disconnect();
    introResizeObserver = null;
    if (!el || !visible) {
      introHeight.value = 0;
      return;
    }
    const ro = new ResizeObserver(() => {
      introHeight.value = Math.round(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    introHeight.value = Math.round(el.getBoundingClientRect().height);
    introResizeObserver = ro;
  },
  { flush: "post" },
);

const prependBusy = ref(false);

async function loadOlderWithScrollPreserve() {
  if (prependBusy.value || !props.olderPage.hasOlder || props.olderPage.loadingOlder) return;
  prependBusy.value = true;
  const el = scrollAreaRef.value?.getScrollElement();
  if (!el) {
    prependBusy.value = false;
    return;
  }
  const prevScrollHeight = el.scrollHeight;
  const prevScrollTop = el.scrollTop;
  try {
    await props.loadOlder();
  } finally {
    await nextTick();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const v = scrollAreaRef.value?.getScrollElement();
        if (v) {
          v.scrollTop = prevScrollTop + (v.scrollHeight - prevScrollHeight);
        }
        prependBusy.value = false;
      });
    });
  }
}

const NEAR_TOP_PX = 200;

const onViewportScroll = useThrottleFn(() => {
  const el = scrollAreaRef.value?.getScrollElement();
  if (!el || el.scrollTop > NEAR_TOP_PX) return;
  if (!props.olderPage.hasOlder || props.olderPage.loadingOlder || prependBusy.value) return;
  loadOlderWithScrollPreserve();
}, 100);

watch(
  scrollAreaRef,
  (area, prev) => {
    const prevEl = prev?.getScrollElement?.() ?? null;
    if (prevEl) prevEl.removeEventListener("scroll", onViewportScroll);
    const el = area?.getScrollElement?.() ?? null;
    if (el) el.addEventListener("scroll", onViewportScroll, { passive: true });
  },
  { immediate: true },
);

onUnmounted(() => {
  introResizeObserver?.disconnect();
  scrollAreaRef.value?.getScrollElement?.()?.removeEventListener("scroll", onViewportScroll);
});

function timelineEndCursor(timeline: ChatTimelineItem[]): string | null {
  const last = timeline[timeline.length - 1];
  if (!last) return null;
  if (last.kind === "messages") {
    const m = last.group.messages[last.group.messages.length - 1];
    if (!m) return null;
    return `${new Date(m.sentAt as unknown as string).getTime()}\0${m.id}`;
  }
  const a = last.activity;
  return `${new Date(a.createdAt).getTime()}\0${a.id}`;
}

const prevMessageTotal = ref(-1);
const prevTimelineEndCursor = ref<string | null>(null);
/** Set when initial pin-to-bottom should run once ScrollArea is mounted. */
const pendingInitialScroll = ref(false);

watch(
  () => props.channelId,
  () => {
    prevMessageTotal.value = -1;
    prevTimelineEndCursor.value = null;
    pendingInitialScroll.value = false;
  },
);

function requestScrollToBottom() {
  if (scrollAreaRef.value) {
    scrollAreaRef.value.scrollToBottom();
    return true;
  }
  return false;
}

watch(
  () => chatTimelineRowCount(props.timeline),
  (totalRows) => {
    const endCur = timelineEndCursor(props.timeline);
    const prev = prevMessageTotal.value;
    if (prev < 0) {
      prevMessageTotal.value = totalRows;
      prevTimelineEndCursor.value = endCur;
      // Immediate: meeting chat (and remounts) often open with an already-loaded timeline,
      // so this watch would never fire without `immediate` and we'd stay at scrollTop 0.
      if (totalRows > 0) {
        pendingInitialScroll.value = !requestScrollToBottom();
      }
      return;
    }
    if (totalRows > prev) {
      const prevEnd = prevTimelineEndCursor.value;
      prevMessageTotal.value = totalRows;
      prevTimelineEndCursor.value = endCur;
      if (endCur !== prevEnd) {
        requestScrollToBottom();
      }
    } else {
      prevMessageTotal.value = totalRows;
      prevTimelineEndCursor.value = endCur;
    }
  },
  { immediate: true, flush: "post" },
);

// Thread → channel remount can run the row-count watch before ScrollArea's template ref is set.
watch(scrollAreaRef, (area) => {
  if (!area || !pendingInitialScroll.value) return;
  pendingInitialScroll.value = false;
  area.scrollToBottom();
});

function scrollToBottom() {
  scrollAreaRef.value?.scrollToBottom();
}

defineExpose({
  scrollToBottom,
  scrollMessagesToBottom: scrollToBottom,
});
</script>

<template>
  <ScrollArea class="min-h-0 h-full" ref="scrollAreaRef">
    <div class="flex:col-xl !flex justify-end p-4 min-h-full pb-14">
      <div
        class="w-full"
        :style="{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }"
      >
        <div v-if="showIntro" ref="introEl" class="absolute left-0 right-0 top-0 z-[1]">
          <slot name="intro" />
        </div>

        <div
          v-for="virtualRow in rowVirtualizer.getVirtualItems()"
          :key="timelineRowKeyAt(virtualRow.index)"
          :data-index="virtualRow.index"
          :ref="measureTimelineRow"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <MessageGroup
            v-if="messageRow(virtualRow.index)"
            :sender="messageRow(virtualRow.index)!.group.sender"
            :meId="meId"
            :sentAt="messageRow(virtualRow.index)!.group.sentAt"
          >
            <slot
              v-for="message of messageRow(virtualRow.index)!.group.messages"
              :key="message.id"
              name="message"
              :message="message"
              :me-id="meId"
            />
          </MessageGroup>
          <slot
            v-else-if="activityRow(virtualRow.index)"
            name="activity"
            :activity="activityRow(virtualRow.index)!.activity"
            :me-id="meId"
          />
        </div>
      </div>
    </div>
  </ScrollArea>
</template>
