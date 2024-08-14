<script lang="ts" setup>
import { TabsContent } from "radix-vue";
import { inject } from "vue";

defineProps<{
  name: string;
}>();

const { appSidebarContent } = inject("appLayout") as any;
</script>

<template>
  <TabsContent
    :value="name"
    class="h-full p-4 data-[state=open]:animate-collapsible-fadein"
    :data-state="appSidebarContent === name ? 'open' : 'closed'"
  >
    <slot />
  </TabsContent>
</template>
