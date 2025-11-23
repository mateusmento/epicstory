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
} from "@/design-system";
import { Icon, IconSearch } from "@/design-system/icons";
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
    <div class="flex:col-3xl p-4">
      <Collapsible as-child>
        <div class="flex:row-auto flex:center-y">
          <h1 class="flex:row-md flex:center-y text-lg whitespace-nowrap">
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
            <UserSelect v-model="selectedUser" />
            <Field :modelValue="selectedUser?.email" name="email" placeholder="Email..." />
            <Button type="submit" size="xs">Add</Button>
          </Form>
        </CollapsibleContent>
      </Collapsible>

      <div
        class="flex:row-md flex:center-y flex:center-x p-2 rounded-lg bg-secondary text-secondary-foreground text-sm"
      >
        <IconSearch /> Search
      </div>
    </div>

    <div class="flex:col text-sm">
      <div
        v-for="member in members"
        :key="member.id"
        class="group flex:row-lg p-3 border-t cursor-pointer hover:bg-secondary/40"
      >
        <img :src="member.user.picture" class="w-10 h-10 rounded-full" />
        <div class="flex:col-md"></div>
        <div class="flex:col-md">
          <div class="text-base font-medium font-dmSans whitespace-nowrap group-hover:underline">
            {{ member.user.name }}
          </div>
          <div class="text-xs text-secondary-foreground whitespace-nowrap">
            Member since {{ format(member.joinedAt, "MMM do, yyyy") }}
          </div>
        </div>
        <div class="flex:col-auto ml-auto">
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
