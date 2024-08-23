<script lang="ts" setup>
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuthStore } from "@/domain/auth/user.store";
import { storeToRefs } from "pinia";

const { user } = storeToRefs(useAuthStore());
</script>

<template>
  <div class="flex:cols-sm p-4 rounded-md bg-zinc-200/60">
    <div class="w-10 h-10 mr-lg rounded-full bg-zinc-300">
      <img :src="user?.picture" />
    </div>
    <!-- <div class="text-base">{{ user?.name }}</div> -->
    <!-- <div class="self:fill"></div> -->
    <Button variant="ghost" size="icon">
      <Icon name="io-notifications" />
    </Button>
    <Button variant="ghost" size="icon">
      <Icon name="md-settings-round" />
    </Button>
  </div>
</template>
