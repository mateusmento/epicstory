<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useWorkspace } from "@/domain/workspace";
import { onMounted, watch } from "vue";

const { workspace, members, fetchWorkspaceMembers, addWorkspaceMember } = useWorkspace();

onMounted(() => fetchWorkspaceMembers());

watch(workspace, () => fetchWorkspaceMembers());
</script>

<template>
  <div>
    <div v-for="member in members" :key="member.id">{{ member.user.name }}</div>
    <Form @submit="addWorkspaceMember($event.userId)">
      <Field name="userId" />
      <Button type="submit">Add</Button>
    </Form>
  </div>
</template>
