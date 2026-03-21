<script setup lang="ts">
import { cn } from "@/design-system/utils";
import { reactiveOmit } from "@vueuse/core";
import type {
  ContextMenuContentEmits,
  ContextMenuContentProps,
  DropdownMenuContentEmits,
  DropdownMenuContentProps,
} from "reka-ui";
import {
  ContextMenuContent as RekaContextMenuContent,
  ContextMenuPortal as RekaContextMenuPortal,
  DropdownMenuContent as RekaDropdownMenuContent,
  DropdownMenuPortal as RekaDropdownMenuPortal,
  useForwardPropsEmits,
} from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { useResolvedMenuImplementation } from "./_shared";
import { useDropdownMenuZContext } from "./menu.context";

type MenuContentProps = DropdownMenuContentProps &
  ContextMenuContentProps & {
    class?: HTMLAttributes["class"];
    disabledPortal?: boolean;
  };

type MenuContentEmits = DropdownMenuContentEmits & ContextMenuContentEmits;

const props = withDefaults(defineProps<MenuContentProps>(), {
  sideOffset: 4,
  disabledPortal: false,
});
const emits = defineEmits<MenuContentEmits>();

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const impl = useResolvedMenuImplementation();

const contentComponent = computed(() =>
  impl.value === "dropdown-menu" ? RekaDropdownMenuContent : RekaContextMenuContent,
);

const portalComponent = computed(() =>
  impl.value === "dropdown-menu" ? RekaDropdownMenuPortal : RekaContextMenuPortal,
);

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
  <component :is="portalComponent" :disabled="disabledPortal">
    <component
      :is="contentComponent"
      v-bind="forwarded"
      :class="
        cn(
          'min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          zClass,
          props.class,
        )
      "
    >
      <slot />
    </component>
  </component>
</template>
