<script lang="ts" setup>
import { UserAvatar } from "@/presentationals/user";
import { Button, Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { IUser as IUser } from "@epicstory/contracts";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { Trash2Icon } from "lucide-vue-next";

defineProps<{
  members: (IUser & { role?: string; online?: boolean })[];
}>();

const emit = defineEmits<{
  (e: "remove", userId: number): void;
}>();

function removeMember(user: IUser) {
  emit("remove", user.id);
}
</script>

<template>
  <div class="flex:col-xl border-border overflow-auto h-full @container">
    <div class="flex:row-auto flex:center-y">
      <h1 class="flex:row flex:baseline">
        <Icon name="bi-people-fill" class="mr-md self-center" />
        <div class="text-base font-medium whitespace-nowrap">Members</div>
        <div class="text-secondary-foreground/70 text-sm ml-xl">{{ members.length }}</div>
      </h1>

      <slot name="add-member" />
    </div>

    <div class="flex:col-md">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex:row-lg flex:center-y p-1 [&>:last-child]:mr-1"
      >
        <div class="relative flex">
          <UserAvatar :name="member.name" :picture="member.picture" size="lg" />
          <div v-if="member.online" class="p-0.5 bg-card rounded-full absolute -bottom-0.5 -right-0.5">
            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>

        <div class="flex:col-md flex:baseline flex-1 min-w-0">
          <div class="flex:row-lg flex:center-y">
            <div class="text-sm whitespace-nowrap">
              {{ member.name }}
            </div>

            <div
              class="h-fit px-1 py-0.5 text-xs rounded-sm border capitalize"
              :class="
                member.role === 'admin'
                  ? 'bg-green-200 text-green-500 border border-green-500'
                  : 'bg-card border border-secondary'
              "
            >
              {{ member.role ?? "Member" }}
            </div>
          </div>
          <div class="text-xs text-secondary-foreground truncate hidden @xs:block">
            {{ member.email }}
          </div>
        </div>

        <Menu>
          <MenuTrigger as-child>
            <Button variant="ghost" size="icon">
              <DotsHorizontalIcon />
            </Button>
          </MenuTrigger>
          <MenuContent side="bottom" align="end">
            <MenuGroup>
              <MenuItem @click="removeMember(member)" intent="destructive">
                <Trash2Icon class="mr-2 h-4 w-4" />
                <div>Remove from channel</div>
              </MenuItem>
            </MenuGroup>
          </MenuContent>
        </Menu>
      </div>
    </div>
  </div>
</template>
