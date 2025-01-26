<script lang="ts" setup>
import { Button, NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { computed } from "vue";

const props = defineProps<{
  view: string;
  content: string;
}>();

const { content: currentContent } = useNavTrigger(props.view);

const active = computed(() => props.content === currentContent.value);
</script>

<template>
  <NavTrigger
    :as="Button"
    v-bind="props"
    size="sm"
    variant="ghost"
    :class="cn('justify-start', { 'bg-secondary': active })"
  >
    <slot />
  </NavTrigger>
</template>
