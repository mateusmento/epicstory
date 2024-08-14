<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import Combobox from "@/design-system/ui/combobox/Combobox.vue";
import type { User } from "@/domain/auth";
import { useUsers } from "@/domain/user";
import { useWorkspace } from "@/domain/workspace";
import { onMounted, ref, watch } from "vue";

const { workspace, members, fetchWorkspaceMembers, addWorkspaceMember } = useWorkspace();
onMounted(() => fetchWorkspaceMembers());
watch(workspace, () => fetchWorkspaceMembers());

const { users, fetchUsers } = useUsers();
const query = ref("");
const selectedUser = ref<User>();
watch(query, () => fetchUsers(query.value));
</script>

<template>
  <div class="flex:rows-xl p-4">
    <h1 class="text-lg">Workspace Members</h1>

    <div class="flex:rows-lg p-1 rounded-md bg-zinc-100 text-zinc-500 text-sm">
      <div
        v-for="member in members"
        :key="member.id"
        class="px-2 py-1 rounded-sm hover:bg-zinc-200/60 cursor-pointer"
      >
        {{ member.user.name }}
      </div>
    </div>
    {{ selectedUser }}
    <Form @submit="addWorkspaceMember($event.userId)" class="flex:rows-lg">
      <Combobox
        v-model="selectedUser"
        v-model:searchTerm="query"
        :options="users"
        track-by="id"
        label-by="name"
      />
      <Field
        :modelValue="selectedUser?.id"
        type="hidden"
        name="userId"
        placeholder="Add workspace member..."
      />
      <Button type="submit" size="xs">Add</Button>
    </Form>
  </div>
</template>
