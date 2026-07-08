<script setup lang="ts">
import { Button, Separator } from "@/design-system";
import { useNavTrigger } from "@/design-system/ui/nav-view/nav-view";
import { useMeeting, useMeetingLayout, useMeetingMediaDevicesStore } from "@/domain/meetings";
import type { MeetingGridLayoutView, MeetingSpeakerLayoutView } from "@/lib/meetings";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";
import { MeetingControls, MeetingGrid, MeetingSpeakerView } from "@/presentationals/meeting";
import MeetingDeviceMenu from "./MeetingDeviceMenu.vue";

const {
  isCameraOn,
  isMicrophoneOn,
  isScreenSharing,
  leaveMeeting,
  endMeeting,
  stopCamera,
  stopMicrophone,
  startScreenShare,
  stopScreenShare,
  currentMeetingChannelType,
  currentMeeting,
  pinnedSpeakerId,
  togglePinSpeaker,
  layoutMode,
  setLayoutMode,
  gridPage,
  speakingIds,
  applySelectedInputDevices,
} = useMeeting();

const { content: detailsPaneContent, viewContent } = useNavTrigger("details-pane");
const chatOpen = ref(false);

watch(detailsPaneContent, (v) => {
  if (v !== "meeting-chat") chatOpen.value = false;
});

watch(currentMeeting, (meeting) => {
  if (!meeting) chatOpen.value = false;
});

function toggleChat() {
  chatOpen.value = !chatOpen.value;
  viewContent("meeting-chat", { meeting: currentMeeting.value });
}

function toggleScreenShare() {
  if (isScreenSharing.value) stopScreenShare();
  else startScreenShare();
}

const { participants, featured, topDockPeers, rightDockPeers } = useMeetingLayout();

const mediaDevices = useMeetingMediaDevicesStore();
const { selectedSpeakerId } = storeToRefs(mediaDevices);

const canEndMeeting = computed(() => currentMeetingChannelType.value !== "meeting");

const gridLayout = computed<MeetingGridLayoutView>(() => ({
  participants: participants.value,
  speakingIds: speakingIds.value,
  pinnedId: pinnedSpeakerId.value,
  audioOutputDeviceId: selectedSpeakerId.value,
}));

const speakerLayout = computed<MeetingSpeakerLayoutView>(() => ({
  featured: featured.value,
  topDockPeers: topDockPeers.value,
  rightDockPeers: rightDockPeers.value,
  speakingIds: speakingIds.value,
  pinnedId: pinnedSpeakerId.value,
  audioOutputDeviceId: selectedSpeakerId.value,
}));

async function onMeetingInputDevicesChange() {
  await applySelectedInputDevices();
}

onMounted(() => {
  mediaDevices.refreshDevices();
});
</script>

<template>
  <section class="relative h-full w-full min-h-0 flex flex-col">
    <!-- Mode switch -->
    <div class="sticky top-0 z-20 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-2 h-10">
      <Button
        type="button"
        size="icon"
        class="px-2 text-xs"
        :variant="layoutMode === 'speaker' ? 'outline' : 'ghost'"
        @click="setLayoutMode('speaker')"
      >
        Speaker
      </Button>
      <Button
        type="button"
        size="icon"
        class="px-2 text-xs"
        :variant="layoutMode === 'grid' ? 'outline' : 'ghost'"
        @click="setLayoutMode('grid')"
      >
        Grid
      </Button>

      <div class="flex-1" />

      <div v-if="layoutMode === 'speaker'" class="text-xs text-muted-foreground select-none">
        Tip: click a tile to pin/unpin
      </div>
      <div v-else class="text-xs text-muted-foreground select-none">
        Tip: click a tile to pin (switches to Speaker)
      </div>
    </div>
    <Separator />

    <div class="relative flex-1 min-h-0 p-3 bg-black">
      <MeetingSpeakerView
        v-if="layoutMode === 'speaker'"
        class="h-full"
        :layout="speakerLayout"
        @toggle-pin="togglePinSpeaker"
      />

      <MeetingGrid
        v-else
        v-model:page="gridPage"
        class="h-full"
        :layout="gridLayout"
        @toggle-pin="togglePinSpeaker"
      />
    </div>

    <!-- Meeting controls -->
    <div class="absolute left-1/2 -translate-x-1/2 bottom-6 z-30">
      <MeetingControls
        :isCameraOn="isCameraOn"
        :isMicrophoneOn="isMicrophoneOn"
        :isScreenSharing="isScreenSharing"
        :showEnd="canEndMeeting"
        :chatOpen="chatOpen"
        @toggle-camera="stopCamera"
        @toggle-microphone="stopMicrophone"
        @toggle-screen-share="toggleScreenShare"
        @toggle-chat="toggleChat"
        @apply-input-devices="onMeetingInputDevicesChange"
        @leave-meeting="leaveMeeting"
        @end-meeting="endMeeting"
      >
        <template #device-menu>
          <MeetingDeviceMenu
            trigger-variant="control-circle"
            content-side="top"
            content-align="center"
            @input-devices-change="onMeetingInputDevicesChange"
          />
        </template>
      </MeetingControls>
    </div>
  </section>
</template>
