<script lang="ts" setup>
import { UserSelect } from "@/components/user";
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Separator } from "@/design-system";
import { Icon } from "@/design-system/icons";
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
    <Collapsible as-child>
      <div class="flex:row-auto flex:center-y px-4 py-2 h-14">
        <h1 class="flex:row-md flex:center-y font-semibold">
          <Icon name="bi-person-workspace" />
          <div>{{ team?.name }}</div>
        </h1>

        <CollapsibleTrigger as-child>
          <Button variant="outline" size="badge" class="ml-auto">Add Member</Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div class="flex:col-lg m-2 p-2 border rounded-lg">
          <UserSelect v-model="selectedUser" />
          <Button size="xs" @click="selectedUser && addMember(selectedUser.id)">Add</Button>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    <div class="flex:col-md p-2">
      <div
        v-for="member in members"
        :key="member.id"
        view="app-pane"
        content="team"
        class="flex:row-2xl flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
      >
        <img :src="member.user.picture" class="w-10 h-10 rounded-full" />

        <div class="flex:col flex:center-y">
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
