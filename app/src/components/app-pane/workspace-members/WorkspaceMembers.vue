<script lang="ts" setup>
import { UserSelect } from "@/components/user";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  Form,
  Separator,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-vue-next";
import { onMounted, ref, watch } from "vue";

const { workspace, members, fetchWorkspaceMembers, sendWorkspaceMemberInvite, removeMember } = useWorkspace();
onMounted(() => fetchWorkspaceMembers());
watch(workspace, () => fetchWorkspaceMembers());

const selectedUser = ref<User>();
</script>

<template>
  <div class="flex:col w-96">
    <Collapsible as-child>
      <div class="flex:row-auto flex:center-y px-4 py-2 h-14">
        <h1 class="flex:row-md flex:center-y whitespace-nowrap font-semibold">
          <Icon name="bi-people-fill" />
          Workspace Members
        </h1>
        <CollapsibleTrigger as-child>
          <Button variant="outline" size="badge" class="block ml-auto">Invite people</Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <Form @submit="selectedUser && sendWorkspaceMemberInvite($event.email, selectedUser.id)"
          class="flex:col-lg m-2 p-2 border rounded-lg">
          <UserSelect v-model="selectedUser" />
          <Field :modelValue="selectedUser?.email" name="email" placeholder="Email..." />
          <Button type="submit" size="xs">Add</Button>
        </Form>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    <div class="flex:col-md p-2">
      <div v-for="member in members" :key="member.id"
        class="flex:row-2xl flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer">
        <img :src="member.user.picture" class="w-10 h-10 rounded-full" />
        <div class="flex:col">
          <div class="text-base font-medium font-dmSans whitespace-nowrap">
            {{ member.user.name }}
          </div>
          <div class="text-xs text-secondary-foreground whitespace-nowrap">
            Member since {{ format(member.joinedAt, "MMM do, yyyy") }}
          </div>
        </div>
        <div class="flex:col ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="self-end">
                <DotsHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem @click="removeMember(member.id)" variant="destructive">
                  <Trash2Icon class="mr-2 h-4 w-4" />
                  <span class="whitespace-nowrap">Remove from workspace</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>
