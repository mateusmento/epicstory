<script lang="ts" setup>
import { useWebSockets } from "@/core/websockets";
import { onMounted, ref } from "vue";
import MeetingControls from "./MeetingControls.vue";
import { Meeting } from "@/domain/channels/utils/meeting";
import { useDependency } from "@/core/dependency-injection";
import { MeetingApi } from "@/domain/channels/services/meeting.api";

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

const meetingApi = useDependency(MeetingApi);

onMounted(async () => {
  if (meeting.value) return;
  const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  mycamera.value = camera;
  meeting.value = await Meeting.join(sockets.websocket, props.meetingId, camera, {
    meetingApi,
    attendeeJoined: (remoteId, camera, user) => {
      attendees.value.push({ remoteId, camera, user });
    },
    attendeeLeft: (remoteId) => {
      attendees.value = attendees.value.filter((a) => a.remoteId !== remoteId);
    },
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
  meeting.value?.end();
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
  <section class="meeting flex:rows min-h-0">
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
      <div class="flex:rows flex-1 relative">
        <div class="flex:rows-md flex-1">
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

          <div class="flex flex:cols-md flex:center-x">
            <div v-for="attendee in attendees" :key="attendee.remoteId" class="relative">
              <video
                class="w-64 rounded-3xl object-cover"
                autoplay
                :ref="(el) => el && ((el as HTMLVideoElement).srcObject = attendee.camera)"
              />
              <div
                class="absolute bottom-4 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white"
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
