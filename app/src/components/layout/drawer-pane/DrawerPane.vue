<script lang="ts" setup>
import {
  Collapsible,
  CollapsibleContent,
  NavView,
  type NavViewEmits,
  type NavViewProps,
} from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { isEqual } from "lodash";
import { computed } from "vue";

const props = defineProps<NavViewProps & { open: boolean; disableToggleOnSameViewTrigger?: boolean }>();
const emit = defineEmits<NavViewEmits & { (e: "update:open", value: boolean): void }>();

// Avoid `defineModel()` here: Storybook's vue-docgen pipeline parses the compiled output
// and can choke on the generated helper imports (`useModel`, `mergeModels`).
const open = computed({
  get: () => props.open,
  set: (v: boolean) => emit("update:open", v),
});

const { content, props: navViewProps } = useNavTrigger(props.view);

function onTrigger(v: string, props: any) {
  if (content.value === v && isEqual(props, navViewProps.value)) open.value = !open.value;
  else open.value = true;
  emit("trigger", v, props);
}
</script>

<template>
  <NavView :view="props.view" @trigger="onTrigger">
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
