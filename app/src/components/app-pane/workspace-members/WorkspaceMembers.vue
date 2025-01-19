<script lang="ts" setup>
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  Field,
  Form,
} from "@/design-system";
import { Icon, IconSearch } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { useUsers } from "@/domain/user";
import { useWorkspace } from "@/domain/workspace";
import { onMounted, ref, watch } from "vue";

const { workspace, members, fetchWorkspaceMembers, sendWorkspaceMemberInvite } = useWorkspace();
onMounted(() => fetchWorkspaceMembers());
watch(workspace, () => fetchWorkspaceMembers());

const { users, fetchUsers } = useUsers();
const query = ref("");
const selectedUser = ref<User>();
watch(query, () => fetchUsers(query.value));
</script>

<template>
  <div class="flex:col w-96">
    <div class="flex:col-3xl p-4">
      <Collapsible as-child>
        <div class="flex:row-auto flex:center-y">
          <h1 class="flex:row-md flex:center-y text-lg font-medium whitespace-nowrap">
            <Icon name="bi-people-fill" />
            Workspace Members
          </h1>
          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="block ml-auto">Invite people</Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <Form
            @submit="selectedUser && sendWorkspaceMemberInvite($event.email, selectedUser.id)"
            class="flex:col-lg"
          >
            <Combobox
              v-model="selectedUser"
              v-model:searchTerm="query"
              :options="users"
              track-by="id"
              label-by="name"
            />
            <Field :modelValue="selectedUser?.email" name="email" placeholder="Email..." />
            <Button type="submit" size="xs">Add</Button>
          </Form>
        </CollapsibleContent>
      </Collapsible>

      <div
        class="flex:row-md flex:center-y flex:center-x p-2 rounded-lg bg-neutral-200/60 text-zinc-500 text-sm"
      >
        <IconSearch /> Search
      </div>
    </div>

    <div class="flex:col text-sm">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex:row-lg p-3 border-t hover:bg-zinc-200/60 cursor-pointer"
      >
        <img :src="member.user.picture" class="w-10 h-10 rounded-full" />
        <div class="flex:col-md">
          <div class="text-base font-medium font-dmSans whitespace-nowrap">{{ member.user.name }}</div>
          <div class="text-xs text-zinc-500 whitespace-nowrap">{{ member.user.email }}</div>
        </div>
        <div class="flex:col-auto ml-auto">
          <Badge variant="outline" class="self-end">{{ member.role === 1 ? "Admin" : "Member" }}</Badge>
          <div class="text-xs text-zinc-500 whitespace-nowrap">Member since april 2019</div>
        </div>
      </div>
    </div>
  </div>
</template>
