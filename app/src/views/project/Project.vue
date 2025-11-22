<script lang="ts" setup>
import { Separator } from "@/design-system";
import ToggleGroup from "@/design-system/ui/toggle-group/ToggleGroup.vue";
import ToggleGroupItem from "@/design-system/ui/toggle-group/ToggleGroupItem.vue";
import { RouterLink, useRoute } from "vue-router";

defineProps<{ workspaceId: string; projectId: string }>();

const route = useRoute();

function routeId(route: string) {
  return route.split("/").pop();
}
</script>

<template>
  <div class="w-full h-full flex:col">
    <ToggleGroup type="single" :value="routeId(route.path)" class="flex:row-lg bg-transparent p-2" as-child>
      <nav>
        <ToggleGroupItem value="backlog" variant="outline" size="sm" as-child>
          <RouterLink :to="`/${workspaceId}/project/${projectId}/backlog`">
            <!-- <Button :variant="isActive('backlog') ? 'outline' : 'ghost'" size="xs"></Button> -->
            Backlog
          </RouterLink>
        </ToggleGroupItem>
        <ToggleGroupItem value="board" variant="outline" size="sm" as-child>
          <RouterLink :to="`/${workspaceId}/project/${projectId}/board`">
            <!-- <Button :variant="isActive('board') ? 'outline' : 'ghost'" size="xs"></Button> -->
            Board
          </RouterLink>
        </ToggleGroupItem>
      </nav>
    </ToggleGroup>
    <Separator />
    <section class="flex-1 min-h-0 overflow-auto">
      <RouterView />
    </section>
  </div>
</template>
