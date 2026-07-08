<script lang="ts" setup>
import { UserAvatar } from "@/presentationals/user";
import { Button } from "@/design-system";
import IconReplies from "@/design-system/icons/IconReplies.vue";
import type { IChannelActivity, IUser } from "@epicstory/contracts";
import { HeadphonesIcon } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  activity: IChannelActivity;
  channelDisplayName: string;
  meId: number;
  canJoinMeeting?: boolean;
  meetingAttendees?: IUser[];
}>();

const emit = defineEmits<{
  (e: "join-meeting", meetingId: number): void;
  (e: "open-thread"): void;
}>();

const hasMeetingThread = computed(
  () => props.activity.type === "meeting_started" && props.activity.messageId != null,
);

const avatarUser = computed(() => {
  const a = props.activity;
  if (a.type === "user_added" || a.type === "user_removed") {
    return a.subjectUser ?? null;
  }
  return a.actor;
});

const titleLine = computed(() => {
  const a = props.activity;
  if (a.type === "user_added" || a.type === "user_removed") {
    return a.subjectUser?.name ?? "Someone";
  }
  if (a.type === "meeting_started") {
    return "Meeting started";
  }
  return a.actor?.name ?? "Someone";
});

const summaryLines = computed(() => {
  const a = props.activity;
  const ch = props.channelDisplayName || "this channel";

  switch (a.type) {
    case "channel_renamed": {
      const prev = a.payload?.previousName;
      const next = a.payload?.newName;
      if (prev != null && next != null) {
        return [`Renamed channel ${prev} to ${next}`];
      }
      return ["Renamed the channel"];
    }
    case "user_added": {
      const by = a.actor?.name ?? "Someone";
      if (a.subjectUser?.id === a.actor?.id) {
        return [`Joined ${ch}`];
      }
      return [`Added to ${ch} by ${by}`];
    }
    case "user_removed": {
      const by = a.actor?.name ?? "Someone";
      return [`Removed from ${ch} by ${by}`];
    }
    case "meeting_started": {
      const starter = a.actor?.id === props.meId ? "You" : a.actor?.name ? `${a.actor.name}` : "Someone";
      return [`${starter} started a meeting`];
    }
    default:
      return [a.type.replace(/_/g, " ")];
  }
});

const showHeadphoneIcon = computed(() => props.activity.type === "meeting_started");

const rowClass = computed(() =>
  props.canJoinMeeting ? "rounded-lg border border-green-600/30 bg-green-600/10 px-3 py-2" : "py-1",
);
</script>

<template>
  <div :class="rowClass" class="flex gap-2 text-sm my-1">
    <div class="mt-0.5 flex size-8 shrink-0 items-center justify-center">
      <UserAvatar
        v-if="!showHeadphoneIcon && avatarUser"
        :name="avatarUser.name"
        :picture="avatarUser.picture"
        size="base"
      />
      <div v-else class="flex size-8 items-center justify-center rounded-full bg-muted" aria-hidden="true">
        <HeadphonesIcon class="size-4 text-muted-foreground" stroke-width="2" />
      </div>
    </div>
    <div class="min-w-0 flex-1">
      <div class="font-medium text-foreground">{{ titleLine }}</div>
      <div v-for="(line, i) of summaryLines" :key="i" class="text-muted-foreground">
        {{ line }}
      </div>
      <div v-if="canJoinMeeting && activity.meetingId" class="mt-2">
        <Button size="sm" variant="outline" class="gap-2" @click="emit('join-meeting', activity.meetingId)">
          <span class="flex -space-x-1.5">
            <UserAvatar
              v-for="attendee of meetingAttendees?.slice(0, 4)"
              :key="attendee.id"
              :name="attendee.name"
              :picture="attendee.picture"
              size="base"
              class="ring-2 ring-background"
            />
          </span>
          Join meeting
        </Button>
      </div>
      <div v-if="hasMeetingThread" class="mt-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-auto gap-1.5 px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          @click="emit('open-thread')"
        >
          <IconReplies class="size-3.5" />
          Open thread
        </Button>
      </div>
    </div>
  </div>
</template>
