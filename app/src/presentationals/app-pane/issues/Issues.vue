<script setup lang="ts">
import { Separator } from "@/design-system";
import { Icon } from "@/design-system/icons";
</script>

<template>
  <div class="w-96">
    <div class="flex:row-md flex:center-y p-4 h-10">
      <Icon name="oi-apps" />
      <div class="font-medium text-sm">Issues</div>
    </div>

    <Separator />

    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="flex:col-md flex:center mt-8">
        <Icon name="oi-apps" class="text-secondary-foreground/50" />
        <div class="text-sm text-secondary-foreground">No issues yet</div>
      </div>
    </div>
  </div>
</template>
