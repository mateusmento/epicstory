<script lang="ts" setup>
import { Button, Separator } from "@/design-system";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/design-system/ui/breadcrumb";
import ToggleGroup from "@/design-system/ui/toggle-group/ToggleGroup.vue";
import ToggleGroupItem from "@/design-system/ui/toggle-group/ToggleGroupItem.vue";
import { ArrowLeft, ArrowRight } from "lucide-vue-next";
import { RouterLink, useRoute } from "vue-router";

defineProps<{ workspaceId: string; projectId: string; issueId: string }>();

const route = useRoute();

function routeId(route: string) {
  return route.split("/").pop();
}
</script>

<template>
  <div class="w-full h-full flex:col">

    <div class="flex:row-md flex:center-y">

      <div class="flex:row-xl flex:center-y px-4">
        <Button variant="outline" size="icon">
          <ArrowLeft class="w-4 h-4 text-secondary-foreground" />
        </Button>
        <Button variant="outline" size="icon">
          <ArrowRight class="w-4 h-4 text-secondary-foreground" />
        </Button>
      </div>

      <Breadcrumb class="px-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <RouterLink :to="`/${workspaceId}`">
              Workspace
            </RouterLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <RouterLink :to="`/${workspaceId}/project/${projectId}`">
              Project
            </RouterLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <RouterLink :to="`/${workspaceId}/project/${projectId}/backlog`">
              Backlog
            </RouterLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <RouterLink :to="`/${workspaceId}/project/${projectId}/board`">
              Board
            </RouterLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <RouterLink :to="`/${workspaceId}/project/${projectId}/issue/${issueId}`">
              Issue
            </RouterLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator orientation="vertical" />

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

    </div>

    <Separator />
    <section class="flex-1 min-h-0 overflow-auto">
      <RouterView />
    </section>
  </div>
</template>
