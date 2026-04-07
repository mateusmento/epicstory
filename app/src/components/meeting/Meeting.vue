<script lang="tsx" setup>
import { useAuth } from "@/domain/auth";
import { useMeeting } from "@/domain/channels";
import type { User } from "@/domain/user";
import { computed } from "vue";
import MeetingControls from "./MeetingControls.vue";
import { Pin } from "lucide-vue-next";

const { user } = useAuth();

const {
  mycamera,
  attendees,
  isCameraOn,
  isMicrophoneOn,
  leaveMeeting,
  endMeeting,
  stopCamera,
  stopMicrophone,
  currentMeetingChannelType,
  speakingIds,
  activeSpeakerId,
  pinnedSpeakerId,
  togglePinSpeaker,
} = useMeeting();

const canEndMeeting = computed(() => currentMeetingChannelType.value !== "meeting");

type Participant = {
  id: string; // remoteId or "local"
  stream: MediaStream | null;
  user: User | null;
  isLocal: boolean;
  isCameraOn: boolean;
};

const participants = computed<Participant[]>(() => {
  const list: Participant[] = [];
  list.push({
    id: "local",
    stream: mycamera.value ?? null,
    user: user.value ?? null,
    isLocal: true,
    isCameraOn: !!mycamera.value && !!isCameraOn.value,
  });

  for (const a of attendees.value) {
    list.push({
      id: a.remoteId,
      stream: a.camera,
      user: a.user ?? null,
      isLocal: false,
      isCameraOn: !!a.isCameraOn,
    });
  }
  return list;
});

function findParticipant(id: string | null | undefined) {
  if (!id) return null;
  return participants.value.find((p) => p.id === id) ?? null;
}

const featured = computed<Participant>(() => {
  return (
    findParticipant(pinnedSpeakerId.value) ??
    findParticipant(activeSpeakerId.value) ??
    participants.value[0] // local as stable fallback
  );
});

const thumbnails = computed(() => participants.value.filter((p) => p.id !== featured.value.id));

function isSpeaking(id: string) {
  return speakingIds.value?.has?.(id) ?? false;
}
</script>

<script lang="tsx">
function AttendeeBlankPicture({ user }: { user: User }) {
  return (
    <>
      <div class="rounded-3xl w-full h-full object-cover flex items-center justify-center bg-gray-800">
        {user?.picture ? (
          <img src={user.picture} alt={user.name} class="w-32 h-32 rounded-full object-cover" />
        ) : (
          <div class="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      <div class="absolute bottom-28 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white">
        {user.name}
      </div>
    </>
  );
}
</script>

<template>
  <section class="meeting flex:col min-h-0">
    <div class="meeting-conference">
      <div class="w-full h-full relative">
        <div
          class="w-full h-full rounded-3xl overflow-hidden relative cursor-pointer select-none"
          :class="[
            isSpeaking(featured.id) ? 'ring-4 ring-emerald-400/80' : 'ring-0',
            pinnedSpeakerId === featured.id ? 'outline outline-2 outline-amber-300/70' : '',
          ]"
          @click="togglePinSpeaker(featured.id)"
          :title="pinnedSpeakerId === featured.id ? 'Unpin' : 'Pin (disable auto-switch)'"
        >
          <video
            v-if="featured.stream && featured.isCameraOn"
            class="w-full h-full object-cover"
            autoplay
            :muted="featured.isLocal"
            playsinline
            :ref="(el) => el && ((el as HTMLVideoElement).srcObject = featured.stream)"
          />
          <AttendeeBlankPicture v-else :user="(featured.user ?? user)!" />

          <div
            v-if="featured.user?.name"
            class="absolute bottom-28 left-1/2 -translate-x-1/2 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white"
          >
            {{ featured.user.name }}
          </div>

          <div
            v-if="pinnedSpeakerId === featured.id"
            class="absolute top-4 left-4 backdrop-blur-sm bg-[#dddddd44] px-2 py-1 rounded-lg text-white flex items-center gap-2"
          >
            <Pin class="w-4 h-4" />
            <div class="text-xs">Pinned</div>
          </div>
        </div>

        <MeetingControls
          :isCameraOn="isCameraOn"
          :isMicrophoneOn="isMicrophoneOn"
          :showEnd="canEndMeeting"
          @toggle-camera="stopCamera"
          @toggle-microphone="stopMicrophone"
          @leave-meeting="leaveMeeting"
          @end-meeting="endMeeting"
        />
      </div>

      <div v-if="thumbnails.length" class="thumbnails">
        <div
          v-for="p in thumbnails"
          :key="p.id"
          class="thumb cursor-pointer select-none"
          :class="[
            isSpeaking(p.id) ? 'ring-2 ring-emerald-400/80' : 'ring-0',
            pinnedSpeakerId === p.id ? 'outline outline-2 outline-amber-300/70' : '',
          ]"
          @click="togglePinSpeaker(p.id)"
          :title="pinnedSpeakerId === p.id ? 'Unpin' : 'Pin (disable auto-switch)'"
        >
          <video
            v-if="p.stream && p.isCameraOn"
            class="w-full h-full object-cover"
            autoplay
            :muted="p.isLocal"
            playsinline
            :ref="(el) => el && ((el as HTMLVideoElement).srcObject = p.stream)"
          />
          <div v-else class="w-full h-full object-cover flex items-center justify-center bg-gray-800">
            <img
              v-if="p.user?.picture"
              :src="p.user.picture"
              :alt="p.user.name"
              class="w-12 h-12 rounded-full object-cover"
            />
            <div
              v-else
              class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-semibold"
            >
              {{ p.user?.name?.charAt(0)?.toUpperCase() || "?" }}
            </div>
          </div>

          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded">
            {{ p.user?.name ?? (p.isLocal ? "You" : "Unknown") }}
          </div>
        </div>
      </div>
    </div>
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

.thumbnails {
  position: absolute;
  top: 40px;
  right: 40px;
  display: flex;
  gap: 10px;
  flex-direction: column;
}

.meeting-controls {
  position: absolute;
  width: fit-content;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
}

.thumb {
  position: relative;
  width: 240px;
  height: 160px;
  border-radius: 24px;
  overflow: hidden;
  border: 2px solid #dddddd44;
}
</style>
