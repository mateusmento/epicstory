<script setup lang="ts">
import { useDependency } from '@/core/dependency-injection';
import { WorkspaceService } from '@/domain/workspace/workspace.service';
import { onMounted, ref } from 'vue';
import type { Workspace } from '@/domain/workspace/workspace.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import Projects from './Projects.vue';
import WorkspaceMembers from './WorkspaceMembers.vue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import CreateWorkspaceForm from './CreateWorkspaceForm.vue';
import { Button } from './ui/button';

const workspaceService = useDependency(WorkspaceService);

const workspaces = ref<Workspace[]>([]);

onMounted(async () => {
  workspaces.value = await workspaceService.findWorkspaces();
});
</script>

<template>
  <div class="space-y-6">
    <Collapsible>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]">
              <div class="flex justify-between items-center">
                <h4>Workspaces</h4>
                <CollapsibleTrigger>
                  <Button>Create Workspace</Button>
                </CollapsibleTrigger>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <CollapsibleContent :as="TableRow">
            <TableCell>
              <CreateWorkspaceForm />
            </TableCell>
          </CollapsibleContent>
          <TableRow v-for="workspace in workspaces" :key="workspace.id">
            <TableCell class="font-medium">
              <Collapsible>
                <CollapsibleTrigger>{{ workspace.name }}</CollapsibleTrigger>
                <CollapsibleContent>
                  <Tabs class="flex flex-col m-auto mt-6 space-y-6" default-value="projects">
                    <TabsList class="self-center">
                      <TabsTrigger value="projects">Projects</TabsTrigger>
                      <TabsTrigger value="members">Members</TabsTrigger>
                    </TabsList>
                    <TabsContent value="projects">
                      <Projects :workspace-id="workspace.id" />
                    </TabsContent>
                    <TabsContent value="members">
                      <WorkspaceMembers :workspace-id="workspace.id" />
                    </TabsContent>
                  </Tabs>
                </CollapsibleContent>
              </Collapsible>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Collapsible>
  </div>
</template>
