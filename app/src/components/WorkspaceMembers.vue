<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useDependency } from '@/core/dependency-injection';
import { WorkspaceService } from '@/domain/workspace/workspace.service';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { onMounted, ref } from 'vue';
import type { WorkspaceMember } from '@/domain/workspace/workspace.types';
import { Combobox } from './ui/combobox';
import { Trash } from 'lucide-vue-next';

const props = defineProps<{
  workspaceId: number;
}>();

const workspaceService = useDependency(WorkspaceService);

const members = ref<WorkspaceMember[]>([]);

onMounted(async () => {
  members.value = await workspaceService.findMembers(props.workspaceId);
});

const workspaceMemberSchema = toTypedSchema(
  z.object({
    user: z.object({
      id: z.number(),
    }),
  }),
);

const projectForm = useForm({
  validationSchema: workspaceMemberSchema,
});

const createProject = projectForm.handleSubmit(async (values) => {
  await workspaceService.addMember(props.workspaceId, { userId: values.user.id });
});

async function removeMember(member: WorkspaceMember) {
  await workspaceService.removeMember(props.workspaceId, member.id);
}
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
                  <Button>Add Member</Button>
                </CollapsibleTrigger>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <CollapsibleContent :as="TableRow">
            <TableCell>
              <form class="space-y-6" @submit="createProject">
                <FormField v-slot="{ componentField }" name="user">
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <FormControl>
                      <Combobox
                        :model-value="componentField.modelValue"
                        @update:model-value="componentField['onUpdate:modelValue']"
                        :options="[
                          { id: 1, name: 'Mateus Sarmento' },
                          { id: 2, name: 'Bernado' },
                        ]"
                        :search="
                          (value, term) =>
                            value
                              .filter((v) => v.name.toLowerCase().includes(term.toLowerCase()))
                              .map((v) => ({ ...v }))
                        "
                        track-by="id"
                        label-by="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <Button type="submit">Create</Button>
              </form>
            </TableCell>
          </CollapsibleContent>
          <TableRow v-for="member in members" :key="member.id">
            <TableCell class="flex justify-between items-center font-medium">
              {{ member.user?.name }}
              <Trash @click="removeMember(member)" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Collapsible>
  </div>
</template>
