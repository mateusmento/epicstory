<script lang="ts" setup>
import { useNavViewContent } from "./nav-view";

defineProps<{
  content: string;
}>();

const { viewContent } = useNavViewContent();
</script>

<template>
  <div v-if="viewContent === content" :key="viewContent">
    <slot />
  </div>
</template>
