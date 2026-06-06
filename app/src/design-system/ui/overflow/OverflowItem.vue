<script lang="ts" setup>
import type { HTMLAttributes } from "vue";
import { Slot } from "reka-ui";
import { computed, onBeforeMount, onBeforeUnmount, watch } from "vue";
import { useOverflowSegment } from "./overflow-context";
import { useOverflowSegmentElement } from "./use-overflow-segment-element";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    as?: string;
    segmentKey?: string;
    pinned?: boolean;
  }>(),
  {
    as: "div",
    pinned: false,
  },
);

const { id, context } = useOverflowSegment({ kind: "item" });

onBeforeMount(() => {
  context.registerSegment(id, "item", {
    segmentKey: props.segmentKey,
    pinned: props.pinned,
  });
});

onBeforeUnmount(() => {
  context.unregisterSegment(id);
});

watch(
  () => [props.segmentKey, props.pinned] as const,
  ([segmentKey, pinned]) => {
    context.updateSegment(id, { segmentKey, pinned });
  },
);

const { setRootEl, contentClass, edge, visible, outerClass } = useOverflowSegmentElement({
  id,
  context,
});

const rootClass = computed(() => outerClass(props.class));
</script>

<template>
  <component
    :is="as"
    :ref="setRootEl"
    v-show="visible"
    data-slot="overflow-item"
    :data-overflow-edge="edge"
    :class="rootClass"
  >
    <Slot :class="contentClass">
      <slot />
    </Slot>
  </component>
</template>
