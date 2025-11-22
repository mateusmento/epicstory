<script lang="ts" setup>
import { ExitIcon } from "@radix-icons/vue";
import { IconCameraOff, IconCameraOn, IconHangupCall, IconMicrophoneOff, IconMicrophoneOn } from "../icons";

defineProps<{
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
}>();

const emit = defineEmits(["toggle-camera", "toggle-microphone", "leave-meeting", "end-meeting"]);
</script>

<template>
  <div class="meeting-controls flex justify-center gap-5">
    <button
      class="flex flex:center w-10 h-10 border-none rounded-full bg-slate-400 bg-opacity-20 backdrop-blur-sm text-white"
      @click="emit('toggle-camera')"
    >
      <IconCameraOn v-if="isCameraOn" />
      <IconCameraOff v-else />
    </button>
    <button
      class="flex flex:center w-10 h-10 border-none rounded-full bg-slate-400 bg-opacity-20 backdrop-blur-sm text-white"
      @click="emit('toggle-microphone')"
    >
      <IconMicrophoneOn v-if="isMicrophoneOn" />
      <IconMicrophoneOff v-else />
    </button>
    <button
      class="flex flex:center w-10 h-10 border-none rounded-full bg-slate-400 bg-opacity-20 backdrop-blur-sm text-white"
      @click="emit('leave-meeting')"
    >
      <!-- <IconRefuseCall /> -->
      <ExitIcon class="w-5 h-5" />
    </button>
    <button
      class="flex flex:center w-10 h-10 border-none rounded-full bg-red-500 text-white"
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
