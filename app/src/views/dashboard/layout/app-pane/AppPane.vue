<script lang="ts" setup>
import { Collapsible, CollapsibleContent } from "@/design-system";
import { ref } from "vue";
import { NavView } from "../nav-view";

const open = defineModel<boolean>("open");
const content = ref("channels");

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
        class="h-full w-96 border-r border-r-zinc-300/60"
      >
        <slot />
      </CollapsibleContent>
    </Collapsible>
  </NavView>
</template>
