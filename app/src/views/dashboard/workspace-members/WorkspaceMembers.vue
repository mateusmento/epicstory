<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useWorkspace } from "@/domain/workspace";
import { onMounted, watch } from "vue";

const { workspace, members, fetchWorkspaceMembers, addWorkspaceMember } = useWorkspace();

onMounted(() => fetchWorkspaceMembers());

watch(workspace, () => fetchWorkspaceMembers());
</script>

<template>
  <div class="flex:rows-xl">
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

    <Form @submit="addWorkspaceMember($event.userId)" class="flex:rows-lg">
      <Field label="User id" name="userId" placeholder="Add workspace member..." />
      <Button type="submit" size="xs">Add</Button>
    </Form>
  </div>
</template>
