<script lang="ts" setup>
import { UserAvatar, UserSelect } from "@/components/user";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  NavTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { useTeam } from "@/domain/team";
import { format } from "date-fns";
import { Trash2Icon, UserPlus } from "lucide-vue-next";
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
      <div class="flex:row-auto flex:center-y px-4 py-2 h-10">
        <h1 class="flex:row-md flex:center-y">
          <Icon name="bi-person-workspace" />
          <div class="font-medium text-sm">{{ team?.name }}</div>
        </h1>

        <Tooltip>
          <TooltipTrigger as-child>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="icon">
                <UserPlus class="w-4 h-4" />
              </Button>
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent> Add a new member </TooltipContent>
        </Tooltip>
      </div>

      <CollapsibleContent>
        <div class="flex:col-lg m-2 p-2 border rounded-lg">
          <UserSelect v-model="selectedUser" />
          <Button size="xs" @click="selectedUser && addMember(selectedUser.id)">Add</Button>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    <NavTrigger
      view="app-pane"
      content="teams"
      :as="Button"
      variant="ghost"
      size="badge"
      class="flex:row-sm w-fit m-2"
    >
      <Icon name="hi-solid-arrow-sm-left" />
      Back to teams
    </NavTrigger>

    <div class="flex:col-md p-2">
      <div
        v-for="member in members"
        :key="member.id"
        view="app-pane"
        content="team"
        class="flex:row-2xl flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
      >
        <UserAvatar :name="member.user.name" :picture="member.user.picture" size="lg" class="flex-shrink-0" />

        <div class="flex:col flex:center-y">
          <div class="text-sm text-foreground">{{ member.user.name }}</div>
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
