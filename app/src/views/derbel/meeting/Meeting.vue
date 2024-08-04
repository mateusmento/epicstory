<script lang="ts" setup>
import { useWebSockets } from "@/core/websockets";
import { onMounted, ref } from "vue";
import MeetingControls from "./MeetingControls.vue";
import { Meeting } from "./meeting";

const props = defineProps<{
  meetingId: number;
}>();

const emit = defineEmits(["meeting-ended", "left-meeting"]);

const sockets = useWebSockets();

const mycamera = ref<MediaStream | null>(null);
const attendees = ref<any[]>([]);
const meeting = ref<Meeting | null>(null);

const isCameraOn = ref(true);
const isMicrophoneOn = ref(true);

onMounted(async () => {
  if (meeting.value) return;
  const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  mycamera.value = camera;
  meeting.value = await Meeting.join(sockets.websocket, props.meetingId, camera, {
    attendeeJoined: (remoteId, camera) => attendees.value.push({ remoteId, camera }),
    attendeeLeft: (remoteId) => (attendees.value = attendees.value.filter((a) => a.remoteId !== remoteId)),
    ended: () => {
      removeCameras();
      emit("meeting-ended");
    },
  });
});

async function leaveMeeting() {
  removeCameras();
  meeting.value?.leave();
  emit("left-meeting");
}

function endMeeting() {
  removeCameras();
  meeting.value?.end();
  emit("meeting-ended");
}

function removeCameras() {
  mycamera.value?.getTracks().forEach((track) => track.stop());
  mycamera.value = null;
  attendees.value = [];
}

function stopCamera() {
  if (!mycamera.value) return;
  if (isCameraOn.value) {
    mycamera.value.getVideoTracks()[0].stop();
    isCameraOn.value = false;
  } else {
    navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  }
}

function stopMicrophone() {
  if (!mycamera.value) return;
  mycamera.value.getAudioTracks()[0].stop();
  isMicrophoneOn.value = false;
}
</script>

<template>
  <section class="meeting">
    <template v-if="attendees.length === 0">
      <div class="meeting-conference">
        <video
          v-if="mycamera"
          class="attendee-camera rounded-3xl"
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
        <video
          v-for="attendee in attendees"
          :key="attendee.remoteId"
          class="attendee-camera rounded-3xl"
          autoplay
          :ref="(el) => el && ((el as HTMLVideoElement).srcObject = attendee.camera)"
        />
        <MeetingControls
          :isCameraOn="isCameraOn"
          :isMicrophoneOn="isMicrophoneOn"
          @toggle-camera="stopCamera"
          @toggle-microphone="stopMicrophone"
          @leave-meeting="leaveMeeting"
          @end-meeting="endMeeting"
        />

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
      <div class="relative h-full" style="height: calc(100% - 180px)">
        <video
          v-if="mycamera"
          class="rounded-3xl h-full"
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
      <div class="flex gap-5">
        <video
          v-for="attendee in attendees"
          :key="attendee.remoteId"
          class="w-60 rounded-3xl"
          autoplay
          :ref="(el) => el && ((el as HTMLVideoElement).srcObject = attendee.camera)"
        />
      </div>
    </template>
  </section>
</template>

<style scoped src="@/views/derbel/styles/main.css"></style>

<style scoped>
.meeting {
  display: flex;
  justify-content: center;
  height: 100%;
  padding: 10px;
}

.meeting-conference {
  position: relative;
  height: 100%;
  aspect-ratio: 4 / 3;
}

.attendee-camera {
  height: 100%;
}

.meeting-controls {
  position: absolute;
  width: calc(100% - 20px);
  bottom: 0;
}

.my-camera {
  position: absolute;
  top: 40px;
  right: 40px;
  border: 2px solid #dddddd44;
}
</style>
