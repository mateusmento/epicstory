<script setup lang="ts">
import type { HoverCardContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  HoverCardContent,
  HoverCardPortal,
  injectHoverCardRootContext,
  useForwardProps,
} from "reka-ui"
import { cn } from '@/design-system/utils'
import { computed } from "vue"

const props = withDefaults(
  defineProps<HoverCardContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    sideOffset: 4,
  },
)

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)

const rootContext = injectHoverCardRootContext()
const isInsideDrawer = computed(() => !!rootContext.triggerElement.value?.closest?.("[vaul-drawer]"))
const zClass = computed(() => (isInsideDrawer.value ? "z-[70]" : "z-50"))
</script>

<template>
  <HoverCardPortal>
    <HoverCardContent v-bind="forwardedProps" :class="cn(
      'pointer-events-auto w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      zClass,
      props.class,
    )">
      <slot />
    </HoverCardContent>
  </HoverCardPortal>
</template>
