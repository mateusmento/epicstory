<script lang="ts" setup>
import type { VNodeTypes } from "vue";
import { useNavTrigger } from "./nav-view";

const props = defineProps<{
  as?: VNodeTypes;
  view: string;
  content: string;
}>();

const { viewContent } = useNavTrigger(props.view);
</script>

<template>
  <component :is="as ?? 'div'" @click="viewContent = content">
    <slot />
  </component>
</template>
