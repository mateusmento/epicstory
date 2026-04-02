<script setup lang="ts">
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useMeeting } from "@/domain/channels";
import { useWorkspace } from "@/domain/workspace";
import { compact, take, uniqBy } from "lodash";
import { computed } from "vue";
import { IconCameraOff, IconCameraOn, IconMicrophoneOff, IconMicrophoneOn } from "../icons";
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

const people = computed(() => {
  const me = user.value;
  const attendeeUsers = (attendees.value ?? []).map((a) => a.user);
  const candidates = compact([me, ...attendeeUsers]);
  return take(uniqBy(candidates, "id"), 4);
});

function openMeeting() {
  if (!currentMeeting.value) return;
  router.push({
    name: "meeting-session",
    params: { workspaceId: workspace.value.id, meetingId: currentMeeting.value?.id },
  });
}

async function joinIncomingMeeting() {
  await acceptIncomingMeeting();
  openMeeting();
}
</script>

<template>
  <div v-if="currentMeeting || incomingMeeting" class="flex:col-xl mx-auto p-2 rounded-xl border bg-white">
    <div class="self-stretch bg-secondary p-2 py-4 rounded-lg">
      <div class="flow-root">
        <div class="flex flex:center flex-wrap gap-2 place-content-center content-center">
          <template v-for="(p, i) in people.flat()" :key="i">
            <img v-if="p.picture" :src="p.picture" class="rounded-full w-14 h-14" :title="p.name" />
            <div
              v-else
              class="flex flex:center w-14 h-14 rounded-full text-lg font-semibold font-dmSans text-gray-700 bg-gray-300"
              :title="p.name"
            >
              {{ p.name?.slice(0, 2)?.toUpperCase() || "?" }}
            </div>
          </template>
        </div>
      </div>
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

        <Button variant="destructive" size="icon" class="p-2.5 rounded-full" @click="leaveMeeting">
          <Icon name="bi-telephone-x" class="w-6 h-6" />
        </Button>
      </template>

      <template v-else-if="incomingMeeting">
        <Button variant="destructive" size="icon" class="p-2.5 rounded-full" @click="rejectIncomingMeeting">
          <Icon name="bi-telephone-x" class="w-6 h-6" />
        </Button>

        <Button variant="default" size="icon" class="p-2.5 rounded-full" @click="joinIncomingMeeting">
          <HeadphonesIcon class="w-6 h-6" />
        </Button>
      </template>
    </div>
  </div>
</template>
