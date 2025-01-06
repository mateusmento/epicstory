<script lang="ts" setup>
import type { VNodeTypes } from "vue";
import { useNavTrigger } from "./nav-view";

const props = defineProps<{
  as?: VNodeTypes;
  view: string;
  content: string;
  props?: any;
}>();

const { viewContent } = useNavTrigger(props.view);

function trigger() {
  viewContent(props.content, props.props);
}
</script>

<template>
  <component :is="as ?? 'div'" @click.stop="trigger">
    <slot />
  </component>
</template>
