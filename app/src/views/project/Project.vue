<script lang="ts" setup>
import { Button, Separator, Tabs } from "@/design-system";
import TabsList from "@/design-system/ui/tabs/TabsList.vue";
import TabsTrigger from "@/design-system/ui/tabs/TabsTrigger.vue";
import ToggleGroup from "@/design-system/ui/toggle-group/ToggleGroup.vue";
import ToggleGroupItem from "@/design-system/ui/toggle-group/ToggleGroupItem.vue";
import { RouterLink, useRoute } from "vue-router";

defineProps<{ projectId: string }>();

const currentRoute = useRoute();

function isActive(route: string) {
  return currentRoute.path.endsWith("/" + route);
}
</script>

<template>
  <div class="w-full h-full flex:col">
    <ToggleGroup type="single" :value="currentRoute" class="flex:row-lg bg-transparent p-2" as-child>
      <nav>
        <ToggleGroupItem variant="outline" size="sm" :value="`/project/${projectId}/backlog`" as-child>
          <RouterLink :to="`/project/${projectId}/backlog`">
            <!-- <Button :variant="isActive('backlog') ? 'outline' : 'ghost'" size="xs"></Button> -->
            Backlog
          </RouterLink>
        </ToggleGroupItem>
        <ToggleGroupItem variant="outline" size="sm" :value="`/project/${projectId}/board`" as-child>
          <RouterLink :to="`/project/${projectId}/board`">
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
