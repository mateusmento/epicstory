<script lang="ts" setup>
import { ExitIcon } from "@radix-icons/vue";
import { Monitor } from "lucide-vue-next";
import { IconCameraOff, IconCameraOn, IconHangupCall, IconMicrophoneOff, IconMicrophoneOn } from "../icons";
import MeetingDeviceMenu from "./MeetingDeviceMenu.vue";

withDefaults(
  defineProps<{
    isCameraOn: boolean;
    isMicrophoneOn: boolean;
    isScreenSharing?: boolean;
    showEnd?: boolean;
    /** Show ⋮ menu for camera / mic / speaker (in-call). */
    showDeviceMenu?: boolean;
  }>(),
  { showDeviceMenu: true, isScreenSharing: false },
);

const emit = defineEmits([
  "toggle-camera",
  "toggle-microphone",
  "toggle-screen-share",
  "leave-meeting",
  "end-meeting",
  "apply-input-devices",
]);

const controlBtnClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-slate-400/20 text-white backdrop-blur-sm outline-none ring-offset-background transition hover:bg-slate-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
</script>

<template>
  <div class="meeting-controls flex justify-center gap-5">
    <button type="button" :class="controlBtnClass" @click="emit('toggle-camera')">
      <IconCameraOn v-if="isCameraOn" />
      <IconCameraOff v-else />
    </button>
    <button type="button" :class="controlBtnClass" @click="emit('toggle-microphone')">
      <IconMicrophoneOn v-if="isMicrophoneOn" />
      <IconMicrophoneOff v-else />
    </button>
    <button
      type="button"
      :class="[
        controlBtnClass,
        isScreenSharing ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-transparent' : '',
      ]"
      title="Share screen"
      @click="emit('toggle-screen-share')"
    >
      <Monitor class="h-5 w-5" />
    </button>
    <MeetingDeviceMenu
      v-if="showDeviceMenu"
      trigger-variant="control-circle"
      content-side="top"
      content-align="center"
      @input-devices-change="emit('apply-input-devices')"
    />
    <button type="button" :class="controlBtnClass" @click="emit('leave-meeting')">
      <!-- <IconRefuseCall /> -->
      <ExitIcon class="w-5 h-5" />
    </button>
    <button
      v-if="showEnd ?? true"
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-red-500 text-white outline-none ring-offset-background transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      @click="emit('end-meeting')"
    >
      <IconHangupCall />
    </button>
  </div>
</template>

<style scoped>
.meeting-controls {
  padding: 10px;
  border-radius: calc(1.5rem - 10px);
  height: fit-content;
  background: #dddddd44;
  backdrop-filter: blur(3px);
}
</style>
