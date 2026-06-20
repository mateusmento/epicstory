<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { Label, type LabelProps } from "radix-vue";
import { cn } from "@/design-system/utils";

const props = defineProps<LabelProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <Label
    v-bind="delegatedProps"
    :class="
      cn(
        'text-[0.8125rem] font-semibold leading-none text-accent-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </Label>
</template>
