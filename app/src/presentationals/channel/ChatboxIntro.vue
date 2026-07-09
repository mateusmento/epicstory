<script lang="ts" setup>
import { UserAvatarStack } from "@/presentationals/user";
import type { IUser } from "@epicstory/contracts";

defineProps<{
  peers: IUser[];
  meId: number;
}>();
</script>

<template>
  <div class="flex:col-3xl p-xl mb-2xl">
    <div class="flex:row-xl flex:center-y gap-2 min-w-0">
      <UserAvatarStack :users="peers" size="tileXl" :min="1" :overlap-px="24" class="min-w-0 w-full" />
    </div>
    <div class="text-xl text-accent-foreground font-lato">
      This is the begining of a conversation between
      <template v-for="(member, i) of peers" :key="member.id">
        <template v-if="i > 0 && i < peers.length - 1">, </template>
        <template v-else-if="i > 0"> and </template>
        <span
          class="inline-flex items-center"
          :class="
            member.id === meId
              ? 'px-0.5 rounded-sm bg-mentionHighlight text-mentionHighlight-foreground font-medium'
              : 'px-0.5 rounded-sm bg-mention-chip text-mention font-medium'
          "
        >
          @{{ member.name }}
        </span>
      </template>
      .
    </div>
  </div>
</template>
