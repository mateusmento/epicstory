<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDependency } from '@/core/dependency-injection';
import { WorkspaceService } from '@/domain/workspace/workspace.service';
import { reactive } from 'vue';

const workspaceService = useDependency(WorkspaceService);

const workspaceSchema = toTypedSchema(
  z.object({
    name: z.string().min(2).max(50),
  }),
);

const workspace = reactive({
  name: '',
});

const createWorkspace = async (values: any) => {
  await workspaceService.create(workspace);
};
</script>

<template>
  <form class="space-y-6" @submit.prevent="createWorkspace">
    <FormField v-slot="{ componentField }" name="workspace.name">
      <FormItem>
        <FormLabel>Name</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="workspace name"
            v-bind="componentField"
            v-model="workspace.name"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <Button type="submit">Create</Button>
  </form>
</template>
