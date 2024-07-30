<script lang="ts" setup>
import { useAuthStore } from "@/domain/auth/user.store";
import { storeToRefs } from "pinia";

const { user } = storeToRefs(useAuthStore());
</script>

<template>
  <div class="flex:cols-xl p-4 rounded-md bg-zinc-200/60">
    <div class="w-10 h-10 rounded-full bg-zinc-300">
      <img :src="user?.picture" />
    </div>
    <div class="text-lg">{{ user?.name }}</div>
  </div>
</template>
