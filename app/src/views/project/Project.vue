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
  <div class="w-full h-full flex:rows">
    <nav class="flex:cols-lg flex:center-y p-2">
      <RouterLink :to="`/project/${projectId}/backlog`">
        <Button :variant="isActive('backlog') ? 'secondary' : 'ghost'" size="xs">Backlog</Button>
      </RouterLink>
      <RouterLink :to="`/project/${projectId}/board`">
        <Button :variant="isActive('board') ? 'secondary' : 'ghost'" size="xs">Board</Button>
      </RouterLink>
    </nav>
    <Separator />
    <section class="flex-1 min-h-0 overflow-auto">
      <RouterView />
    </section>
  </div>
</template>
