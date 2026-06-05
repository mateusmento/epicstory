<script lang="ts" setup>
import type { ComponentPublicInstance } from "vue";
import { nextTick, ref } from "vue";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import CodeBlockCard from "../segments/CodeBlockCard.vue";

const props = defineProps(nodeViewProps);

const codeBlockCardRef = ref<
  (ComponentPublicInstance & { setHostRef: (el: Element | ComponentPublicInstance | null) => void }) | null
>(null);

/** Floating collapse positions against the node-view shell (`NodeViewWrapper` root). */
function bindWrapperRef(el: Element | ComponentPublicInstance | null) {
  nextTick(() => {
    codeBlockCardRef.value?.setHostRef(el);
  });
}
</script>

<template>
  <NodeViewWrapper
    :ref="bindWrapperRef"
    as="div"
    :class="[
      'epic-code-card',
      'epic-code-card-shell',
      'my-2',
      'w-full',
      'max-w-full',
      'self-start',
      'min-h-0',
      'overflow-visible',
    ]"
  >
    <CodeBlockCard ref="codeBlockCardRef" variant="tiptap" v-bind="props" />
  </NodeViewWrapper>
</template>
