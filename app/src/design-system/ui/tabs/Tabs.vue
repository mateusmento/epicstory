<script setup lang="ts">
import { TabsRoot, useForwardPropsEmits } from "radix-vue";
import type { TabsRootEmits, TabsRootProps } from "radix-vue";
import { ref, watch } from "vue";
import { provideTabContext, type TabValue } from "./tabs.context";

const props = defineProps<TabsRootProps>();
const emits = defineEmits<TabsRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);

const currentValue = ref<TabValue | undefined>(props.modelValue ?? props.defaultValue);

watch(
  () => props.modelValue,
  (value) => {
    if (value !== undefined) currentValue.value = value;
  },
);

provideTabContext(currentValue);
</script>

<template>
  <TabsRoot v-bind="forwarded" @update:model-value="currentValue = $event">
    <slot />
  </TabsRoot>
</template>
