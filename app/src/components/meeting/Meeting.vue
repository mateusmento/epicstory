<script lang="ts" setup>
import { useMeeting } from "@/domain/channels";
import MeetingControls from "./MeetingControls.vue";

const {
  mycamera,
  attendees,
  isCameraOn,
  isMicrophoneOn,
  leaveMeeting,
  endMeeting,
  stopCamera,
  stopMicrophone,
} = useMeeting();
</script>

<template>
  <section class="meeting flex:col min-h-0">
    <template v-if="attendees.length === 0">
      <div class="meeting-conference">
        <video
          v-if="mycamera"
          class="rounded-3xl w-full h-full object-cover"
          autoplay
          muted
          :ref="(el) => el && ((el as HTMLVideoElement).srcObject = mycamera)"
        />
        <MeetingControls
          :isCameraOn="isCameraOn"
          :isMicrophoneOn="isMicrophoneOn"
          @toggle-camera="stopCamera"
          @toggle-microphone="stopMicrophone"
          @leave-meeting="leaveMeeting"
          @end-meeting="endMeeting"
        />
      </div>
    </template>
    <template v-else-if="attendees.length === 1">
      <div class="meeting-conference">
        <div v-for="attendee in attendees" :key="attendee.remoteId" class="w-full h-full relative">
          <video
            class="rounded-3xl w-full h-full object-cover"
            autoplay
            :ref="(el) => el && ((el as HTMLVideoElement).srcObject = attendee.camera)"
          />
          <div
            class="absolute bottom-28 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white"
          >
            {{ attendee?.user.name }}
          </div>

          <MeetingControls
            :isCameraOn="isCameraOn"
            :isMicrophoneOn="isMicrophoneOn"
            @toggle-camera="stopCamera"
            @toggle-microphone="stopMicrophone"
            @leave-meeting="leaveMeeting"
            @end-meeting="endMeeting"
          />
        </div>

        <video
          v-if="mycamera"
          class="my-camera rounded-3xl w-60"
          autoplay
          muted
          :ref="(el) => el && ((el as HTMLVideoElement).srcObject = mycamera)"
        />
      </div>
    </template>
    <template v-else>
      <div class="flex:col flex-1 relative">
        <div class="flex:col-md flex-1">
          <div class="flex-1 relative">
            <video
              v-if="mycamera"
              class="rounded-3xl h-full m-auto object-cover"
              autoplay
              muted
              :ref="(el) => el && ((el as HTMLVideoElement).srcObject = mycamera)"
            />
            <MeetingControls
              :isCameraOn="isCameraOn"
              :isMicrophoneOn="isMicrophoneOn"
              @toggle-camera="stopCamera"
              @toggle-microphone="stopMicrophone"
              @leave-meeting="leaveMeeting"
              @end-meeting="endMeeting"
            />
          </div>

          <div class="flex flex:row-md flex:center-x">
            <div v-for="attendee in attendees" :key="attendee.remoteId" class="relative">
              <video
                class="w-64 rounded-3xl object-cover"
                autoplay
                :ref="(el) => el && ((el as HTMLVideoElement).srcObject = attendee.camera)"
              />
              <div
                class="absolute bottom-4 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white whitespace-nowrap"
              >
                {{ attendee?.user.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.meeting {
  height: 100%;
  padding: 10px;
}

.meeting-conference {
  position: relative;
  flex: 1;
  min-height: 0;
  aspect-ratio: 4 / 3;
}

.attendee-camera {
  height: 100%;
}

.meeting-controls {
  position: absolute;
  width: fit-content;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
}

.my-camera {
  position: absolute;
  top: 40px;
  right: 40px;
  border: 2px solid #dddddd44;
}
</style>
