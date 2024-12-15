<script lang="ts" setup>
import type { VNodeTypes } from "vue";
import { useNavTrigger } from "./nav-view";

const props = defineProps<{
  as?: VNodeTypes;
  view: string;
  content: string;
  props?: any;
}>();

const { viewContent, contentProps } = useNavTrigger(props.view);

function trigger() {
  viewContent.value = props.content;
  contentProps.value = props.props;
}
</script>

<template>
  <component :is="as ?? 'div'" @click.stop="trigger">
    <slot />
  </component>
</template>
