<script lang="ts" setup>
import { TabsTrigger } from "radix-vue";
</script>

<template>
  <TabsTrigger as-child>
    <div class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
      <slot />
    </div>
  </TabsTrigger>
</template>
