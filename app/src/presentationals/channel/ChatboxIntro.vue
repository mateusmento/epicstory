<script lang="ts" setup>
import { UserAvatar } from "@/presentationals/user";
import type { IUser } from "@epicstory/contracts";

defineProps<{
  peers: IUser[];
  meId: number;
}>();
</script>

<template>
  <div class="flex:col-3xl p-xl mb-2xl">
    <div class="flex:row-xl flex:center-y gap-2">
      <UserAvatar
        v-for="member of peers"
        :key="member.id"
        :name="member.name"
        :picture="member.picture"
        size="tileXl"
        class="-ml-10 first:ml-0"
      />
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
