<script lang="ts" setup>
import { Button, Separator } from "@/design-system";
import { RouterLink } from "vue-router";

defineProps<{ projectId: number }>();
</script>

<template>
  <div>
    <nav class="flex:cols-lg flex:center-y p-2">
      <RouterLink to="backlog">
        <Button variant="ghost" size="xs">Backlog</Button>
      </RouterLink>
      <RouterLink to="board">
        <Button variant="ghost" size="xs">Board</Button>
      </RouterLink>
    </nav>
    <Separator />
    <section>
      <RouterView />
    </section>
  </div>
</template>
