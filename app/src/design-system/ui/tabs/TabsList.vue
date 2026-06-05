<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { TabsList, type TabsListProps } from "radix-vue";
import { cn } from "@/design-system/utils";

const props = defineProps<TabsListProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = computed(() => {
  const { class: clazz, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <TabsList
    v-bind="delegatedProps"
    :class="cn('flex:center w-fit p-1 rounded-lg bg-muted text-muted-foreground', props.class)"
  >
    <slot />
  </TabsList>
</template>
