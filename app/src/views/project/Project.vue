<script lang="ts" setup>
import { Button, Separator } from "@/design-system";
import { RouterLink } from "vue-router";

defineProps<{ projectId: string }>();
</script>

<template>
  <div class="h-full flex:rows">
    <nav class="flex:cols-lg flex:center-y p-2">
      <RouterLink :to="`/project/${projectId}/backlog`">
        <Button variant="ghost" size="xs">Backlog</Button>
      </RouterLink>
      <RouterLink :to="`/project/${projectId}/board`">
        <Button variant="ghost" size="xs">Board</Button>
      </RouterLink>
    </nav>
    <Separator />
    <section class="flex-1 min-h-0">
      <RouterView />
    </section>
  </div>
</template>
