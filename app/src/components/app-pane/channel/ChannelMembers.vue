<script lang="ts" setup>
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { User } from "@/domain/auth";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { Trash2Icon } from "lucide-vue-next";

defineProps<{
  members: (User & { role?: string; online?: boolean })[];
}>();

const emit = defineEmits<{
  (e: "add"): void;
  (e: "remove", memberId: number): void;
}>();

function removeMember(memberId: number) {
  emit("remove", memberId);
}
</script>

<template>
  <div class="flex:col-xl border-zinc-300/60 overflow-auto h-full @container">
    <div class="flex:row-auto flex:center-y">
      <h1 class="flex:row flex:baseline">
        <Icon name="bi-people-fill" class="mr-md self-center" />
        <div class="text-base font-medium whitespace-nowrap">Members</div>
        <div class="text-secondary-foreground/70 text-sm ml-xl">{{ members.length }}</div>
      </h1>

      <Button variant="ghost" size="icon" @click="emit('add')">
        <Icon name="hi-plus" class="text-secondary-foreground w-4 h-4" />
      </Button>
    </div>

    <div class="flex:col-md">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex:row-lg flex:center-y hover:bg-secondary/40 cursor-pointer p-1 [&>:last-child]:mr-1 rounded-md"
      >
        <div class="relative">
          <img :src="member.picture" class="w-8 h-8 rounded-full" />
          <div v-if="member.online" class="p-0.5 bg-white rounded-full absolute -bottom-0.5 -right-0.5">
            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>

        <div class="flex:col flex:baseline flex-1 min-w-0">
          <div class="text-sm font-medium font-dmSans whitespace-nowrap">
            {{ member.name }}
          </div>
          <div
            class="text-xs text-secondary-foreground whitespace-nowrap text-ellipsis overflow-hidden hidden @xs:block"
          >
            {{ member.email }}
          </div>
        </div>

        <div class="ml-auto">
          <div
            v-if="member.role === 'admin'"
            class="h-fit px-1 py-0.5 rounded-sm bg-green-200 text-xs text-green-500 border border-green-500"
          >
            Admin
          </div>
          <div v-else class="h-fit px-1 py-0.5 rounded-sm bg-white text-xs border border-secondary">
            Member
          </div>
        </div>

        <div class="flex:col-auto">
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
                  <span class="whitespace-nowrap">Remove from channel</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>
