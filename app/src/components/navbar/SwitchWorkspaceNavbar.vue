<script setup lang="ts">
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Field,
  Form,
  NavTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { cn } from "@/design-system/utils";
import { useWorkspace, useWorkspaces, type Workspace } from "@/domain/workspace";
import { onMounted } from "vue";

const { workspaces, createWorkspace, fetchWorkspaces } = useWorkspaces();
const { workspace: currentWorkspace, selectWorkspace } = useWorkspace();
const { viewContent } = useNavTrigger("navbar");

onMounted(async () => {
  fetchWorkspaces();
});

function onSelectWorkspace(workspace: Workspace) {
  selectWorkspace(workspace);
  viewContent("workspace");
}
</script>

<template>
  <div class="flex:col-2xl">
    <div class="p-2 pb-0">
      <NavTrigger
        view="navbar"
        content="workspace"
        :as="Button"
        variant="ghost"
        size="sm"
        class="flex:row-sm ml-auto"
      >
        <Icon name="hi-solid-arrow-sm-left" />
        Back to workspace
      </NavTrigger>
    </div>
    <Collapsible class="flex:col-md">
      <div
        class="flex:row-auto flex:center-y px-2 py-1 text-secondary-foreground text-sm font-semibold select-none"
      >
        Workspaces
        <CollapsibleTrigger class="px-1.5 py-0.5 rounded-sm hover:bg-secondary cursor-pointer">
          +
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <Form @submit="createWorkspace as any" class="p-0.5 flex:row-md">
          <Field
            name="name"
            placeholder="Create workspace..."
            class="flex-1"
            :classes="{ input: 'p-1 h-fit text-xs bg-white' }"
          />
          <Button size="xs" class="px-2 py-0 h-auto text-xs">Add</Button>
        </Form>
      </CollapsibleContent>

      <Button
        v-for="workspace of workspaces"
        :key="workspace.id"
        variant="ghost"
        size="sm"
        :class="cn('justify-start', { 'bg-secondary': currentWorkspace.id === workspace.id })"
        @click="onSelectWorkspace(workspace)"
      >
        {{ workspace.name }}
      </Button>
    </Collapsible>
  </div>
</template>
