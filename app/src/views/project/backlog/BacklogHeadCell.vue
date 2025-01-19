<script lang="ts" setup>
import { Icon } from "@/design-system/icons";

defineProps<{
  label: string;
  show: boolean;
  order: "asc" | "desc";
}>();
</script>

<template>
  <div
    class="text-sm text-zinc-500 select-none cursor-pointer flex:row-md flex:center-y"
    :class="{ 'font-medium': show }"
  >
    <slot>{{ label }}</slot>
    <div class="group">
      <div class="group-hover:hidden">
        <Icon
          class="group-hover:hidden"
          :class="{ 'opacity-0': !show }"
          :name="`hi-arrow-sm-${order === 'asc' ? 'down' : 'up'}`"
        />
      </div>
      <div class="hidden group-hover:block">
        <Icon :class="{ 'opacity-0': !show }" name="io-close" @click.stop="$emit('reset')" />
      </div>
    </div>
  </div>
</template>
