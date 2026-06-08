<script lang="tsx" setup>
import { UserAvatar } from "@/presentationals/user";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { IssueNotificationLabel } from "@/presentationals/issue";
import type { IssueAssignedNotificationPayload } from "@/domain/notifications";
import { formatDistanceToNow } from "date-fns";
import { SquareUser } from "lucide-vue-next";

const props = defineProps<{
  payload: IssueAssignedNotificationPayload;
  createdAt: string;
}>();

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
</script>

<template>
  <div class="flex:row-2xl flex:center-y">
    <UserAvatar
      :name="payload.issuer.name"
      :picture="payload.issuer.picture"
      size="lg"
      class="flex-shrink-0"
    />

    <div class="flex:col flex-1 min-w-0">
      <div class="flex:row-md items-baseline">
        <div class="text-sm text-secondary-foreground font-dmSans flex-1">
          <SquareUser class="w-4 h-4 inline-block" />
          <span class="flex-1">
            assigned issue to you
            <!-- <div class="text-foreground font-lato">{{ payload.issuer.name }}</div> -->
          </span>
        </div>

        <span class="ml-auto text-xs text-secondary-foreground font-dmSans whitespace-nowrap">
          {{ formatTime(createdAt) }}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <IssueNotificationLabel
            :issue-key="payload.issueKey"
            :issue-id="payload.issueId"
            :title="payload.title"
          />
        </TooltipTrigger>
        <TooltipContent>
          <IssueNotificationLabel
            :issue-key="payload.issueKey"
            :issue-id="payload.issueId"
            :title="payload.title"
          />
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
