<script lang="ts" setup>
import type { HTMLAttributes } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { cn } from "@/design-system/utils";
import { useOverflowContext, useOverflowSegment } from "./overflow-context";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const { id, context } = useOverflowSegment({ kind: "item" });
const contentEl = ref<HTMLElement | null>(null);

onMounted(() => {
  context.registerSegment(id, "item");
});

onBeforeUnmount(() => {
  context.unregisterSegment(id);
});

useResizeObserver(contentEl, (entries) => {
  context.setSegmentWidth(id, entries[0]?.contentRect.width ?? 0);
});

const edge = computed(() => context.segmentEdge(id));
const visible = computed(() => context.isSegmentVisible(id));
const layoutReady = computed(() => context.layoutReady.value);

const outerClass = computed(() => {
  if (!layoutReady.value) {
    return cn(
      "flex min-w-0",
      edge.value === "leading" || edge.value === "trailing" ? "shrink-[0.000001]" : "shrink",
      props.class,
    );
  }
  return cn("flex min-w-0 shrink-0", props.class);
});
</script>

<template>
  <div v-show="visible" data-slot="overflow-item" :data-overflow-edge="edge" :class="outerClass">
    <div ref="contentEl" class="inline-flex shrink-0">
      <slot />
    </div>
  </div>
</template>
