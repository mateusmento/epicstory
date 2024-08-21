<script lang="ts" setup>
import { Slot } from "radix-vue";
import { useNavViewContent } from "./nav-view";

defineProps<{
  content: string;
}>();

const { viewContent } = useNavViewContent();
</script>

<template>
  <Slot v-if="viewContent === content" :key="viewContent">
    <slot />
  </Slot>
</template>
