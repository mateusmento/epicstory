<script lang="ts" setup>
import { Separator } from "@/design-system";
</script>

<template>
  <div class="grid grid-rows-[auto_auto_1fr_auto] h-full">
    <slot name="header" />
    <Separator />
    <div class="relative min-h-0">
      <slot name="timeline" />
      <slot name="typing" />
    </div>
    <slot name="composer" />
  </div>
</template>
