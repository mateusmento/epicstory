<script lang="ts" setup>
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";

const { user } = useAuth();
</script>

<template>
  <div class="flex:row-sm flex:center-y p-xl rounded-md cursor-pointer hover:bg-secondary">
    <img :src="user?.picture" class="w-10 h-10 mr-lg rounded-full" />

    <div class="flex:col-sm flex-1 min-w-0">
      <div class="whitespace-nowrap text-ellipsis overflow-hidden">
        {{ user?.name }}
      </div>
      <div class="text-xs text-secondary-foreground whitespace-nowrap text-ellipsis overflow-hidden">
        {{ user?.email }}
      </div>
    </div>

    <Icon name="bi-chevron-expand" />
  </div>
</template>
