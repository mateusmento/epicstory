<script lang="ts" setup>
import { Button, Separator } from "@/design-system";
import { RouterLink, useRoute } from "vue-router";

defineProps<{ projectId: string }>();

const currentRoute = useRoute();

function isActive(route: string) {
  return currentRoute.path.endsWith("/" + route);
}
</script>

<template>
  <div class="h-full flex:rows">
    <nav class="flex:cols-lg flex:center-y p-2">
      <RouterLink :to="`/project/${projectId}/backlog`">
        <Button variant="ghost" size="xs" :class="{ 'bg-zinc-200/50 text-zinc-500': isActive('backlog') }"
          >Backlog</Button
        >
      </RouterLink>
      <RouterLink :to="`/project/${projectId}/board`">
        <Button variant="ghost" size="xs" :class="{ 'bg-zinc-200/50 text-zinc-500': isActive('board') }"
          >Board</Button
        >
      </RouterLink>
    </nav>
    <Separator />
    <section class="flex-1 min-h-0">
      <RouterView />
    </section>
  </div>
</template>
