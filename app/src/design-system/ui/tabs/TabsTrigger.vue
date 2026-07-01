<script setup lang="ts">
import { omit } from "lodash";
import { type HTMLAttributes, computed } from "vue";
import { TabsTrigger, type TabsTriggerProps, useForwardProps } from "radix-vue";
import {
  srfClasses,
  srfModifiers,
  type SurfaceIntent,
} from "@/design-system/ui/surface/surface-intent-classes";
import { cn } from "@/design-system/utils";
import { useTabActive } from "./tabs.context";

const props = withDefaults(
  defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"]; intent?: SurfaceIntent }>(),
  { intent: "secondary" },
);

const delegatedProps = computed(() => omit(props, "class", "intent"));

const forwardedProps = useForwardProps(delegatedProps);

const isActive = useTabActive(props.value);

const surfaceClasses = computed(() => {
  return [
    ...(isActive.value ? srfClasses("outline", "default") : srfClasses("text", props.intent)),
    ...srfModifiers({ elevated: isActive.value, click: !isActive.value, hover: !isActive.value }),
  ];
});
</script>

<template>
  <TabsTrigger
    v-bind="forwardedProps"
    :class="
      cn(
        surfaceClasses,
        `
          flex
          flex-1
          items-center
          justify-center
          whitespace-nowrap
          rounded-md
          px-3
          py-1
          text-sm
          font-medium
          ring-offset-background
          transition-all
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
          focus-visible:ring-offset-2
          disabled:pointer-events-none
          disabled:opacity-50
        `,
        props.class,
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
