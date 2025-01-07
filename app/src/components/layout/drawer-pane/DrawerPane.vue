<script lang="ts" setup>
import {
  Collapsible,
  CollapsibleContent,
  NavView,
  type NavViewEmits,
  type NavViewProps,
} from "@/design-system";

defineProps<NavViewProps>();
const emit = defineEmits<NavViewEmits>();

const open = defineModel<boolean>("open", { required: true });
const content = defineModel<string>("content", { required: true });

function onNavViewTrigger(v: string) {
  open.value = content.value === v ? !open.value : true;
  content.value = v;
  emit("trigger", v);
}
</script>

<template>
  <NavView :view :content @trigger="onNavViewTrigger">
    <Collapsible as-child :open="open">
      <CollapsibleContent
        as="aside"
        transition="horizontal"
        class="h-full w-fit border-r border-r-zinc-300/60"
        :class="$props.class"
      >
        <slot />
      </CollapsibleContent>
    </Collapsible>
  </NavView>
</template>
