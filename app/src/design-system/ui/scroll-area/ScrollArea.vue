<script setup lang="ts">
// This version of ScrollAreaViewport has a undesirable "display: table" at the container holding the slot
// Reason: https://github.com/radix-ui/primitives/issues/926#issuecomment-1630501544
// Override this with "display: <value> !important" at the immediate child of this component

import { cn } from "@/design-system/utils";
import { useInfiniteScroll } from "@vueuse/core";
import { ScrollAreaCorner, ScrollAreaRoot, type ScrollAreaRootProps, ScrollAreaViewport } from "radix-vue";
import { type HTMLAttributes, computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import ScrollBar from "./ScrollBar.vue";

const props = defineProps<
  ScrollAreaRootProps & {
    class?: HTMLAttributes["class"];
    bottom?: boolean;
  }
>();

const emit = defineEmits<{
  (e: "reached-bottom"): void;
}>();

const delegatedProps = computed(() => {
  const delegated = { ...(props as any) };
  delete delegated.class;
  return delegated;
});

const container = ref<{ viewportElement: HTMLElement }>();
const observer = ref<ResizeObserver>();

const listElement = computed(() => container.value?.viewportElement);

useInfiniteScroll(
  listElement,
  async () => {
    emit("reached-bottom");
  },
  { distance: 120, interval: 200 },
);

onMounted(() => {
  observer.value = new ResizeObserver((mutations) => {
    if (mutations.some((m) => m.target === container.value?.viewportElement.firstElementChild)) {
      if (props.bottom) scrollContainerToBottom();
    }
  });

  const element = container.value?.viewportElement.firstElementChild;
  if (element) observer.value.observe(element);
});

onUnmounted(() => {
  observer.value?.disconnect();
});

async function scrollContainerToBottom() {
  await nextTick();
  if (container.value) scrollToBottom(container.value?.viewportElement);
}

function scrollToBottom(el: HTMLElement) {
  el.scrollTop = el.scrollHeight - el.clientHeight;
}
</script>

<template>
  <ScrollAreaRoot v-bind="delegatedProps" :class="cn('relative overflow-hidden', props.class)">
    <ScrollAreaViewport class="h-full w-full rounded-[inherit]" ref="container" as-child>
      <slot />
    </ScrollAreaViewport>
    <ScrollBar />
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
