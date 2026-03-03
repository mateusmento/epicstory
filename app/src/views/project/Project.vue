<script lang="ts" setup>
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
  Button,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system";
import { useMagicKeys, whenever } from "@vueuse/core";
import { ArrowLeft, ArrowRight } from "lucide-vue-next";
import { ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import SearchBar from "./SearchBar.vue";

const open = ref(false);
const { meta_j } = useMagicKeys();
whenever(meta_j, () => {
  open.value = true;
});

defineProps<{ workspaceId: string; projectId: string; issueId: string }>();

const route = useRoute();

function routeId(route: string) {
  return route.split("/").pop();
}
</script>

<template>
  <div class="w-full h-full flex:col">
    <div class="flex:row flex:center-y px-4 py-1.5 h-10">
      <div class="flex:row flex:center-y flex-1">
        <div class="flex:row-md flex:center-y">
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
              <RouterLink :to="`/${workspaceId}/project/${projectId}`"> Project </RouterLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <RouterLink :to="`/${workspaceId}/project/${projectId}/board`"> Board </RouterLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <RouterLink :to="`/${workspaceId}/project/${projectId}/issue/${issueId}`"> Issue </RouterLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <SearchBar />

      <div class="flex-1"></div>
    </div>

    <Separator />

    <div class="flex:row-md flex:center-y px-4 py-1.5 h-10">
      <ToggleGroup as="nav" type="single" :value="routeId(route.path)" class="flex:row-lg bg-transparent">
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
      </ToggleGroup>
    </div>

    <Separator />
    <section class="flex-1 min-h-0 overflow-auto">
      <RouterView />
    </section>
  </div>
</template>
