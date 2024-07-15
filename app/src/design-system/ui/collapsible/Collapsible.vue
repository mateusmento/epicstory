<script setup lang="ts">
import { CollapsibleRoot, useForwardPropsEmits } from "radix-vue";
import type { CollapsibleRootEmits, CollapsibleRootProps } from "radix-vue";

type Props = CollapsibleRootProps;

const props = defineProps<Props>();

const emits = defineEmits<CollapsibleRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <CollapsibleRoot v-slot="{ open }" v-bind="forwarded">
    <slot :open="open" />
  </CollapsibleRoot>
</template>
