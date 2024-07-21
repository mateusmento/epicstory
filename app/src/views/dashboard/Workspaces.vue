<script setup lang="ts">
import { useDependency } from "@/core/dependency-injection";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/design-system";
import { WorkspaceService } from "@/domain/workspace/workspace.service";
import { onMounted, reactive, ref } from "vue";

const currentWorkspace = defineModel<{
  id?: number;
  name: string;
}>("currentWorkspace");

const workspaceService = useDependency(WorkspaceService);
const workspaces = ref<any[]>([]);
const workspaceData = reactive({
  name: "",
});

onMounted(async () => {
  const { content } = await workspaceService.findWorkspaces();
  workspaces.value = content;
});

async function addWorkspace() {
  const workspace = await workspaceService.createWorkspace(workspaceData.name);
  workspaces.value.push(workspace);
  workspaceData.name = "";
}

async function selectWorkspace(workspace: any) {
  currentWorkspace.value = workspace;
}
</script>

<template>
  <div class="flex:rows-3xl">
    <Collapsible as-child>
      <div class="flex:rows-sm">
        <div class="text-xs text-zinc-500">Workspace</div>
        <div class="flex:cols-xl">
          <div class="text-lg text-neutral-800">{{ currentWorkspace?.name }}</div>
          <CollapsibleTrigger as-child>
            <Button variant="outline" size="xs" class="text-xs text-zinc-500">Switch</Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <Collapsible>
          <div class="flex:rows-md p-1 rounded-md bg-zinc-100 text-zinc-500 text-sm">
            <div class="flex:cols-auto flex:center-y px-2 py-1 font-semibold select-none">
              Workspaces
              <CollapsibleTrigger class="px-1.5 py-0.5 rounded-sm hover:bg-zinc-200 cursor-pointer"
                >+</CollapsibleTrigger
              >
            </div>
            <CollapsibleContent>
              <div class="p-0.5 flex:cols-md">
                <Input v-model="workspaceData.name" class="p-1 h-fit text-xs bg-white" />
                <Button size="xs" @click="addWorkspace" class="px-2 py-0 h-auto text-xs">Add</Button>
              </div>
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
      </CollapsibleContent>
    </Collapsible>

    <div class="flex:rows-lg">
      <Tabs default-value="members">
        <TabsList class="w-full">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  </div>
</template>
