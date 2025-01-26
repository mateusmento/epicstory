<script lang="ts" setup>
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    name: string;
    ownerName: string;
    projectsCount: number;
    topMembersCount?: number;
    topMembers: { photo: string }[];
    membersCount: number;
  }>(),
  {
    topMembersCount: 3,
  },
);

const members = computed(() => props.topMembers.slice(0, props.topMembersCount));
</script>

<template>
  <div
    class="grid grid-cols-2 gap-2 items-center w-fit p-3 rounded-md border border-zinc-200 text-foreground"
  >
    <div>{{ name }}</div>
    <div class="flex:row-md flex:center-y">
      Owner
      <div class="px-1 text-sm rounded-sm text-secondary-foreground bg-secondary">{{ ownerName }}</div>
    </div>
    <div>{{ projectsCount }} projects</div>
    <div class="flex:row-md flex:center-y">
      Members
      <div class="flex:row">
        <img
          v-for="(member, i) of members"
          :key="member.photo"
          :src="member.photo"
          class="w-8 h-8"
          :class="{ 'ml-[-1rem]': i !== 0 }"
        />
        <div
          v-if="membersCount"
          class="flex flex:center w-8 h-8 rounded-full bg-zinc-400 text-zinc-100 ml-[-1rem]"
        >
          {{ membersCount }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
