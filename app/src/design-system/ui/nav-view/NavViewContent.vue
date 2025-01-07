<script lang="ts" setup>
import { Slot } from "radix-vue";
import { useNavViewContent } from "./nav-view";

defineProps<{
  content: string;
}>();

const context = useNavViewContent();
</script>

<template>
  <Slot v-if="context.content === content" :key="context.content">
    <slot :contentProps="context.props" />
  </Slot>
</template>
