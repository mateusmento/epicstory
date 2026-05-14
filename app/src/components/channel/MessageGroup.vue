<script lang="ts" setup>
import { UserAvatar } from "@/components/user";
import type { IUser as IUser } from "@epicstory/contracts";
import { formatDate, isToday } from "date-fns";

const props = defineProps<{
  sender: IUser;
  meId: number;
  sentAt: Date | string;
}>();

function formatMessageDate(date: Date | string) {
  if (date === undefined || date === null) return;
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return isToday(d) ? formatDate(d, "H:mm a") : formatDate(d, "MMM d");
}
</script>

<template>
  <div class="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
    <UserAvatar :name="sender.name" :picture="sender.picture" size="2xl" class="flex-shrink-0" />
    <div class="flex:col min-w-0">
      <div class="flex:row-lg items-baseline ml-5">
        <div class="font-dmSans font-medium text-lg" :class="{ 'order-0': sender.id === meId }">
          {{ sender?.name }}
        </div>
        <div class="text-sm text-secondary-foreground/70 font-dmSans">
          {{ formatMessageDate(sentAt) }}
        </div>
      </div>
      <div class="flex:col ml-2">
        <slot />
      </div>
    </div>
  </div>
</template>
