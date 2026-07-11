<script lang="ts" setup>
import { compareDescriptionThreadsByAnchor, layoutDescriptionThreadCards } from "@/lib/issues";
import type { IDescriptionThread } from "@epicstory/contracts";
import type { Editor, JSONContent } from "@tiptap/core";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { MentionComposerView } from "@/presentationals/rich-text/mention.types";
import IssueDescriptionThreadCard from "./IssueDescriptionThreadCard.vue";

const props = defineProps<{
  threads: IDescriptionThread[];
  editor: Editor | null;
  /** Element that contains both description and gutter (position: relative). */
  layoutRoot: HTMLElement | null;
  activeMarkId?: string | null;
  busy?: boolean;
  meName?: string | null;
  mePicture?: string | null;
  mention?: MentionComposerView;
  meId?: number;
  workspaceId?: number;
}>();

const emit = defineEmits<{
  focus: [markId: string];
  resolve: [thread: IDescriptionThread];
  accept: [thread: IDescriptionThread];
  reject: [thread: IDescriptionThread];
  reply: [thread: IDescriptionThread, content: JSONContent];
  deleteThread: [thread: IDescriptionThread];
  deleteMessage: [thread: IDescriptionThread, messageId: number];
  "mention-load-more": [];
}>();

const cardEls = ref(new Map<number, HTMLElement>());
const heights = ref(new Map<number, number>());
const idealTops = ref(new Map<number, number>());
const anchorFrom = ref(new Map<number, number>());

let resizeObserver: ResizeObserver | null = null;
let raf = 0;

function numberMapsEqual(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (b.get(k) !== v) return false;
  }
  return true;
}

function setCardEl(id: number, el: Element | null) {
  if (el instanceof HTMLElement) {
    const prev = cardEls.value.get(id);
    // Function refs run on every parent re-render; ignore same node to avoid a measure loop.
    if (prev === el) return;
    if (prev) resizeObserver?.unobserve(prev);
    cardEls.value.set(id, el);
    const h = el.offsetHeight;
    if (heights.value.get(id) !== h) {
      const next = new Map(heights.value);
      next.set(id, h);
      heights.value = next;
    }
    resizeObserver?.observe(el);
    scheduleMeasure();
    return;
  }

  const prev = cardEls.value.get(id);
  if (prev) resizeObserver?.unobserve(prev);
  cardEls.value.delete(id);
}

function measureAnchors() {
  const ed = props.editor;
  const root = props.layoutRoot;
  if (!ed || ed.isDestroyed || !root) return;

  const rootTop = root.getBoundingClientRect().top;
  const nextIdeal = new Map<number, number>();
  const nextFrom = new Map<number, number>();

  for (const thread of props.threads) {
    let from: number | null = null;
    ed.state.doc.descendants((node, pos) => {
      if (from != null) return false;
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.type.name === "descriptionThread" && mark.attrs.markId === thread.markId) {
          from = pos;
          return false;
        }
      }
    });

    if (from == null) {
      nextIdeal.set(thread.id, 0);
      nextFrom.set(thread.id, Number.MAX_SAFE_INTEGER);
      continue;
    }

    nextFrom.set(thread.id, from);
    try {
      const coords = ed.view.coordsAtPos(from);
      // Round to avoid subpixel churn retriggering layout while scrolling.
      nextIdeal.set(thread.id, Math.max(0, Math.round(coords.top - rootTop)));
    } catch {
      nextIdeal.set(thread.id, 0);
    }
  }

  if (!numberMapsEqual(idealTops.value, nextIdeal)) {
    idealTops.value = nextIdeal;
  }
  if (!numberMapsEqual(anchorFrom.value, nextFrom)) {
    anchorFrom.value = nextFrom;
  }
}

function scheduleMeasure() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    measureAnchors();
  });
}

const sortedThreads = computed(() => {
  return [...props.threads]
    .map((t) => ({
      thread: t,
      anchorFrom: anchorFrom.value.get(t.id) ?? Number.MAX_SAFE_INTEGER,
      createdAt: t.createdAt,
    }))
    .sort(compareDescriptionThreadsByAnchor)
    .map((x) => x.thread);
});

const placed = computed(() => {
  const inputs = sortedThreads.value.map((t) => ({
    id: t.id,
    idealTop: idealTops.value.get(t.id) ?? 0,
    height: heights.value.get(t.id) ?? 120,
  }));
  return layoutDescriptionThreadCards(inputs, 8);
});

const topById = computed(() => new Map(placed.value.map((p) => [p.id as number, p.top])));

watch(
  () => [props.threads, props.editor, props.layoutRoot] as const,
  async () => {
    await nextTick();
    scheduleMeasure();
  },
  { immediate: true, deep: true },
);

watch(
  () => props.editor,
  (ed, _prev, onCleanup) => {
    if (!ed || ed.isDestroyed) return;
    // Remeasure on doc changes only — not selectionUpdate (fires too often / fights scroll).
    const onUpdate = () => scheduleMeasure();
    ed.on("update", onUpdate);
    window.addEventListener("resize", scheduleMeasure);
    onCleanup(() => {
      ed.off("update", onUpdate);
      window.removeEventListener("resize", scheduleMeasure);
    });
  },
  { immediate: true },
);

resizeObserver = new ResizeObserver((entries) => {
  let changed = false;
  const next = new Map(heights.value);
  for (const entry of entries) {
    const el = entry.target;
    if (!(el instanceof HTMLElement)) continue;
    for (const [id, card] of cardEls.value) {
      if (card !== el) continue;
      const h = Math.round(el.offsetHeight);
      if (next.get(id) !== h) {
        next.set(id, h);
        changed = true;
      }
      break;
    }
  }
  if (!changed) return;
  heights.value = next;
  scheduleMeasure();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div class="relative min-w-0 w-full h-0 overflow-visible [overflow-anchor:none]">
    <div
      v-for="thread in sortedThreads"
      :key="thread.id"
      :ref="(el) => setCardEl(thread.id, el as Element | null)"
      class="absolute left-0 right-0 [overflow-anchor:none]"
      :style="{ top: `${topById.get(thread.id) ?? 0}px` }"
    >
      <IssueDescriptionThreadCard
        :thread="thread"
        :active="activeMarkId === thread.markId"
        :busy="busy"
        :me-name="meName"
        :me-picture="mePicture"
        :mention="mention"
        :me-id="meId"
        :workspace-id="workspaceId"
        @focus="emit('focus', thread.markId)"
        @resolve="emit('resolve', thread)"
        @accept="emit('accept', thread)"
        @reject="emit('reject', thread)"
        @reply="(content) => emit('reply', thread, content)"
        @delete-thread="emit('deleteThread', thread)"
        @delete-message="(messageId) => emit('deleteMessage', thread, messageId)"
        @mention-load-more="emit('mention-load-more')"
      />
    </div>
  </div>
</template>
