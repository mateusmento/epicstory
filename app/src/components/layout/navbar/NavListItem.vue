<script lang="ts" setup>
import { Button, NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { computed } from "vue";

const props = defineProps<{
  view: string;
  content: string;
}>();

const { currentContent } = useNavTrigger(props.view);

const active = computed(() => props.content === currentContent.value);
</script>

<template>
  <NavTrigger
    :as="Button"
    v-bind="props"
    size="sm"
    variant="secondary"
    :class="cn('shadow-none bg-transparent hover:bg-secondary cursor-pointer', { 'bg-secondary': active })"
  >
    <slot />
  </NavTrigger>
</template>
