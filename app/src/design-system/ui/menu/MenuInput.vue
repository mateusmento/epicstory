<script setup lang="ts">
import { MagnifyingGlassIcon } from "@radix-icons/vue";
import { reactiveOmit } from "@vueuse/core";
import { useForwardProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { nextTick, onMounted, ref } from "vue";

const props = defineProps<{
  placeholder?: string;
  class?: HTMLAttributes["class"];
  autoFocus?: boolean;
}>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);

const modelValue = defineModel<string>();

const inputEl = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  if (!props.autoFocus) return;
  await nextTick();
  inputEl.value?.focus({ preventScroll: true });
});

function handleKeydown(event: KeyboardEvent) {
  // Prevent reka-ui menu "typeahead" (character keys jump-focus menu items) while typing in this input.
  if (event.defaultPrevented) return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key.length !== 1) return;
  if (event.code === "Space") return;

  event.stopPropagation();
}
</script>

<template>
  <div class="flex:row-lg flex:center-y px-2 -m-1" @click.stop @pointerdown.stop>
    <MagnifyingGlassIcon class="h-4 w-4 text-muted-foreground" />
    <input
      v-bind="forwardedProps"
      v-model="modelValue"
      @keydown="handleKeydown"
      ref="inputEl"
      type="text"
      class="h-8 w-full px-2 text-xs outline-none"
      :placeholder="placeholder"
    />
  </div>
</template>
