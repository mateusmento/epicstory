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
import { useWorkspace, useWorkspaces, type Workspace } from "@/domain/workspace";
import { onMounted } from "vue";

const currentWorkspace = defineModel<{
  id?: number;
  name: string;
} | null>("currentWorkspace");

const { workspaces, createWorkspace, fetchWorkspaces } = useWorkspaces();
const { selectWorkspace } = useWorkspace();
const { currentContent } = useNavTrigger("navbar");

onMounted(async () => {
  fetchWorkspaces();
});

function onSelectWorkspace(workspace: Workspace) {
  selectWorkspace(workspace);
  currentContent.value = "workspace";
}
</script>

<template>
  <div class="flex:rows-2xl">
    <div class="p-2 pb-0">
      <NavTrigger
        view="navbar"
        content="workspace"
        :as="Button"
        variant="text"
        size="xs"
        class="flex:cols-sm ml-auto text-xs text-zinc-500"
      >
        <Icon name="hi-solid-arrow-sm-left" />
        Back to workspace
      </NavTrigger>
    </div>
    <Collapsible class="flex:rows-md rounded-md bg-zinc-100 text-zinc-500 text-sm">
      <div class="flex:cols-auto flex:center-y px-2 py-1 font-semibold select-none">
        Workspaces
        <CollapsibleTrigger class="px-1.5 py-0.5 rounded-sm hover:bg-zinc-200 cursor-pointer">
          +
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <Form @submit="createWorkspace as any" class="p-0.5 flex:cols-md">
          <Field
            name="name"
            placeholder="Create workspace..."
            class="self:fill"
            :classes="{ input: 'p-1 h-fit text-xs bg-white' }"
          />
          <Button size="xs" class="px-2 py-0 h-auto text-xs">Add</Button>
        </Form>
      </CollapsibleContent>

      <div
        v-for="workspace of workspaces"
        :key="workspace.id"
        class="px-2 py-1 rounded-sm hover:bg-zinc-200/60 cursor-pointer"
        :class="{ 'bg-zinc-200/60': currentWorkspace?.id === workspace.id }"
        @click="onSelectWorkspace(workspace)"
      >
        {{ workspace.name }}
      </div>
    </Collapsible>
  </div>
</template>
