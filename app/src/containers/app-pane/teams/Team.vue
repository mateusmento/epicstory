<script lang="ts" setup>
import { UserSelect } from "@/containers/user";
import { UserAvatar } from "@/presentationals/user";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  NavTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { IUser as IUser } from "@epicstory/contracts";
import { useTeam } from "@/domain/team";
import { format } from "date-fns";
import { Trash2Icon, UserPlus } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { DotsHorizontalIcon } from "@radix-icons/vue";

const props = defineProps<{
  teamId: number;
}>();

const { team, members, fetchTeam, addMember, removeMember } = useTeam();
onMounted(() => fetchTeam(props.teamId));

const selectedUser = ref<IUser>();
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
      size="icon"
      class="flex:row-sm w-fit m-2"
    >
      <Icon name="hi-solid-arrow-sm-left" />
      Back to teams
    </NavTrigger>

    <div class="flex:col-md p-2">
      <div v-for="member in members" :key="member.id" class="flex:row-2xl flex:center-y p-2">
        <UserAvatar :name="member.user.name" :picture="member.user.picture" size="lg" class="flex-shrink-0" />

        <div class="flex:col flex:center-y">
          <div class="text-sm text-foreground">{{ member.user.name }}</div>
          <div class="text-xs text-secondary-foreground">
            Member since {{ format(member.joinedAt, "MMM do, yyyy") }}
          </div>
        </div>

        <Menu>
          <MenuTrigger as-child>
            <Button variant="ghost" size="icon" class="ml-auto">
              <DotsHorizontalIcon class="h-4 w-4" />
            </Button>
          </MenuTrigger>
          <MenuContent side="bottom" align="end">
            <MenuItem @click="removeMember(member.id)" intent="destructive">
              <Trash2Icon class="h-4 w-4" />
              Remove from team
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  </div>
</template>
