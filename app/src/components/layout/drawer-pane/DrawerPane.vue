<script lang="ts" setup>
import {
  Collapsible,
  CollapsibleContent,
  NavView,
  type NavViewEmits,
  type NavViewProps,
} from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { computed } from "vue";

const props = defineProps<NavViewProps & { open: boolean }>();
const emit = defineEmits<NavViewEmits & { (e: "update:open", value: boolean): void }>();

// Avoid `defineModel()` here: Storybook's vue-docgen pipeline parses the compiled output
// and can choke on the generated helper imports (`useModel`, `mergeModels`).
const open = computed({
  get: () => props.open,
  set: (v: boolean) => emit("update:open", v),
});

const { content } = useNavTrigger(props.view);

function onNavViewTrigger(v: string) {
  open.value = content.value === v ? !open.value : true;
  emit("trigger", v);
}
</script>

<template>
  <NavView :view="props.view" @trigger="onNavViewTrigger">
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
