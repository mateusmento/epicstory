<script setup lang="ts">
import { UserAvatarStack } from "@/presentationals/user";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useMeeting } from "@/domain/meetings";
import { useWorkspace } from "@/domain/workspace";
import { compact, uniqBy } from "lodash";
import { computed } from "vue";
import {
  IconCameraOff,
  IconCameraOn,
  IconMicrophoneOff,
  IconMicrophoneOn,
} from "@/design-system/icons/meeting";
import { useRouter } from "vue-router";
import { HeadphonesIcon } from "lucide-vue-next";

const router = useRouter();

const { user } = useAuth();
const { workspace } = useWorkspace();

const {
  currentMeeting,
  incomingMeeting,
  attendees,
  isCameraOn,
  isMicrophoneOn,
  leaveMeeting,
  stopCamera,
  stopMicrophone,
  acceptIncomingMeeting,
  rejectIncomingMeeting,
} = useMeeting();

const candidates = computed(() => {
  const me = user.value;
  const attendeeUsers = (attendees.value ?? []).map((a) => a.user);
  return compact([me, ...attendeeUsers]);
});

const people = computed(() => uniqBy(candidates.value, "id"));

function openMeeting() {
  const meeting = currentMeeting.value;
  const channelId = meeting?.channelId;
  if (!channelId) return;
  router.push({
    name: "channel",
    params: { workspaceId: workspace.value.id, channelId },
  });
}

async function joinIncomingMeeting() {
  await acceptIncomingMeeting();
  openMeeting();
}
</script>

<template>
  <div v-if="currentMeeting || incomingMeeting" class="flex:col-xl mx-auto p-2 rounded-xl border bg-card">
    <div class="self-stretch bg-secondary py-4 rounded-lg">
      <UserAvatarStack
        v-if="people.length"
        :users="people"
        size="3xl"
        :overlapPx="12"
        variant="meetingNavbar"
        :min="1"
        center
        class="min-w-0 w-full max-w-full"
      />
    </div>

    <div class="flex:row-md flex:center">
      <template v-if="currentMeeting && !incomingMeeting">
        <Button variant="outline" size="icon" class="p-2.5 rounded-full" @click="stopCamera">
          <IconCameraOn v-if="isCameraOn" class="w-6 h-6 text-muted-foreground" />
          <IconCameraOff v-else class="w-6 h-6 text-muted-foreground" />
        </Button>

        <Button variant="outline" size="icon" class="p-2.5 rounded-full" @click="stopMicrophone">
          <IconMicrophoneOn v-if="isMicrophoneOn" class="w-6 h-6 text-muted-foreground" />
          <IconMicrophoneOff v-else class="w-6 h-6 text-muted-foreground" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          class="p-2.5 rounded-full"
          title="Open meeting"
          aria-label="Open meeting"
          @click="openMeeting"
        >
          <Icon name="hi-external-link" class="w-6 h-6 text-muted-foreground" :stroke-width="1.5" />
        </Button>

        <Button
          variant="flat"
          intent="destructive"
          size="icon"
          class="p-2.5 rounded-full"
          @click="leaveMeeting"
        >
          <Icon name="bi-telephone-x" class="w-6 h-6" />
        </Button>
      </template>

      <template v-else-if="incomingMeeting">
        <Button variant="outline" size="icon" class="p-2.5 rounded-full" @click="stopCamera">
          <IconCameraOn v-if="isCameraOn" class="w-6 h-6 text-muted-foreground" />
          <IconCameraOff v-else class="w-6 h-6 text-muted-foreground" />
        </Button>

        <Button variant="outline" size="icon" class="p-2.5 rounded-full" @click="stopMicrophone">
          <IconMicrophoneOn v-if="isMicrophoneOn" class="w-6 h-6 text-muted-foreground" />
          <IconMicrophoneOff v-else class="w-6 h-6 text-muted-foreground" />
        </Button>

        <Button
          variant="flat"
          intent="destructive"
          size="icon"
          class="p-2.5 rounded-full"
          @click="rejectIncomingMeeting"
        >
          <Icon name="bi-telephone-x" class="w-6 h-6" />
        </Button>

        <Button variant="flat" size="icon" class="p-2.5 rounded-full" @click="joinIncomingMeeting">
          <HeadphonesIcon class="w-6 h-6" />
        </Button>
      </template>
    </div>
  </div>
</template>
