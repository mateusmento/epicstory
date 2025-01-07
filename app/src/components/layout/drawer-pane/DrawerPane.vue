<script lang="ts" setup>
import {
  Collapsible,
  CollapsibleContent,
  NavView,
  type NavViewEmits,
  type NavViewProps,
} from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";

const props = defineProps<NavViewProps>();
const emit = defineEmits<NavViewEmits>();

const open = defineModel<boolean>("open", { required: true });

const { content } = useNavTrigger(props.view);

function onNavViewTrigger(v: string) {
  open.value = content.value === v ? !open.value : true;
  emit("trigger", v);
}
</script>

<template>
  <NavView :view @trigger="onNavViewTrigger">
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
