<script lang="ts" setup>
import { Collapsible, CollapsibleContent, NavView } from "@/design-system";
import { ref } from "vue";

const open = defineModel<boolean>("open");
const content = ref("");

function onNavViewTrigger(v: string) {
  open.value = content.value === v ? !open.value : true;
  content.value = v;
}
</script>

<template>
  <NavView view="app-pane" v-model:content="content" @trigger="onNavViewTrigger">
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
