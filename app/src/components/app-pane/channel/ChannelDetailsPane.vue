<script lang="ts" setup>
import { useChannel } from "@/domain/channels";
import { useUsers } from "@/domain/user";
import { ref, watch } from "vue";
import ChannelDetailsPaneTemplate from "./ChannelDetailsPaneTemplate.vue";

const { members, addMember } = useChannel();

const { users, fetchUsers } = useUsers();
const query = ref("");
watch(query, () => fetchUsers(query.value));
</script>

<template>
  <aside class="flex:col-4xl h-full w-96 p-4 border-l border-zinc-300/60">
    <ChannelDetailsPaneTemplate v-model:query="query" :users :members @add-member="addMember" />
  </aside>
</template>
