<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";

const { user } = useAuth();
</script>

<template>
  <div class="flex:row-sm flex:center-y p-xl rounded-md cursor-pointer hover:bg-secondary">
    <UserAvatar
      :name="user?.name ?? ''"
      :picture="user?.picture"
      size="lg"
      class="mr-lg flex-shrink-0"
    />

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
