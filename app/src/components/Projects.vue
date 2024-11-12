<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDependency } from '@/core/dependency-injection';
import { WorkspaceService } from '@/domain/workspace/workspace.service';
import { toTypedSchema } from '@vee-validate/zod';
import { Form, useForm } from 'vee-validate';
import * as z from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { onMounted, ref } from 'vue';
import type { Project } from '@/domain/workspace/workspace.types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const props = defineProps<{
  workspaceId: number;
}>();

const workspaceService = useDependency(WorkspaceService);

const projects = ref<Project[]>([]);

onMounted(async () => {
  projects.value = await workspaceService.findProjects(props.workspaceId);
});

const projectSchema = toTypedSchema(
  z.object({
    workspaceId: z.string().transform((v) => +v),
    name: z.string().min(2).max(50),
  }),
);

const projectForm = useForm({
  validationSchema: projectSchema,
});

const createProject = async (values: any) => {
  await workspaceService.createProject(props.workspaceId, values);
};
</script>

<template>
  <div class="space-y-6">
    <Collapsible>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]">
              <div class="flex justify-between items-center">
                Name
                <CollapsibleTrigger>
                  <Button>Create Project</Button>
                </CollapsibleTrigger>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <CollapsibleContent :as="TableRow">
            <TableCell>
              <Form class="space-y-6" @submit="createProject" :validation-schema="projectForm">
                <FormField v-slot="{ componentField }" name="name">
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="project name" v-bind="componentField" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <Button type="submit">Create</Button>
              </Form>
            </TableCell>
          </CollapsibleContent>

          <TableRow v-for="workspace in projects" :key="workspace.id">
            <TableCell class="font-medium">{{ workspace.name }} </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Collapsible>
  </div>
</template>
