<script lang="ts" setup>
import { Separator } from "@/design-system";
</script>

<template>
  <div class="grid h-full" :class="$slots.header ? 'grid-rows-[auto_auto_1fr_auto]' : 'grid-rows-[1fr_auto]'">
    <template v-if="$slots.header">
      <slot name="header" />
      <Separator />
    </template>
    <div class="relative min-h-0">
      <slot name="timeline" />
      <slot name="typing" />
    </div>
    <slot name="composer" />
  </div>
</template>
