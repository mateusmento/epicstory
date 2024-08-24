<script lang="ts" setup>
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";

const { user } = useAuth();
</script>

<template>
  <div class="flex:cols-sm flex:center-y p-xl rounded-md cursor-pointer hover:bg-zinc-200/60">
    <img :src="user?.picture" class="w-10 h-10 mr-lg" />

    <div class="flex:rows-sm flex-1 min-w-0">
      <div class="text-base text-zinc-800 whitespace-nowrap text-ellipsis overflow-hidden">
        {{ user?.name }}
      </div>
      <div class="text-xs text-zinc-500 whitespace-nowrap text-ellipsis overflow-hidden">
        {{ user?.email }}
      </div>
    </div>

    <Icon name="bi-chevron-expand" />
  </div>
</template>
