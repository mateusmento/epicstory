<script lang="ts" setup>
import { NavTrigger } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { computed } from "vue";

const props = defineProps<{
  view: string;
  content: string;
}>();

const { viewContent } = useNavTrigger(props.view);

const active = computed(() => props.content === viewContent.value);
</script>

<template>
  <NavTrigger
    v-bind="props"
    class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer"
    :class="{ 'bg-zinc-200/60': active }"
  >
    <slot />
  </NavTrigger>
</template>
