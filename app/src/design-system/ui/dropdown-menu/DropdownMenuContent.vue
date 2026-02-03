<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  DropdownMenuContent,
  type DropdownMenuContentEmits,
  type DropdownMenuContentProps,
  DropdownMenuPortal,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/design-system/utils";
import { useDropdownMenuZContext } from "./dropdown-menu.context";

const props = withDefaults(defineProps<DropdownMenuContentProps & { class?: HTMLAttributes["class"], disabledPortal?: boolean }>(), {
  sideOffset: 4,
  disabledPortal: false,
});
const emits = defineEmits<DropdownMenuContentEmits>();

const delegatedProps = computed(() => {
  const delegated: any = { ...props };
  delete delegated.class;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const ctx = useDropdownMenuZContext();
const zClass = computed(() => {
  // Prefer our local context when available (trigger wrapper can register its element),
  // but fall back to document.activeElement which is typically the trigger when the menu opens.
  const insideDrawer =
    ctx?.isInsideDrawer.value ??
    (typeof document !== "undefined" && !!(document.activeElement as any)?.closest?.("[vaul-drawer]"));

  return insideDrawer ? "z-[70]" : "z-[80]";
});
</script>

<template>
  <DropdownMenuPortal :disabled="disabledPortal">
    <DropdownMenuContent v-bind="forwarded" :class="cn(
      'min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      zClass,
      props.class,
    )
      ">
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
