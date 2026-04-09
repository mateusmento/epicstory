<script setup lang="ts">
import { Button, Separator } from "@/design-system";
import { useMeeting, useMeetingMediaDevicesStore } from "@/domain/channels";
import { useMeetingLayout } from "@/domain/channels/composables/meeting-layout";
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
import MeetingControls from "./MeetingControls.vue";
import MeetingGrid from "./MeetingGrid.vue";
import MeetingSpeakerView from "./MeetingSpeakerView.vue";

const {
  isCameraOn,
  isMicrophoneOn,
  leaveMeeting,
  endMeeting,
  stopCamera,
  stopMicrophone,
  currentMeetingChannelType,
  pinnedSpeakerId,
  togglePinSpeaker,
  layoutMode,
  setLayoutMode,
  gridPage,
  setGridPage,
  applySelectedInputDevices,
} = useMeeting();

const { participants, featured, topDockPeers, rightDockPeers, isSpeaking } = useMeetingLayout();

const mediaDevices = useMeetingMediaDevicesStore();
const { selectedSpeakerId } = storeToRefs(mediaDevices);

const canEndMeeting = computed(() => currentMeetingChannelType.value !== "meeting");

async function onMeetingInputDevicesChange() {
  await applySelectedInputDevices();
}

onMounted(() => {
  void mediaDevices.refreshDevices();
});
</script>

<template>
  <section class="relative h-full w-full min-h-0 flex flex-col">
    <!-- Mode switch -->
    <div class="sticky top-0 z-20 px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-2 min-h-10">
      <Button
        type="button"
        size="icon"
        class="px-2 text-xs"
        :variant="layoutMode === 'speaker' ? 'secondary' : 'ghost'"
        @click="setLayoutMode('speaker')"
      >
        Speaker
      </Button>
      <Button
        type="button"
        size="icon"
        class="px-2 text-xs"
        :variant="layoutMode === 'grid' ? 'secondary' : 'ghost'"
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
        :featured="featured"
        :topDockPeers="topDockPeers"
        :rightDockPeers="rightDockPeers"
        :isSpeaking="isSpeaking"
        :pinnedId="pinnedSpeakerId"
        :onTogglePin="togglePinSpeaker"
        :remote-audio-output-device-id="selectedSpeakerId"
      />

      <MeetingGrid
        v-else
        class="h-full"
        :participants="participants"
        :isSpeaking="isSpeaking"
        :pinnedId="pinnedSpeakerId"
        :onTogglePin="togglePinSpeaker"
        :page="gridPage"
        :onSetPage="setGridPage"
        :remote-audio-output-device-id="selectedSpeakerId"
      />
    </div>

    <!-- Meeting controls -->
    <div class="absolute left-1/2 -translate-x-1/2 bottom-6 z-30">
      <MeetingControls
        :isCameraOn="isCameraOn"
        :isMicrophoneOn="isMicrophoneOn"
        :showEnd="canEndMeeting"
        @toggle-camera="stopCamera"
        @toggle-microphone="stopMicrophone"
        @apply-input-devices="onMeetingInputDevicesChange"
        @leave-meeting="leaveMeeting"
        @end-meeting="endMeeting"
      />
    </div>
  </section>
</template>
