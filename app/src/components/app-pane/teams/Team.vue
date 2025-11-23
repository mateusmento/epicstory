<script lang="ts" setup>
import { UserSelect } from "@/components/user";
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system";
import { Icon, IconSearch } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { useTeam } from "@/domain/team";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-vue-next";
import { onMounted, ref } from "vue";

const props = defineProps<{
  teamId: number;
}>();

const { team, members, fetchTeam, addMember, removeMember } = useTeam();
onMounted(() => fetchTeam(props.teamId));

const selectedUser = ref<User>();
</script>

<template>
  <div class="flex:col w-96">
    <div class="flex:col-xl p-4">
      <Collapsible as-child>
        <div class="flex:row-auto flex:center-y">
          <h1 class="flex:row-md flex:center-y text-lg">
            <Icon name="bi-person-workspace" />
            <div>{{ team?.name }}</div>
          </h1>

          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="ml-auto">Add Member</Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div class="flex:col-lg">
            <UserSelect v-model="selectedUser" />
            <Button size="xs" @click="selectedUser && addMember(selectedUser.id)">Add</Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div
        class="flex:row-md flex:center-y flex:center-x p-2 rounded-lg bg-secondary text-secondary-foreground text-sm"
      >
        <IconSearch /> Search
      </div>
    </div>

    <div class="flex:col">
      <div
        v-for="member in members"
        :key="member.id"
        view="app-pane"
        content="team"
        class="flex:row-2xl flex:center-y p-4 border-t hover:bg-secondary cursor-pointer"
      >
        <img :src="member.user.picture" class="w-12 h-12 rounded-full" />
        <div class="flex:col-md">
          <div class="text-base text-foreground font-dmSans font-medium">{{ member.user.name }}</div>
          <div class="text-xs text-secondary-foreground">
            Member since {{ format(member.joinedAt, "MMM do, yyyy") }}
          </div>
        </div>
        <Trash2Icon
          @click="removeMember(member.id)"
          class="h-4 w-4 mr-2 ml-auto cursor-pointer text-foreground"
        />
      </div>
    </div>
  </div>
</template>
