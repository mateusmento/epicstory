<script lang="ts" setup>
import type { HTMLAttributes } from "vue";
import { Slot } from "reka-ui";
import { computed, onBeforeMount, onBeforeUnmount } from "vue";
import { useOverflowSegment } from "./overflow-context";
import { useOverflowSegmentElement } from "./use-overflow-segment-element";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    as?: string;
    segmentWidthPx?: number;
  }>(),
  {
    as: "div",
  },
);

const { id, context } = useOverflowSegment({ kind: "ellipsis" });

onBeforeMount(() => {
  context.registerSegment(id, "ellipsis");
});

onBeforeUnmount(() => {
  context.unregisterSegment(id);
});

const { setRootEl, contentClass, edge, visible, outerClass, stackOffsetStyle } = useOverflowSegmentElement({
  id,
  context,
  declaredWidthPx: computed(() => props.segmentWidthPx),
});

const rootClass = computed(() => outerClass(props.class));
const slotProps = computed(() => context.ellipsisSlotProps.value);
</script>

<template>
  <component
    :is="as"
    :ref="setRootEl"
    v-show="visible"
    data-slot="overflow-ellipsis"
    :data-overflow-edge="edge"
    :class="rootClass"
    :style="stackOffsetStyle"
  >
    <Slot :class="contentClass">
      <slot v-bind="slotProps" />
    </Slot>
  </component>
</template>
