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
import { useWorkspace, useWorkspaces } from "@/domain/workspace";
import { onMounted } from "vue";

const currentWorkspace = defineModel<{
  id?: number;
  name: string;
} | null>("currentWorkspace");

const { workspaces, createWorkspace, fetchWorkspaces } = useWorkspaces();
const { selectWorkspace } = useWorkspace();

onMounted(async () => {
  fetchWorkspaces();
});
</script>

<template>
  <div class="flex:rows-3xl p-4">
    <div class="flex:cols-auto">
      <div class="flex:rows-sm">
        <div class="text-xs text-zinc-500">Workspace</div>
        <div class="flex:cols-xl">
          <div class="text-lg text-neutral-800">{{ currentWorkspace?.name }}</div>
        </div>
      </div>
      <div>
        <NavTrigger
          view="navbar"
          content="workspace"
          :as="Button"
          variant="outline"
          size="xs"
          class="text-xs text-zinc-500"
        >
          Back
        </NavTrigger>
      </div>
    </div>
    <Collapsible>
      <div class="flex:rows-md p-1 rounded-md bg-zinc-100 text-zinc-500 text-sm">
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
          @click="selectWorkspace(workspace)"
        >
          {{ workspace.name }}
        </div>
      </div>
    </Collapsible>
  </div>
</template>
