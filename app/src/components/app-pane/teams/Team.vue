<script lang="ts" setup>
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Combobox } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { useTeam } from "@/domain/team";
import { useUsers } from "@/domain/user";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  teamId: number;
}>();

const { team, members, fetchTeam, addMember, removeMember } = useTeam();

onMounted(() => fetchTeam(props.teamId));

const { users, fetchUsers } = useUsers();
const query = ref("");
const selectedUser = ref<User>();
watch(query, () => fetchUsers(query.value));
</script>

<template>
  <div class="flex:rows">
    <div class="flex:rows-xl p-4">
      <Collapsible as-child>
        <div class="flex:cols-auto flex:center-y">
          <h1 class="flex:cols-md flex:center-y text-lg">
            <Icon name="bi-person-workspace" />
            <div>{{ team?.name }}</div>
          </h1>

          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="ml-auto">Add Member</Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div class="flex:rows-lg">
            <Combobox
              v-model="selectedUser"
              v-model:searchTerm="query"
              :options="users"
              track-by="id"
              label-by="name"
              name="user"
            />
            <Button size="xs" @click="selectedUser && addMember(selectedUser.id)">Add</Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div class="flex:rows">
      <div
        v-for="member in members"
        :key="member.id"
        view="app-pane"
        content="team"
        class="flex:cols-2xl flex:center-y p-4 border-t hover:bg-zinc-200/60 cursor-pointer"
      >
        <img :src="member.user.picture" class="w-12 h-12 rounded-full" />
        <div class="flex:rows-md">
          <div class="text-base text-zinc-800 font-dmSans font-medium">{{ member.user.name }}</div>
          <div class="text-xs text-zinc-500">4 members</div>
        </div>
        <Icon
          name="io-trash-bin"
          @click="removeMember(member.id)"
          class="ml-auto cursor-pointer text-zinc-800"
        />
      </div>
    </div>
  </div>
</template>
