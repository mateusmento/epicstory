<script lang="ts" setup>
import { UserAvatarStack } from "@/presentationals/user";
import type { IUser } from "@epicstory/contracts";
import { computed } from "vue";

const props = defineProps<{
  peers: IUser[];
  meId: number;
  isUserOnline: (userId: number) => boolean;
}>();

const onlineUsers = computed(() =>
  props.peers.filter((p) => p.id !== props.meId && props.isUserOnline(p.id)),
);
</script>

<template>
  <div v-if="onlineUsers.length" class="flex min-w-0 items-center gap-2">
    <UserAvatarStack
      :users="onlineUsers"
      size="md"
      variant="mentionRow"
      :min="1"
      :overlap-px="8"
      class="min-w-0 w-20 justify-end"
    />
    <div class="h-2 w-2 shrink-0 rounded-full bg-green-400" />
    <div class="shrink-0 text-xs text-muted-foreground">{{ onlineUsers.length }} online</div>
  </div>
</template>
